"""Count rules for a model's Study Set (AD-3). Reused by Fixture recording and Demo Mode (1.13/1.14).

The Proxy never looks at Note text here: IDs, the Quote Check, option uniqueness and
normalization all happen in the browser (`verifyStudySet`, Story 1.8).
"""

from pydantic import ValidationError

from .schemas import StudySet, StudySetDraft

MIN_CONCEPTS = 5
MAX_CONCEPTS = 15
MAX_ITEMS_PER_KIND = 2  # Flashcards and Quiz Questions per concept
MIN_SUMMARY_POINTS = 5
MAX_SUMMARY_POINTS = 10
MAX_SUMMARY_WORDS = 40
QUIZ_OPTIONS = 4


def _parse(raw: object) -> StudySetDraft | None:
    try:
        if isinstance(raw, StudySetDraft):
            return raw
        if isinstance(raw, (str, bytes, bytearray)):
            return StudySetDraft.model_validate_json(raw)
        return StudySetDraft.model_validate(raw)
    except ValidationError:
        return None


def validate_study_set(raw: object, *, model: str, prompt_version: str) -> StudySet | None:
    """Apply the drop and trim rules, then the count rules. `None` means the output is unusable.

    `raw` is a `StudySetDraft`, its JSON text, or the parsed JSON (dict).
    """
    draft = _parse(raw)
    if draft is None:
        return None

    concepts = []
    for concept in draft.concepts:
        questions = [
            q
            for q in concept.quiz_questions
            if len(q.options) == QUIZ_OPTIONS and 0 <= q.correct_index < QUIZ_OPTIONS
        ]
        concepts.append(
            {
                "name": concept.name,
                "centrality_rank": concept.centrality_rank,
                "flashcards": [f.model_dump() for f in concept.flashcards[:MAX_ITEMS_PER_KIND]],
                "quiz_questions": [q.model_dump() for q in questions[:MAX_ITEMS_PER_KIND]],
            }
        )
    # Stable: concepts with the same rank keep the model's order.
    concepts.sort(key=lambda c: c["centrality_rank"])
    for rank, concept in enumerate(concepts, start=1):
        concept["centrality_rank"] = rank

    summary_points = [
        p.model_dump() for p in draft.summary_points if len(p.text.split()) <= MAX_SUMMARY_WORDS
    ][:MAX_SUMMARY_POINTS]

    if not MIN_CONCEPTS <= len(concepts) <= MAX_CONCEPTS:
        return None
    if len(summary_points) < MIN_SUMMARY_POINTS:
        return None

    try:
        return StudySet(
            concepts=concepts,
            summary_points=summary_points,
            language=draft.language,
            model=model,
            prompt_version=prompt_version,
        )
    except ValidationError:
        return None
