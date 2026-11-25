// Scoring (FR-14, AD-3, Story 2.4). Pure and deterministic: no AI call, no time, no randomness.
import { isQuizAnswer, type RoundAnswer } from "./round";

/** "{correct} av {total} riktige" (`result.score`). */
export type Score = { correct: number; total: number };

/** The first Quiz answer's `choice` per Item ID; Flashcard marks are left out. */
export function quizChoices(answers: readonly RoundAnswer[]): Map<string, number> {
  const choices = new Map<string, number>();
  for (const answer of answers) {
    if (isQuizAnswer(answer) && !choices.has(answer.itemId)) choices.set(answer.itemId, answer.choice);
  }
  return choices;
}

/**
 * `total` is the Round's Quiz Questions (a Round can have fewer questions than concepts); `correct`
 * counts the Quiz answers whose `choice` (the original option index) is the question's `correctIndex`.
 * Flashcard marks are ignored; an unanswered question counts as wrong. Each question counts once, and an
 * answer to an Item that is not among `questions` is ignored.
 */
export function score(
  answers: readonly RoundAnswer[],
  questions: readonly { id: string; correctIndex: number }[],
): Score {
  const choices = quizChoices(answers);
  const correct = questions.filter((q) => choices.get(q.id) === q.correctIndex).length;
  return { correct, total: questions.length };
}
