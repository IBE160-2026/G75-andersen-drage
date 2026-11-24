"""generate(): retries, error mapping and the AD-7 budget, with a stub model."""

import asyncio

import pytest
from pydantic_ai.exceptions import (
    ContentFilterError,
    ModelConnectionError,
    ModelHTTPError,
    ModelRequestTimeout,
    ModelTimeoutError,
    OutputTokenLimitExceeded,
    UnexpectedModelBehavior,
    UserError,
)
from pydantic_ai.messages import ModelResponse, TextPart

from app import llm
from app.config import PROMPT_VERSION, Settings
from app.generation import GenerationError, generate
from app.schemas import StudySet, StudySetRequest
from study_set_data import StubModel, draft, request_body, sleeper

REQUEST = StudySetRequest.model_validate(request_body())


def run(stub: StubModel, settings: Settings | None = None, clock=None):
    agent = llm.build_agent(stub.model)
    kwargs = {"clock": clock} if clock else {}
    return asyncio.run(generate(REQUEST, settings or Settings(), agent=agent, **kwargs))


def truncated() -> ModelResponse:
    return ModelResponse(parts=[TextPart('{"concepts": [{"name": "Fot')], finish_reason="length")


RETRYABLE = {
    "invalid JSON": "{not json",
    "schema": {"concepts": "nope"},
    "count rule": draft(concepts=4),
    "refusal": ContentFilterError("refused"),
    "unexpected behavior": UnexpectedModelBehavior("odd"),
    "max-tokens stop (raised)": OutputTokenLimitExceeded("cut"),
    "provider 500": ModelHTTPError(500, "stub"),
    "provider 503": ModelHTTPError(503, "stub"),
    "provider 429": ModelHTTPError(429, "stub"),
    "connection error": ModelConnectionError("stub", "refused", phase="connect"),
    "transport timeout": ModelTimeoutError("stub", "timed out"),
    "request timeout": ModelRequestTimeout("stub", 40),
    "builtin TimeoutError": TimeoutError(),
}


def test_valid_first_attempt_is_one_call():
    stub = StubModel(draft())
    result = run(stub)
    assert isinstance(result, StudySet)
    assert result.prompt_version == PROMPT_VERSION
    assert result.model == Settings().openrouter_model
    assert stub.calls == 1


@pytest.mark.parametrize("failure", RETRYABLE.values(), ids=RETRYABLE.keys())
def test_first_failure_then_success_is_two_calls(failure):
    stub = StubModel(failure, draft())
    assert isinstance(run(stub), StudySet)
    assert stub.calls == 2


def test_max_tokens_stop_with_truncated_json_is_retried():
    stub = StubModel(truncated(), draft())
    assert isinstance(run(stub), StudySet)
    assert stub.calls == 2


def test_length_stop_with_valid_output_is_accepted():
    import json

    stub = StubModel(ModelResponse(parts=[TextPart(json.dumps(draft()))], finish_reason="length"))
    assert isinstance(run(stub), StudySet)
    assert stub.calls == 1


@pytest.mark.parametrize(
    "failures,status",
    [
        (["{not json", "{not json"], 502),
        ([ModelHTTPError(500, "stub"), draft(concepts=3)], 502),
        (["{not json", ModelTimeoutError("stub", "t")], 504),
        ([ModelTimeoutError("stub", "t"), "{not json"], 502),
        ([ModelRequestTimeout("stub", 40), ModelRequestTimeout("stub", 40)], 504),
        ([TimeoutError(), asyncio.TimeoutError()], 504),
    ],
)
def test_both_attempts_fail(failures, status):
    stub = StubModel(*failures)
    result = run(stub)
    assert result == GenerationError(status, "err.generation")
    assert stub.calls == 2


@pytest.mark.parametrize(
    "failure",
    [ModelHTTPError(400, "stub"), ModelHTTPError(401, "stub"), ModelHTTPError(404, "stub"), UserError("bad"), RuntimeError("boom"), ValueError("x")],
    ids=["400", "401", "404", "UserError", "RuntimeError", "ValueError"],
)
def test_non_retryable_failure_is_502_after_one_call(failure):
    stub = StubModel(failure, draft())
    assert run(stub) == GenerationError(502)
    assert stub.calls == 1


class FakeClock:
    def __init__(self, *times: float):
        self.times = list(times)

    def __call__(self) -> float:
        return self.times.pop(0) if len(self.times) > 1 else self.times[0]


@pytest.mark.parametrize("failure,status", [("{not json", 502), (ModelTimeoutError("stub", "t"), 504)])
def test_no_retry_when_less_than_40_s_remain(failure, status):
    # start at 0, first attempt begins at 0, retry check at 46 s: 39 s left of 85.
    stub = StubModel(failure, draft())
    assert run(stub, clock=FakeClock(0, 0, 46)) == GenerationError(status)
    assert stub.calls == 1


def test_retry_when_exactly_40_s_remain():
    stub = StubModel("{not json", draft())
    assert isinstance(run(stub, clock=FakeClock(0, 0, 45)), StudySet)
    assert stub.calls == 2


def test_budget_allows_retry_then_both_time_out():
    stub = StubModel(sleeper(5))
    result = run(stub, Settings(generation_timeout_s=0.2, generation_deadline_s=0.5))
    assert result == GenerationError(504)
    assert stub.calls == 2


def test_budget_too_small_for_retry_is_one_call():
    stub = StubModel(sleeper(5))
    result = run(stub, Settings(generation_timeout_s=0.2, generation_deadline_s=0.3))
    assert result == GenerationError(504)
    assert stub.calls == 1


def test_each_attempt_gets_a_fresh_run():
    stub = StubModel("{not json", draft())
    run(stub)
    # Second call starts a new conversation (no retry prompt with the failed output).
    assert len(stub.messages[0]) == len(stub.messages[1]) == 1
