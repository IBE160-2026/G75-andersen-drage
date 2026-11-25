"""Contract models: the single source of the browser<->Proxy contract (AD-4).

`web/api/schema.d.ts` is generated from the OpenAPI document built from these
models. Never hand-copy these shapes into TypeScript.

Three groups live here:
- the request (`StudySetRequest`, `Passage`),
- the draft the model is asked to return (`StudySetDraft` and its `Draft*` parts;
  loosely constrained so `app.rules` can drop and trim instead of failing whole),
- the contract response (`StudySet`), which only `app.rules.validate_study_set` builds.
"""

from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, model_validator
from pydantic.alias_generators import to_camel

MAX_PASSAGES = 15_000
MAX_TOTAL_CHARS = 1_000_000

# At least one non-whitespace character.
NonEmptyStr = Annotated[str, StringConstraints(pattern=r"\S")]


def _not_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("blank")
    return value


# Draft fields go to the model as the NativeOutput JSON schema: only `minLength: 1` there
# (strict schema output may reject `pattern`); the non-whitespace rule runs in Python.
DraftStr = Annotated[str, StringConstraints(min_length=1), AfterValidator(_not_blank)]


class ContractModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Status(ContractModel):
    key_configured: bool
    model: str
    provider: str
    prompt_version: str


class ErrorBody(ContractModel):
    code: str


# --- Request -----------------------------------------------------------------


class Passage(ContractModel):
    id: Annotated[str, StringConstraints(pattern=r"^p[1-9][0-9]*$")]
    text: NonEmptyStr


class StudySetRequest(ContractModel):
    mode: Literal["live", "demo"]
    note_hash: Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{64}$")]
    # Demo Mode sends `[]` (D-21): the Fixture is found by Note Hash, so no Note text leaves the browser.
    passages: list[Passage] = Field(max_length=MAX_PASSAGES)

    @model_validator(mode="after")
    def _check_passages(self) -> "StudySetRequest":
        # Fixed messages: the 400 handler never echoes them anyway.
        if self.mode == "live" and not self.passages:
            raise ValueError("live needs passages")
        if sum(len(p.text) for p in self.passages) > MAX_TOTAL_CHARS:
            raise ValueError("passages too long")
        if len({p.id for p in self.passages}) != len(self.passages):
            raise ValueError("duplicate passage ids")
        return self


# --- Draft (what the model returns, NativeOutput) ------------------------------


class DraftFlashcard(ContractModel):
    front: DraftStr
    back: DraftStr
    passage_id: DraftStr
    quote: DraftStr


class DraftQuizQuestion(ContractModel):
    question: DraftStr
    options: list[DraftStr]
    correct_index: int
    passage_id: DraftStr
    quote: DraftStr


class DraftKeyConcept(ContractModel):
    name: DraftStr
    centrality_rank: int
    flashcards: list[DraftFlashcard]
    quiz_questions: list[DraftQuizQuestion]


class DraftSummaryPoint(ContractModel):
    text: DraftStr
    passage_id: DraftStr
    quote: DraftStr


class StudySetDraft(ContractModel):
    concepts: list[DraftKeyConcept]
    summary_points: list[DraftSummaryPoint]
    language: DraftStr


# --- Contract response ------------------------------------------------------------


class Flashcard(ContractModel):
    front: NonEmptyStr
    back: NonEmptyStr
    passage_id: NonEmptyStr
    quote: NonEmptyStr


class QuizQuestion(ContractModel):
    question: NonEmptyStr
    options: list[NonEmptyStr] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    passage_id: NonEmptyStr
    quote: NonEmptyStr


class KeyConcept(ContractModel):
    name: NonEmptyStr
    centrality_rank: int
    flashcards: list[Flashcard]
    quiz_questions: list[QuizQuestion]


class SummaryPoint(ContractModel):
    text: NonEmptyStr
    passage_id: NonEmptyStr
    quote: NonEmptyStr


class StudySet(ContractModel):
    concepts: list[KeyConcept]
    summary_points: list[SummaryPoint]
    language: NonEmptyStr
    model: str
    prompt_version: str
