import httpx
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.auth import get_current_user, get_current_user_profile
from app.core.db import get_db
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership
from app.models.profile import Profile
from app.schemas.auth import (
    AuthMeResponse,
    CompleteAccountRequest,
    ProfileUpdateRequest,
    SignupOrganizationRequest,
    SignupOrganizationResponse,
)

router = APIRouter()


def _auth_me_response(profile: Profile) -> AuthMeResponse:
    return AuthMeResponse(
        user_id=str(profile.id),
        organization_id=str(profile.organization_id),
        role=profile.role,
        full_name=profile.full_name,
        job_title=profile.job_title,
    )


@router.get("/me", response_model=AuthMeResponse)
def get_me(current_user: Profile = Depends(get_current_user_profile)):
    return _auth_me_response(current_user)


@router.patch("/me", response_model=AuthMeResponse)
def update_me(
    payload: ProfileUpdateRequest,
    current_user: Profile = Depends(get_current_user_profile),
    db: Session = Depends(get_db),
):
    current_user.full_name = payload.full_name.strip()
    current_user.job_title = payload.job_title.strip()
    db.commit()
    db.refresh(current_user)
    return _auth_me_response(current_user)


@router.post("/complete-account", response_model=AuthMeResponse, status_code=status.HTTP_201_CREATED)
def complete_account(
    payload: CompleteAccountRequest,
    response: Response,
    token_payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Provision application records for a verified Supabase identity.

    OAuth providers create the Supabase Auth user first. This endpoint completes
    the application-side organization, profile, and membership without trusting
    user-editable auth metadata for authorization.
    """
    try:
        user_id = uuid.UUID(token_payload.get("sub", ""))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid user ID in token")

    existing_profile = db.query(Profile).filter(Profile.id == user_id).first()
    if existing_profile:
        membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == existing_profile.id,
            OrganizationMembership.organization_id == existing_profile.organization_id,
        ).first()
        if not membership:
            db.add(OrganizationMembership(
                user_id=existing_profile.id,
                organization_id=existing_profile.organization_id,
                role=existing_profile.role,
            ))
            db.commit()
        response.status_code = status.HTTP_200_OK
        return _auth_me_response(existing_profile)

    organization = Organization(name=payload.org_name)
    db.add(organization)
    db.flush()
    profile = Profile(
        id=user_id,
        organization_id=organization.id,
        role="org_admin",
        full_name=payload.full_name,
        job_title=payload.job_title,
    )
    db.add(profile)
    db.flush()
    db.add(OrganizationMembership(
        user_id=profile.id,
        organization_id=organization.id,
        role="org_admin",
    ))
    db.commit()
    db.refresh(profile)
    return _auth_me_response(profile)


@router.post("/signup-organization", response_model=SignupOrganizationResponse, status_code=201)
def signup_organization(payload: SignupOrganizationRequest, db: Session = Depends(get_db)):
    """
    Creates a new organization, signs up the admin user in Supabase Auth,
    and creates the corresponding profile in the local database atomically.
    """
    user_id = None
    is_placeholder_url = "YOUR_PROJECT_REF" in settings.SUPABASE_URL
    
    # 1. Attempt to register user in Supabase Auth if the URL is not a placeholder
    if not is_placeholder_url:
        try:
            url = f"{settings.SUPABASE_URL}/auth/v1/signup"
            headers = {
                "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
                "Content-Type": "application/json"
            }
            json_payload = {
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "data": {
                        "full_name": payload.full_name,
                        "job_title": payload.job_title,
                    }
                }
            }
            with httpx.Client() as client:
                res = client.post(url, headers=headers, json=json_payload, timeout=10.0)
                
            if res.status_code != 200:
                # Check if the user is already registered in Supabase Auth but missing in local DB
                is_already_registered = False
                try:
                    res_json = res.json()
                    error_msg = res_json.get("msg", "") or res_json.get("error_description", "") or ""
                    if "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
                        is_already_registered = True
                except Exception:
                    pass
                # NOTE: Supabase can return 400 for multiple error cases; rely on the message check above instead of treating all 400s as "already registered".

                if is_already_registered:
                    from sqlalchemy import text
                    existing_user_id = db.execute(
                        text("SELECT id FROM auth.users WHERE email = :email"),
                        {"email": payload.email}
                    ).scalar()
                    if existing_user_id:
                        profile_exists = db.query(Profile).filter(Profile.id == existing_user_id).first()
                        if not profile_exists:
                            user_id = str(existing_user_id)
                        else:
                            raise HTTPException(
                                status_code=400,
                                detail="User already registered and profile exists"
                            )
                    else:
                        raise HTTPException(
                            status_code=res.status_code,
                            detail=f"Supabase Auth error: {res.text}"
                        )
                else:
                    raise HTTPException(
                        status_code=res.status_code,
                        detail=f"Supabase Auth error: {res.text}"
                    )
            else:
                res_data = res.json()
                user_info = res_data.get("user")
                if user_info and "id" in user_info:
                    user_id = user_info["id"]
                elif "id" in res_data:
                    user_id = res_data["id"]
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Failed to communicate with Supabase Auth: {str(e)}"
            )
            
    if not user_id:
        # Fallback for local development / testing when offline
        user_id = str(uuid.uuid4())
        
    # 2. Database transaction for Organization and Profile
    org = Organization(name=payload.org_name)
    db.add(org)
    try:
        db.flush()  # populate org.id
        profile = Profile(
            id=uuid.UUID(user_id),
            organization_id=org.id,
            role="org_admin",
            full_name=payload.full_name,
            job_title=payload.job_title,
        )
        db.add(profile)
        db.flush()
        db.add(OrganizationMembership(
            user_id=profile.id,
            organization_id=org.id,
            role="org_admin",
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database transaction failed: {str(e)}"
        )
        
    return SignupOrganizationResponse(
        organization_id=str(org.id),
        user_id=user_id,
        email=payload.email
    )
