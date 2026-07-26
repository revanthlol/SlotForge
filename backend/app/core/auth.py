import jwt
import uuid
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models.profile import Profile
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership

# PyJWKClient dynamically fetches keys from Supabase's JWKS endpoint.
# It handles caching internally.
jwk_client = None
if settings.SUPABASE_JWKS_URL:
    try:
        jwk_client = jwt.PyJWKClient(settings.SUPABASE_JWKS_URL)
    except Exception:
        pass

def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Decodes and verifies the Supabase JWT dynamically using the JWKS endpoint.
    Only asymmetric ES256/RS256 algorithms are accepted.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token type, must be Bearer")
    
    token = authorization.replace("Bearer ", "")
    
    if not settings.SUPABASE_JWKS_URL:
        raise HTTPException(status_code=500, detail="Supabase JWKS URL not configured")
        
    try:
        global jwk_client
        if jwk_client is None:
            jwk_client = jwt.PyJWKClient(settings.SUPABASE_JWKS_URL)
            
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
        )
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token (JWKS): {str(e)}")

def get_current_user_profile(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Profile:
    """
    FastAPI dependency to retrieve the user's Profile from the database.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token payload missing sub claim")
        
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID format in token")
        
    profile = db.query(Profile).filter(Profile.id == user_uuid).first()
    if not profile and payload.get("email", "").lower() == settings.DEMO_SEED_EMAIL.lower():
        profile = _repair_demo_profile(db, user_uuid, payload)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    return profile


def _repair_demo_profile(db: Session, user_uuid: uuid.UUID, payload: dict) -> Profile | None:
    """Restore the known demo profile after an interrupted seed/deploy."""
    organization = db.query(Organization).filter(Organization.name == settings.DEMO_SEED_ORG_NAME).first()
    if not organization:
        # A failed seed can remove the entire demo application graph while
        # Supabase Auth keeps the user. Reuse the idempotent seed with the
        # verified Auth UUID so workspace data and the profile recover
        # together, rather than manufacturing a profile without its graph.
        from scripts.seed_demo_data import seed_demo_data

        seed_demo_data(db, sync_auth=False, echo=False, user_id=user_uuid)
        return db.query(Profile).filter(Profile.id == user_uuid).first()
    profile = Profile(
        id=user_uuid,
        organization_id=organization.id,
        role="org_admin",
        full_name=(payload.get("user_metadata") or {}).get("full_name") or "Demo Admin",
    )
    db.add(profile)
    db.flush()
    db.add(OrganizationMembership(user_id=user_uuid, organization_id=organization.id, role="org_admin"))
    db.commit()
    db.refresh(profile)
    return profile

def require_org_admin(profile: Profile = Depends(get_current_user_profile)) -> Profile:
    """
    FastAPI dependency to ensure the user has the 'org_admin' role.
    """
    if profile.role != "org_admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin role required")
    return profile
