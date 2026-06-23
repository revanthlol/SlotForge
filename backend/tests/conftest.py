import pytest
import jwt
import httpx
from unittest.mock import patch
from fastapi import Header, HTTPException
from app.main import app
from app.core.auth import get_current_user

def mock_get_current_user(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token type, must be Bearer")
    
    token = authorization.replace("Bearer ", "")
    try:
        # Decode without verification for testing purposes
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Mock token decode failed: {str(e)}")

@pytest.fixture(autouse=True, scope="session")
def setup_dependency_overrides():
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True, scope="session")
def mock_external_requests():
    """
    Globally mock httpx.Client.post to intercept Supabase Auth signup calls during pytest.
    """
    original_post = httpx.Client.post
    
    def mock_post(self, url, *args, **kwargs):
        # Intercept GoTrue signup endpoint calls
        if "/auth/v1/signup" in str(url):
            json_data = kwargs.get("json", {})
            email = json_data.get("email", "mocked@slotforge.com")
            # Return a mock successful GoTrue response containing the user ID directly at the root
            return httpx.Response(
                status_code=200,
                json={
                    "id": "11111111-2222-3333-4444-555555555555",
                    "email": email,
                    "user_metadata": {
                        "full_name": json_data.get("options", {}).get("data", {}).get("full_name", "")
                    }
                },
                request=httpx.Request("POST", url)
            )
        return original_post(self, url, *args, **kwargs)
        
    with patch.object(httpx.Client, "post", mock_post):
        yield
