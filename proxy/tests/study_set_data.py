"""Builders for model drafts and requests, and a stub model that counts its calls."""

import asyncio
import json
from collections.abc import Callable
from typing import Any

from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

# Origin every browser request from the app carries (Story 1.7 guard).
ORIGIN = "http://localhost:3000"

MARKER = "SECRET-MARKER-7f3a"
NOTE_HASH = "a" * 64
QUOTE = "Dette er et sitat som er langt nok til kontrollen."


def flashcard(n: int = 1) -> dict[str, Any]:
    return {"front": f"Spørsmål {n}?", "back": f"Svar {n}.", "passageId": "p1", "quote": QUOTE}


def quiz_question(n: int = 1, *, options: int = 4, correct: int = 0) -> dict[str, Any]:
    return {
        "question": f"Hva er {n}?",
        "options": [f"Valg {i}" for i in range(options)],
        "correctIndex": correct,
        "passageId": "p1",
        "quote": QUOTE,
    }


def concept(rank: int, *, name: str | None = None, flashcards: int = 1, quiz: int = 1) -> dict[str, Any]:
    return {
        "name": name or f"Begrep {rank}",
        "centralityRank": rank,
        "flashcards": [flashcard(i) for i in range(1, flashcards + 1)],
        "quizQuestions": [quiz_question(i) for i in range(1, quiz + 1)],
    }


def summary_point(n: int = 1, *, words: int = 8) -> dict[str, Any]:
    text = " ".join([f"ord{n}"] * words)
    return {"text": text, "passageId": "p1", "quote": QUOTE}


def draft(*, concepts: int = 5, points: int = 5, language: str = "nb") -> dict[str, Any]:
    return {
        "concepts": [concept(rank) for rank in range(1, concepts + 1)],
        "summaryPoints": [summary_point(n) for n in range(1, points + 1)],
        "language": language,
    }


def request_body(*, mode: str = "live", text: str | None = None, **overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "mode": mode,
        "noteHash": NOTE_HASH,
        "passages": [
            {"id": "p1", "text": text or "Fotosyntese er prosessen der planter lager sukker."},
            {"id": "p2", "text": "Klorofyll fanger lysenergi."},
        ],
    }
    body.update(overrides)
    return body


Step = str | dict | BaseException | ModelResponse | Callable[[], Any]


class StubModel:
    """A FunctionModel that plays one step per call: JSON text, a dict, a response, an exception,
    or an async callable (e.g. a long sleep). The last step repeats."""

    def __init__(self, *steps: Step):
        self.steps = list(steps)
        self.calls = 0
        self.messages: list[list[ModelMessage]] = []
        self.infos: list[AgentInfo] = []
        self.model = FunctionModel(self._respond, model_name="stub")

    async def _respond(self, messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        step = self.steps[min(self.calls, len(self.steps) - 1)]
        self.calls += 1
        self.messages.append(messages)
        self.infos.append(info)
        if callable(step) and not isinstance(step, BaseException):
            step = await step()
        if isinstance(step, BaseException):
            raise step
        if isinstance(step, ModelResponse):
            return step
        if isinstance(step, dict):
            step = json.dumps(step, ensure_ascii=False)
        return ModelResponse(parts=[TextPart(step)])


def sleeper(seconds: float) -> Callable[[], Any]:
    async def _sleep() -> str:
        await asyncio.sleep(seconds)
        return json.dumps(draft())

    return _sleep
