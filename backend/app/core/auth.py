import jwt
import uuid
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models.profile import Profile

def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Decodes and verifies the Supabase JWT from the Authorization header.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token type, must be Bearer")
    
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    return payload

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
