"""Proxy configuration, read from the environment (AD-14, spine Config row).

Every variable except OPENROUTER_API_KEY has a default in compose.yaml; the
defaults here only matter when running outside Compose (tests, local uv run).
"""

import os
from dataclasses import dataclass, field

PROMPT_VERSION = "2"  # bump on every prompt change (prompts/*.md)
PROVIDER_NAME = "OpenRouter"
DEFAULT_MODEL = "anthropic/claude-haiku-5.5"
# Output cap per model call: 15 concepts x 4 Items + 10 Summary Points, each with a Quote, fit well below this.
MAX_OUTPUT_TOKENS = 16_000


def _split(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


@dataclass(frozen=True)
class Settings:
    openrouter_api_key: str = ""
    openrouter_model: str = DEFAULT_MODEL
    generation_timeout_s: float = 40.0
    # Total Proxy deadline per /api/study-set request (AD-7). Fixed, not read from the environment.
    generation_deadline_s: float = 85.0
    simpler_timeout_s: float = 15.0
    allowed_origins: list[str] = field(default_factory=list)
    rate_limit_per_min: int = 10

    @property
    def key_configured(self) -> bool:
        return bool(self.openrouter_api_key.strip())


def load_settings() -> Settings:
    env = os.environ
    return Settings(
        openrouter_api_key=env.get("OPENROUTER_API_KEY", "").strip(),
        openrouter_model=env.get("OPENROUTER_MODEL") or DEFAULT_MODEL,
        generation_timeout_s=float(env.get("GENERATION_TIMEOUT_S") or 40),
        simpler_timeout_s=float(env.get("SIMPLER_TIMEOUT_S") or 15),
        allowed_origins=_split(
            env.get("ALLOWED_ORIGINS") or "http://localhost:3000,http://127.0.0.1:3000"
        ),
        rate_limit_per_min=int(env.get("RATE_LIMIT_PER_MIN") or 10),
    )
