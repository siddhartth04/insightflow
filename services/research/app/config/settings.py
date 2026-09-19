"""Runtime configuration for the Research service."""
from functools import lru_cache
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Environment-backed settings.

    Values are read once at import time so that the rest of the service can
    depend on a plain object instead of scattering os.getenv calls around.
    """

    def __init__(self) -> None:
        self.module_id: str = "research"
        self.module_name: str = "Research"
        self.version: str = "1.0.0"
        self.port: int = int(os.getenv("RESEARCH_PORT", "8001"))

        # LLM configuration -- every model call goes through LiteLLM.
        self.llm_model: str = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
        self.llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.4"))
        self.llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "2000"))
        self.llm_timeout: float = float(os.getenv("LLM_TIMEOUT", "120"))

        # Optional LiteLLM proxy. When unset, LiteLLM talks to the provider
        # directly using whichever provider key is present in the environment.
        base_url = os.getenv("LITELLM_BASE_URL", "").strip()
        self.litellm_base_url: str | None = base_url or None
        api_key = os.getenv("LITELLM_API_KEY", "").strip()
        self.litellm_api_key: str | None = api_key or None

        # When no provider credentials exist the service runs in a deterministic
        # offline mode so the UI remains fully explorable.
        self.offline_mode: bool = os.getenv("OFFLINE_MODE", "").lower() in {"1", "true", "yes"}

        self.cors_origins: list[str] = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "*").split(",")
            if origin.strip()
        ]

    @property
    def has_credentials(self) -> bool:
        """True when some provider credential or proxy is configured."""
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
