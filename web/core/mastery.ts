// Mastery State update (FR-17, Story 2.2). Pure; reused by the Quiz in Story 2.3.
import type { MasteryState } from "./round";

/** One signal: 'Kunne det' or a right answer is `correct`; 'Kunne det ikke' or a wrong answer is `wrong`. */
export type MasterySignal = "correct" | "wrong";

/**
 * FR-17 table: new / shaky / known + correct → known; + wrong → shaky. The latest signal wins, so the
 * previous state does not change the result; it stays a parameter so the table reads as one function.
 */
export function updateMastery(state: MasteryState, signal: MasterySignal): MasteryState {
  void state;
  return signal === "correct" ? "known" : "shaky";
}
