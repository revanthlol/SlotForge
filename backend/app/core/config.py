from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    APP_ENV: str = "development"
    API_PORT: int = 8000
    DATABASE_URL: str
    DATABASE_URL_POOLED: str | None = None
    SUPABASE_URL: str
    SUPABASE_PUBLISHABLE_KEY: str
    SUPABASE_SECRET_KEY: str
    SUPABASE_JWKS_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    DEV_MODE: bool = False

settings = Settings()
