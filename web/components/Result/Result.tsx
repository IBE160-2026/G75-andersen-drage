"use client";

import { useRouter } from "next/navigation";
import { contentLang } from "../../core/overview";
import { quizChoices, score } from "../../core/score";
import type { VerifiedQuizQuestion } from "../../core/types";
import { format, t } from "../../i18n/messages";
import type { NoteRecord, RoundRecord, StudySetRecord } from "../../storage/db";
import { Button } from "../Button/Button";
import { notePath } from "../NoteOverview/NoteOverview";
import { QuoteBlock } from "../QuoteBlock/QuoteBlock";
import { displayOrder, OPTION_LETTERS } from "../QuizQuestion/QuizQuestion";
import { SourceRef, type ReturnContext } from "../ReferenceJump/ReferenceJump";
import { itemsResolve, roundQuizQuestions } from "../Round/Round";
import { Screen, ScreenHeading } from "../Screen/Screen";
import { StudyLayout } from "../StudyLayout/StudyLayout";
import styles from "./Result.module.css";

/**
 * True when the Round can show Resultat (Story 2.4): it belongs to `noteHash`, is `complete`, every Item
 * is still in the Study Set it was composed from, and it has at least one Quiz Question. A Round without
 * Quiz Questions has no Resultat (its last mark returns to Notatoversikt).
 */
export function resultReady(
  round: Pick<RoundRecord, "noteHash" | "status" | "itemIds">,
  noteHash: string,
  studySet: Pick<StudySetRecord, "concepts">,
): boolean {
  return (
    round.noteHash === noteHash &&
    round.status === "complete" &&
    itemsResolve(round, studySet) &&
    roundQuizQuestions(round, studySet).length > 0
  );
}

/** The score paragraph: the focused h1 "Resultat" is described by it, so the score is read on arrival. */
const SCORE_ID = "result-score";

/** Resultat references return to the result (UX-DR11). */
function resultReturn(): ReturnContext {
  return { from: t("return.from.result"), action: t("return.result") };
}

/**
 * Resultat (FR-12, FR-14, UX-DR11, UX-DR17, UX-DR19; DESIGN.md › Resultat row, mockups/key-result.html).
 * Rendered from the stored, complete Round only: nothing is written here. The focused `h1` "Resultat" and
 * the score paragraph `result.score` ("{n} av {m} riktige", from core/score) sit above the Notatoversikt
 * split / tabs; the study panel holds the primary 'Tilbake til oversikten', then one row per Quiz Question
 * in Round order. Each row is a `section` labelled by its `h2` "Spørsmål {x}": the question (serif),
 * "Ditt svar:" with ✓ or ✗, on a miss "Rett svar:" with ✓ (letters per the stored `optionOrder`, marks
 * `aria-hidden`), then the Quote block with its "Kilde: Pn" (return context "Viser Pn fra resultatet").
 */
export function ResultScreen({
  note,
  studySet,
  round,
  wide,
}: {
  note: NoteRecord;
  studySet: StudySetRecord;
  round: RoundRecord;
  wide: boolean;
}) {
  const router = useRouter();
  const lang = contentLang(studySet.language);
  const questions = roundQuizQuestions(round, studySet);
  const { correct, total } = score(
    round.answers,
    questions.map(({ question }) => question),
  );
  const choices = quizChoices(round.answers);

  return (
    <Screen title="result.title" note={note.title}>
      <ScreenHeading describedBy={SCORE_ID}>{t("result.title")}</ScreenHeading>
      <p id={SCORE_ID} className={styles.score}>{format("result.score", { n: String(correct), m: String(total) })}</p>
      <StudyLayout
        note={note}
        lang={lang}
        wide={wide}
        study={
          <div className={styles.panel}>
            <div className={styles.actions}>
              <Button variant="primary" onClick={() => router.push(notePath(note.noteHash))}>
                {t("result.back")}
              </Button>
            </div>
            {questions.map(({ question }, i) => (
              <ResultRow
                key={question.id}
                question={question}
                x={i + 1}
                order={displayOrder(round.optionOrder[question.id], question.options.length)}
                choice={choices.get(question.id) ?? null}
                lang={lang}
              />
            ))}
          </div>
        }
      />
    </Screen>
  );
}

function ResultRow({
  question,
  x,
  order,
  choice,
  lang,
}: {
  question: VerifiedQuizQuestion;
  /** 1-based position among the Round's Quiz Questions. */
  x: number;
  /** Original option indices in display order (the stored `optionOrder`). */
  order: readonly number[];
  /** The stored answer's original option index; null when unanswered (counted as wrong). */
  choice: number | null;
  lang: string;
}) {
  const headingId = `result-row-${x}`;
  const right = choice === question.correctIndex;
  return (
    <section aria-labelledby={headingId} className={styles.row}>
      <h2 id={headingId} className={styles.h2}>
        {format("result.row", { x: String(x) })}
      </h2>
      <p lang={lang} className={styles.question}>
        {question.question}
      </p>
      <p className={styles.answer}>
        <span aria-hidden="true" className={right ? styles.markCorrect : styles.markWrong}>
          {right ? "✓" : "✗"}
        </span>{" "}
        {t("result.yours")} <Option order={order} original={choice} options={question.options} lang={lang} />
      </p>
      {right ? null : (
        <p className={styles.answer}>
          <span aria-hidden="true" className={styles.markCorrect}>
            ✓
          </span>{" "}
          {t("result.correct")}{" "}
          <Option order={order} original={question.correctIndex} options={question.options} lang={lang} />
        </p>
      )}
      <QuoteBlock quote={question.quote} lang={lang}>
        <SourceRef
          id={`ref-${question.id}`}
          passageId={question.passageId}
          quote={question.quote}
          returnContext={resultReturn()}
        />
      </QuoteBlock>
    </section>
  );
}

/** "{letter}. {option}", the letter from the display order; nothing for an unanswered question. */
function Option({
  order,
  original,
  options,
  lang,
}: {
  order: readonly number[];
  original: number | null;
  options: readonly string[];
  lang: string;
}) {
  if (original === null || options[original] === undefined) return null;
  const letter = OPTION_LETTERS[order.indexOf(original)];
  return (
    <>
      {letter ? `${letter}. ` : null}
      <span lang={lang}>{options[original]}</span>
    </>
  );
}
