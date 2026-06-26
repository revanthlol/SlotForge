import uuid
import httpx
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.auth import get_current_user_profile
from app.core.db import get_db
from app.models.organization import Organization
from app.models.profile import Profile
from app.schemas.auth import AuthMeResponse, SignupOrganizationRequest, SignupOrganizationResponse

router = APIRouter()


@router.get("/me", response_model=AuthMeResponse)
def get_me(current_user: Profile = Depends(get_current_user_profile)):
    return AuthMeResponse(
        user_id=str(current_user.id),
        organization_id=str(current_user.organization_id),
        role=current_user.role,
        full_name=current_user.full_name,
    )

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
                        "full_name": payload.full_name
                    }
                }
            }
            with httpx.Client() as client:
                res = client.post(url, headers=headers, json=json_payload, timeout=10.0)
                
            if res.status_code != 200:
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"Supabase Auth error: {res.text}"
                )
                
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
            full_name=payload.full_name
        )
        db.add(profile)
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
