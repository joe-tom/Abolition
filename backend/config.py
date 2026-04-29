from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    tavily_api_key: str
    database_url: str = "sqlite:///./abolition.db"
    model_name: str = "anthropic:claude-sonnet-4-6"

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()
