import json

import pytest

from app.rules import validate_study_set
from app.schemas import StudySet, StudySetDraft
from study_set_data import concept, draft, quiz_question, summary_point


def run(raw):
    return validate_study_set(raw, model="some/model", prompt_version="9")


def test_valid_draft_is_stamped_and_keeps_language():
    result = run(draft())
    assert isinstance(result, StudySet)
    assert result.model == "some/model"
    assert result.prompt_version == "9"
    assert result.language == "nb"
    dumped = result.model_dump(by_alias=True)
    assert dumped["promptVersion"] == "9"
    assert dumped["concepts"][0]["quizQuestions"][0]["correctIndex"] == 0


@pytest.mark.parametrize("raw", ["{not json", json.dumps({"concepts": []}), {"language": "nb"}, None, 42])
def test_unparseable_or_schema_invalid_is_none(raw):
    assert run(raw) is None


def test_accepts_json_text_and_draft_instance():
    assert run(json.dumps(draft())) is not None
    assert run(StudySetDraft.model_validate(draft())) is not None


@pytest.mark.parametrize("value", ["", " ", " \n\t "])
def test_empty_or_whitespace_text_field_fails_the_schema(value):
    raw = draft()
    raw["concepts"][0]["flashcards"][0]["back"] = value
    assert run(raw) is None
    raw = draft()
    raw["summaryPoints"][0]["quote"] = value
    assert run(raw) is None
    raw = draft()
    raw["concepts"][0]["quizQuestions"][0]["options"][1] = value
    assert run(raw) is None


@pytest.mark.parametrize(
    "bad",
    [quiz_question(options=3), quiz_question(options=5), quiz_question(correct=4), quiz_question(correct=-1)],
)
def test_bad_quiz_question_is_dropped(bad):
    raw = draft()
    raw["concepts"][0]["quizQuestions"] = [bad, quiz_question(2)]
    result = run(raw)
    assert [q.question for q in result.concepts[0].quiz_questions] == ["Hva er 2?"]


def test_flashcards_and_quiz_questions_trimmed_to_two():
    raw = draft()
    raw["concepts"][0] = concept(1, flashcards=3, quiz=3)
    result = run(raw)
    assert [f.front for f in result.concepts[0].flashcards] == ["Spørsmål 1?", "Spørsmål 2?"]
    assert [q.question for q in result.concepts[0].quiz_questions] == ["Hva er 1?", "Hva er 2?"]


def test_drop_happens_before_trim():
    raw = draft()
    raw["concepts"][0]["quizQuestions"] = [quiz_question(1, options=3), quiz_question(2), quiz_question(3)]
    result = run(raw)
    assert [q.question for q in result.concepts[0].quiz_questions] == ["Hva er 2?", "Hva er 3?"]


def test_summary_points_over_40_words_dropped_then_trimmed_to_10():
    raw = draft(points=0)
    raw["summaryPoints"] = [summary_point(0, words=41)] + [summary_point(n) for n in range(1, 13)]
    result = run(raw)
    assert len(result.summary_points) == 10
    assert result.summary_points[0].text.startswith("ord1 ")
    assert result.summary_points[-1].text.startswith("ord10 ")


def test_summary_point_of_exactly_40_words_is_kept():
    raw = draft()
    raw["summaryPoints"][0] = summary_point(1, words=40)
    result = run(raw)
    assert len(result.summary_points[0].text.split()) == 40
    assert len(result.summary_points) == 5


def test_concepts_stable_sorted_by_rank_and_renumbered():
    raw = draft(concepts=0)
    raw["concepts"] = [
        concept(7, name="C"),
        concept(2, name="A"),
        concept(7, name="D"),
        concept(3, name="B"),
        concept(9, name="E"),
    ]
    result = run(raw)
    assert [c.name for c in result.concepts] == ["A", "B", "C", "D", "E"]
    assert [c.centrality_rank for c in result.concepts] == [1, 2, 3, 4, 5]


def test_concept_without_items_stays():
    raw = draft()
    raw["concepts"][4] = concept(5, flashcards=0, quiz=0)
    result = run(raw)
    assert len(result.concepts) == 5
    assert result.concepts[4].flashcards == [] and result.concepts[4].quiz_questions == []


@pytest.mark.parametrize("concepts,points,ok", [(4, 5, False), (5, 5, True), (15, 10, True), (16, 5, False), (5, 4, False)])
def test_count_rules(concepts, points, ok):
    assert (run(draft(concepts=concepts, points=points)) is not None) is ok


def test_count_rule_applies_after_dropping_long_summary_points():
    raw = draft(points=5)
    raw["summaryPoints"][0] = summary_point(1, words=41)
    assert run(raw) is None


def test_draft_json_schema_has_no_pattern_but_keeps_min_length():
    schema = json.dumps(StudySetDraft.model_json_schema())
    assert '"pattern"' not in schema
    assert '"minLength": 1' in schema
