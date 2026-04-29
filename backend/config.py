from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    tavily_api_key: str
    supabase_url: str
    supabase_key: str
    model_name: str = "anthropic:claude-sonnet-4-6"

    model_config = {"env_file": ".env"}

settings = Settings()
