"""Runtime configuration for the Content service."""
from functools import lru_cache
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Environment-backed settings."""

    def __init__(self) -> None:
        self.module_id: str = "content"
        self.module_name: str = "Content Studio"
        self.version: str = "1.0.0"
        self.port: int = int(os.getenv("CONTENT_PORT", "8002"))

        # LLM configuration -- every model call goes through LiteLLM.
        self.llm_model: str = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
        self.llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.6"))
        self.llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "2000"))
        self.llm_timeout: float = float(os.getenv("LLM_TIMEOUT", "120"))
        # Retries apply to provider rate limits, which free tiers hit easily.
        self.llm_max_retries: int = int(os.getenv("LLM_MAX_RETRIES", "3"))

        base_url = os.getenv("LITELLM_BASE_URL", "").strip()
        self.litellm_base_url: str | None = base_url or None
        api_key = os.getenv("LITELLM_API_KEY", "").strip()
        self.litellm_api_key: str | None = api_key or None

        self.offline_mode: bool = os.getenv("OFFLINE_MODE", "").lower() in {"1", "true", "yes"}

        # Cross-module dependency. Never hard-coded: Docker Compose sets this to
        # the research service name on the shared network.
        self.research_service_url: str = os.getenv(
            "RESEARCH_SERVICE_URL", "http://localhost:8001"
        ).rstrip("/")
        self.research_timeout: float = float(os.getenv("RESEARCH_TIMEOUT", "180"))

        self.cors_origins: list[str] = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "*").split(",")
            if origin.strip()
        ]

    @property
    def has_credentials(self) -> bool:
        if self.litellm_base_url:
            return True
        return any(
            os.getenv(key)
            for key in (
                "OPENAI_API_KEY",
                "ANTHROPIC_API_KEY",
                "GEMINI_API_KEY",
                "AZURE_API_KEY",
                "GROQ_API_KEY",
                "MISTRAL_API_KEY",
            )
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
