import jwt
import uuid
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models.profile import Profile

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
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    return profile

def require_org_admin(profile: Profile = Depends(get_current_user_profile)) -> Profile:
    """
    FastAPI dependency to ensure the user has the 'org_admin' role.
    """
    if profile.role != "org_admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin role required")
    return profile

