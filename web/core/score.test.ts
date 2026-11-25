// FR-14: the Resultat score (Story 2.4). Correct out of the Quiz Questions asked.
import { describe, expect, it } from "vitest";
import type { RoundAnswer } from "./round";
import { quizChoices, score } from "./score";

const T = "2026-11-25T10:00:00.000Z";
const q = (id: string, correctIndex = 1) => ({ id, correctIndex });
const quiz = (itemId: string, choice: number): RoundAnswer => ({ itemId, choice, answeredAt: T });
const card = (itemId: string, knew: boolean): RoundAnswer => ({ itemId, knew, answeredAt: T });
const FOUR = [q("a.qq1"), q("b.qq1"), q("c.qq1"), q("d.qq1")];

describe("score (FR-14)", () => {
  it("all right", () => {
    expect(score(FOUR.map((x) => quiz(x.id, 1)), FOUR)).toEqual({ correct: 4, total: 4 });
  });

  it("all wrong", () => {
    expect(score(FOUR.map((x) => quiz(x.id, 0)), FOUR)).toEqual({ correct: 0, total: 4 });
  });

  it("mixed: 2 of 4 right", () => {
    expect(score([quiz("a.qq1", 1), quiz("b.qq1", 3), quiz("c.qq1", 1), quiz("d.qq1", 2)], FOUR)).toEqual({ correct: 2, total: 4 });
  });

  it("fewer questions than concepts: total is the questions asked (5 concepts, 3 questions)", () => {
    const three = FOUR.slice(0, 3);
    const answers = [
      ...["a", "b", "c", "d", "e"].map((c) => card(`${c}.fc1`, true)),
      ...three.map((x) => quiz(x.id, 1)),
    ];
    expect(score(answers, three)).toEqual({ correct: 3, total: 3 });
  });

  it("ignores Flashcard marks, even 'Kunne det' on a question's concept", () => {
    expect(score([card("a.fc1", true), card("b.fc1", true), quiz("a.qq1", 1)], FOUR.slice(0, 2))).toEqual({
      correct: 1,
      total: 2,
    });
  });

  it("counts an unanswered question as wrong", () => {
    expect(score([quiz("a.qq1", 1)], FOUR)).toEqual({ correct: 1, total: 4 });
    expect(score([], FOUR)).toEqual({ correct: 0, total: 4 });
  });

  it("uses the original option index, compared with correctIndex", () => {
    expect(score([quiz("a.qq1", 2)], [q("a.qq1", 2)])).toEqual({ correct: 1, total: 1 });
  });

  it("quizChoices: the first Quiz answer's choice per question, no Flashcard marks", () => {
    expect([...quizChoices([card("a.fc1", true), quiz("a.qq1", 2), quiz("a.qq1", 1), quiz("b.qq1", 0)])]).toEqual([
      ["a.qq1", 2],
      ["b.qq1", 0],
    ]);
  });

  it("no questions: 0 of 0", () => {
    expect(score([card("a.fc1", true)], [])).toEqual({ correct: 0, total: 0 });
  });
});
