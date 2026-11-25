"use client";

import type { VerifiedQuizQuestion } from "../../core/types";
import { format, t } from "../../i18n/messages";
import { Button, buttonClass } from "../Button/Button";
import { ErrorMessage } from "../ErrorMessage/ErrorMessage";
import { QuoteBlock } from "../QuoteBlock/QuoteBlock";
import { SourceRef, type ReturnContext } from "../ReferenceJump/ReferenceJump";
import styles from "./QuizQuestion.module.css";

const ANSWER_ERROR_ID = "answer-error";
const FEEDBACK_ID = "answer-feedback";

/** The display letters of the four options (DESIGN.md › Quiz Question: "labeled A–D"). */
export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

/**
 * The display order of a question's options: the Round's stored `optionOrder` permutation, or the Study
 * Set order when the stored one is missing or not a permutation of the options. `composeRound` always
 * stores a permutation; `recordQuizAnswer` only rejects an answer when the question has no `optionOrder`
 * entry or `choice` is not an integer in `0 … optionOrder[itemId].length − 1`.
 */
export function displayOrder(order: readonly number[] | undefined, optionCount: number): number[] {
  const identity = Array.from({ length: optionCount }, (_, i) => i);
  if (!order || order.length !== optionCount) return identity;
  const sorted = [...order].sort((a, b) => a - b);
  return sorted.every((value, i) => value === i) ? [...order] : identity;
}

/**
 * Quiz region (UX-DR14, Story 2.3). A `section` labelled by the Item `h2` ("Spørsmål {x} av {y}", in the
 * Round screen's progress line), no card container: concept chip, stem in `card-front`, "Kilde: Pn"
 * (usable before and after answering) and four full-width options "A"–"D" in `order` (original option
 * indices in display order). No Quote before answering.
 *
 * Selecting an option calls `onAnswer` with its original index. While it saves (`pending`) every option
 * is `aria-disabled`; `failed` shows `err.generation` inline, named by the options. Once `choice` is set
 * (the stored answer), the correct option shows "✓", a wrong choice "✗" (marks `aria-hidden`; the live
 * text carries the meaning), every option is `aria-disabled` without the disabled style, the persistent
 * `aria-live="polite"` line reads `quiz.correct` / `quiz.wrong`, then the Quote block and the advance
 * control (`nextLabel`). Focus is never moved here: it stays on the chosen option.
 */
export function QuizQuestion({
  question,
  conceptName,
  position,
  headingId,
  lang,
  order,
  choice,
  pending,
  failed,
  onAnswer,
  nextLabel,
  onNext,
}: {
  question: VerifiedQuizQuestion;
  conceptName: string;
  /** 1-based "x" of "Spørsmål x av y", for the return context "Viser Pn fra spørsmål x". */
  position: number;
  headingId: string;
  lang: string;
  /** Original option indices in display order. */
  order: readonly number[];
  /** The stored answer's original option index, or null while unanswered. */
  choice: number | null;
  pending: boolean;
  failed: boolean;
  onAnswer: (choice: number) => void;
  nextLabel: string;
  onNext: () => void;
}) {
  const answered = choice !== null;
  const correctLetter = OPTION_LETTERS[order.indexOf(question.correctIndex)] ?? "";
  const returnContext: ReturnContext = {
    from: format("return.from.question", { x: String(position) }),
    action: t("return.question"),
  };
  const errorId = failed ? ANSWER_ERROR_ID : null;
  const feedback = !answered
    ? ""
    : choice === question.correctIndex
      ? t("quiz.correct")
      : format("quiz.wrong", { svar: correctLetter });

  return (
    <section aria-labelledby={headingId} className={styles.region}>
      <div className={styles.top}>
        <span lang={lang} className={styles.conceptChip}>
          {conceptName}
        </span>
      </div>
      <p lang={lang} className={styles.stem}>
        {question.question}
      </p>
      <p className={styles.ref}>
        <SourceRef id={`ref-${question.id}`} passageId={question.passageId} quote={question.quote} returnContext={returnContext} />
      </p>
      <ul className={styles.options}>
        {order.map((original, displayIndex) => {
          const isCorrect = answered && original === question.correctIndex;
          const isWrong = answered && original === choice && !isCorrect;
          // The chosen and the correct option keep the feedback line as their description after answering.
          const describedBy =
            [errorId, isCorrect || isWrong ? FEEDBACK_ID : null].filter(Boolean).join(" ") || undefined;
          const classes = [
            styles.option,
            answered ? styles.answered : null,
            isCorrect ? styles.correct : null,
            isWrong ? styles.wrong : null,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={original}>
              <button
                type="button"
                className={buttonClass("secondary", classes)}
                aria-disabled={answered || pending ? true : undefined}
                aria-describedby={describedBy}
                data-option={original}
                onClick={() => {
                  if (answered || pending) return;
                  onAnswer(original);
                }}
              >
                <span className={styles.letter}>{OPTION_LETTERS[displayIndex]}</span>{" "}
                <span lang={lang} className={styles.text}>
                  {question.options[original]}
                </span>
                {isCorrect ? (
                  <span aria-hidden="true" className={styles.glyph}>
                    ✓
                  </span>
                ) : isWrong ? (
                  <span aria-hidden="true" className={styles.glyph}>
                    ✗
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {failed ? <ErrorMessage id={ANSWER_ERROR_ID} text={t("err.generation")} /> : null}
      <p id={FEEDBACK_ID} aria-live="polite" className={styles.feedback}>
        {feedback}
      </p>
      {answered ? (
        <>
          <QuoteBlock quote={question.quote} lang={lang}>
            <SourceRef
              id={`ref-${question.id}-quote`}
              passageId={question.passageId}
              quote={question.quote}
              returnContext={returnContext}
            />
          </QuoteBlock>
          <div className={styles.actions}>
            <Button variant="primary" onClick={onNext}>
              {nextLabel}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
