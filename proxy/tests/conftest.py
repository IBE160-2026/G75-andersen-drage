import pytest
from pydantic_ai import models

from app import llm

# No test may reach a real provider: real models refuse to send a request.
models.ALLOW_MODEL_REQUESTS = False


@pytest.fixture(autouse=True)
def _fresh_llm_caches():
    llm.get_provider.cache_clear()
    llm.get_agent.cache_clear()
    yield
    llm.get_provider.cache_clear()
    llm.get_agent.cache_clear()
