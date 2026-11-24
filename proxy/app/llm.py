"""Model access (AD-13, AD-14).

The provider, the OpenRouter model and the agent are built lazily, so the Proxy boots
without a key and never imports the OpenRouter modules until a live request needs them.
Note text goes only into the user message, as JSON data inside a fixed delimiter.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any

from .config import MAX_OUTPUT_TOKENS, load_settings
from .schemas import Passage, StudySetDraft

if TYPE_CHECKING:
    from pydantic_ai import Agent
    from pydantic_ai.models import Model

_PROMPTS = Path(__file__).resolve().parent / "prompts"
SYSTEM_PROMPT = (_PROMPTS / "system.md").read_text(encoding="utf-8").strip()
USER_INSTRUCTION = (_PROMPTS / "user.md").read_text(encoding="utf-8").strip()

DELIMITER_OPEN = "<note_passages>"
DELIMITER_CLOSE = "</note_passages>"

# OpenRouter provider routing (AD-13): ZDR endpoints only, no data collection, and only
# providers that honour every parameter we send (structured output, max_tokens).
ROUTING = {"zdr": True, "data_collection": "deny", "require_parameters": True}


@lru_cache(maxsize=1)
def get_provider():
    """Build the OpenRouter provider on first use. Never called at boot."""
    settings = load_settings()
    if not settings.key_configured:
        raise RuntimeError("err.noKey")
    from pydantic_ai.providers.openrouter import OpenRouterProvider

    return OpenRouterProvider(api_key=settings.openrouter_api_key)


def model_settings() -> dict[str, Any]:
    """No temperature/top_p and no reasoning (AD-13); no SDK retries, the Proxy retries itself (AD-7)."""
    return {"openrouter_provider": dict(ROUTING), "max_tokens": MAX_OUTPUT_TOKENS, "max_retries": 0}


def build_agent(model: "Model") -> "Agent":
    """The generation agent around any model (the OpenRouter model live, a stub in tests)."""
    from pydantic_ai import Agent, NativeOutput

    return Agent(
        model,
        output_type=NativeOutput(StudySetDraft),
        instructions=SYSTEM_PROMPT,
        retries=0,
        model_settings=model_settings(),
    )


@lru_cache(maxsize=1)
def get_agent() -> "Agent":
    """The live agent: OpenRouter model named by OPENROUTER_MODEL. Raises without a key."""
    from pydantic_ai.models.openrouter import OpenRouterModel

    settings = load_settings()
    return build_agent(OpenRouterModel(settings.openrouter_model, provider=get_provider()))


def render_passages(passages: list[Passage]) -> str:
    """User message: instruction, then the Passages as JSON inside the delimiter.

    `<`, `>` and `&` are escaped as JSON unicode escapes, so no Passage can close the
    delimiter or open a tag of its own.
    """
    data = json.dumps([{"id": p.id, "text": p.text} for p in passages], ensure_ascii=False)
    data = data.replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
    return f"{USER_INSTRUCTION}\n\n{DELIMITER_OPEN}\n{data}\n{DELIMITER_CLOSE}"


async def run_once(agent: "Agent", prompt: str, *, timeout: float) -> StudySetDraft:
    """One model call; returns the parsed draft (still unchecked by the count rules)."""
    result = await agent.run(prompt, timeout=timeout)
    return result.output
