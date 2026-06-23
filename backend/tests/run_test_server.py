import uvicorn
import jwt
from fastapi import Header, HTTPException
from app.main import app
from app.core.auth import get_current_user

def mock_get_current_user(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token type, must be Bearer")
    
    token = authorization.replace("Bearer ", "")
    try:
        # Decode without verification for E2E TESTING.sh offline mock mode
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Mock token decode failed: {str(e)}")

# Apply dependency override for uvicorn testing
app.dependency_overrides[get_current_user] = mock_get_current_user

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
