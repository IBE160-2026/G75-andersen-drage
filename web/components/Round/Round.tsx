"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { updateMastery } from "../../core/mastery";
import { contentLang } from "../../core/overview";
import { isQuizAnswer, type MasteryState } from "../../core/round";
import { displayOrder, roundFlashcards, roundPosition, roundQuizQuestions } from "../../core/roundItems";
import { notePath, resultPath } from "../../core/routes";
import { format, t } from "../../i18n/messages";
import {
  recordFlashcardMark,
  recordQuizAnswer,
  type ConceptProgressRecord,
  type NoteRecord,
  type RoundRecord,
  type StudySetRecord,
} from "../../storage/db";
import { Flashcard } from "../Flashcard/Flashcard";
import { MasteryChip } from "../MasteryChip/MasteryChip";
import { QuizQuestion } from "../QuizQuestion/QuizQuestion";
import { Screen, ScreenHeading } from "../Screen/Screen";
import { StudyLayout } from "../StudyLayout/StudyLayout";
import styles from "./Round.module.css";

const ITEM_HEADING_ID = "round-item-heading";

/**
 * Round screen (Stories 2.1–2.3; UX-DR7, UX-DR8, UX-DR13–UX-DR15): rendered from the stored Round, never
 * recomposed. The progress line is the focused `h1` "Runde {n}" (": quiz" visually hidden in the Quiz
 * part) and the Item `h2` ("Kort {x} av {y}", or "Spørsmål {x} av {y}") set inline, then the 6 px
 * `aria-hidden` bar (filled per part: x / y) and the current concept's Mastery chip; a review Round shows
 * `round.review`. Below, in the Notatoversikt split / tabs (reset to 'Studier' per Item): the current
 * Flashcard or Quiz Question.
 *
 * The shown Item is local state (`shown`, an index into `itemIds`), not the answer count: an answered
 * Quiz Question stays on screen until `quiz.next`. It starts at the first unanswered Item. Focus moves to
 * the Item `h2` when the shown Item changes, never on an answer.
 *
 * A mark or an answer runs `updateMastery` and `recordFlashcardMark` / `recordQuizAnswer` (one
 * transaction); on success the stored Round and row replace the local ones. A mark shows the next Item
 * at once; an answer shows its feedback, and `quiz.next` the next question. When a mark completes the
 * Round (no Quiz Questions), the screen goes back to Notatoversikt; after the answer that completes it,
 * the control reads `quiz.result` and opens Resultat (Story 2.4).
 */
export function RoundScreen({
  note,
  studySet,
  round: initialRound,
  progress: initialProgress,
  wide,
}: {
  note: NoteRecord;
  studySet: StudySetRecord;
  round: RoundRecord;
  progress: readonly ConceptProgressRecord[];
  wide: boolean;
}) {
  const router = useRouter();
  const [round, setRound] = useState(initialRound);
  const [progress, setProgress] = useState(initialProgress);
  const [shown, setShown] = useState(initialRound.answers.length);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // The revealed card's Item ID: a new card starts on its front.
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const lastShown = useRef(shown);

  // Item change → focus the new Item's h2. On mount the h1 has focus (from Screen); comparing with the
  // last shown Item, not a first-run flag, keeps that true when Strict Mode runs the effect twice.
  useEffect(() => {
    if (lastShown.current === shown) return;
    lastShown.current = shown;
    document.getElementById(ITEM_HEADING_ID)?.focus();
  }, [shown]);

  const lang = contentLang(studySet.language);
  const n = String(round.number);
  const cards = roundFlashcards(round, studySet);
  const questions = roundQuizQuestions(round, studySet);
  const position = roundPosition(shown, cards.length, questions.length);
  const card = position.part === "cards" ? cards[position.index] : null;
  const question = position.part === "quiz" ? questions[position.index] : null;
  const conceptId = card?.conceptId ?? question?.conceptId ?? round.conceptIds[0];
  const state: MasteryState = progress.find((p) => p.keyConceptId === conceptId)?.state ?? "new";
  const conceptName = studySet.concepts.find((c) => c.id === conceptId)?.name ?? "";
  const itemId = card?.card.id ?? question?.question.id ?? "done";
  /** 1-based "x" of the shown "Kort/Spørsmål x av y". */
  const x = position.part === "done" ? 0 : position.index + 1;
  const fill = position.part === "done" ? 100 : (x / position.total) * 100;
  const quizPart = position.part === "quiz";
  const heading =
    position.part === "cards"
      ? format("round.item.card", { x: String(position.index + 1), y: String(position.total) })
      : position.part === "quiz"
        ? format("round.item.question", { x: String(position.index + 1), y: String(position.total) })
        : null;
  const stored = question ? round.answers.find((a) => a.itemId === question.question.id) : undefined;
  const choice = stored && isQuizAnswer(stored) ? stored.choice : null;

  function keep(next: RoundRecord, row: ConceptProgressRecord) {
    setRound(next);
    setProgress((rows) => [...rows.filter((p) => p.keyConceptId !== row.keyConceptId), row]);
  }

  async function mark(knew: boolean) {
    if (!card || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setFailed(false);
    const saved = await recordFlashcardMark({
      roundId: round.roundId,
      itemId: card.card.id,
      keyConceptId: card.conceptId,
      knew,
      state: updateMastery(state, knew ? "correct" : "wrong"),
      answeredAt: new Date().toISOString(),
    });
    if (saved.ok && saved.value.round.status === "complete") {
      // Stays pending while the screen leaves: the marks must not fire again during navigation.
      // Replace: a finished Round's URL must not stay in the history, so Back from Notatoversikt skips it.
      router.replace(notePath(note.noteHash));
      return;
    }
    pendingRef.current = false;
    setPending(false);
    if (!saved.ok) {
      setFailed(true);
      return;
    }
    keep(saved.value.round, saved.value.progress);
    setShown(saved.value.round.answers.length);
  }

  async function answer(original: number) {
    if (!question || choice !== null || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setFailed(false);
    const correct = original === question.question.correctIndex;
    const saved = await recordQuizAnswer({
      roundId: round.roundId,
      itemId: question.question.id,
      keyConceptId: question.conceptId,
      choice: original,
      state: updateMastery(state, correct ? "correct" : "wrong"),
      answeredAt: new Date().toISOString(),
    });
    pendingRef.current = false;
    setPending(false);
    if (!saved.ok) {
      setFailed(true);
      return;
    }
    // The question stays shown with its feedback; focus stays on the chosen option.
    keep(saved.value.round, saved.value.progress);
  }

  function next() {
    if (round.status === "complete") {
      // Replace: Back from Resultat goes to Notatoversikt, not to the Round URL (which replaces to Resultat).
      router.replace(resultPath(note.noteHash, round.roundId));
      return;
    }
    setFailed(false);
    setShown(round.answers.length);
  }

  return (
    <Screen title={{ key: quizPart ? "round.title.quiz" : "round.title", vars: { n } }} note={note.title}>
      <div className={styles.progress}>
        <ScreenHeading className={styles.h1}>
          {format("round.title", { n })}
          {quizPart ? <span className="visually-hidden">{t("round.h1.quiz")}</span> : null}
        </ScreenHeading>
        {heading ? (
          <>
            <span aria-hidden="true" className={styles.separator}>
              ·
            </span>
            <h2 id={ITEM_HEADING_ID} tabIndex={-1} className={styles.h2}>
              {heading}
            </h2>
          </>
        ) : null}
        <div className={styles.bar} aria-hidden="true">
          <div className={styles.fill} style={{ width: `${fill}%` }} />
        </div>
        <MasteryChip state={state} />
      </div>
      {round.review ? <p className={styles.review}>{t("round.review")}</p> : null}
      <StudyLayout
        key={itemId}
        note={note}
        lang={lang}
        wide={wide}
        study={
          card ? (
            <Flashcard
              key={card.card.id}
              card={card.card}
              conceptName={conceptName}
              position={x}
              headingId={ITEM_HEADING_ID}
              lang={lang}
              revealed={revealedId === card.card.id}
              onReveal={() => setRevealedId(card.card.id)}
              pending={pending}
              failed={failed}
              onMark={(knew) => void mark(knew)}
            />
          ) : question ? (
            <QuizQuestion
              key={question.question.id}
              question={question.question}
              conceptName={conceptName}
              position={x}
              headingId={ITEM_HEADING_ID}
              lang={lang}
              order={displayOrder(round.optionOrder[question.question.id], question.question.options.length)}
              choice={choice}
              pending={pending}
              failed={failed}
              onAnswer={(original) => void answer(original)}
              nextLabel={round.status === "complete" ? t("quiz.result") : t("quiz.next")}
              onNext={next}
            />
          ) : null
        }
      />
    </Screen>
  );
}
