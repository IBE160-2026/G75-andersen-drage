"""Model access. The provider is built lazily so the Proxy boots without a key (AD-14).

Story 1.1 only needs the lazy factory; generation arrives in Story 1.6.
"""

from functools import lru_cache

from .config import load_settings


@lru_cache(maxsize=1)
def get_provider():
    """Build the OpenRouter provider on first use. Never called at boot."""
    settings = load_settings()
    if not settings.key_configured:
        raise RuntimeError("err.noKey")
    from pydantic_ai.providers.openrouter import OpenRouterProvider

    return OpenRouterProvider(api_key=settings.openrouter_api_key)
