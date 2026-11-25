"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { updateMastery } from "../../core/mastery";
import { contentLang, passageLabel } from "../../core/overview";
import type { MasteryState } from "../../core/round";
import type { VerifiedFlashcard, VerifiedQuizQuestion } from "../../core/types";
import { format, t } from "../../i18n/messages";
import {
  recordFlashcardMark,
  type ConceptProgressRecord,
  type NoteRecord,
  type RoundRecord,
  type StudySetRecord,
} from "../../storage/db";
import { Flashcard } from "../Flashcard/Flashcard";
import { MasteryChip } from "../MasteryChip/MasteryChip";
import { Screen, ScreenHeading } from "../Screen/Screen";
import { StudyLayout } from "../StudyLayout/StudyLayout";
import styles from "./Round.module.css";

const ITEM_HEADING_ID = "round-item-heading";

/** The Round's Flashcards in Item order, each with its concept. Unknown Item IDs are left out. */
export function roundFlashcards(
  round: Pick<RoundRecord, "itemIds">,
  studySet: Pick<StudySetRecord, "concepts">,
): { card: VerifiedFlashcard; conceptId: string }[] {
  const byId = new Map(
    studySet.concepts.flatMap((concept) => concept.flashcards.map((card) => [card.id, { card, conceptId: concept.id }] as const)),
  );
  return round.itemIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
}

/** The Round's Quiz Questions in Item order, each with its concept. Unknown Item IDs are left out. */
export function roundQuizQuestions(
  round: Pick<RoundRecord, "itemIds">,
  studySet: Pick<StudySetRecord, "concepts">,
): { question: VerifiedQuizQuestion; conceptId: string }[] {
  const byId = new Map(
    studySet.concepts.flatMap((concept) =>
      concept.quizQuestions.map((question) => [question.id, { question, conceptId: concept.id }] as const),
    ),
  );
  return round.itemIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
}

/**
 * Where the Round stands: the Flashcard part (`index` into the cards) until every card is answered, then
 * the Quiz part (`index` into the Quiz Questions). Answers are stored in Item order, Flashcards first.
 * `done` when every Item is answered.
 */
export type RoundPosition =
  | { part: "cards"; index: number; total: number }
  | { part: "quiz"; index: number; total: number }
  | { part: "done" };

export function roundPosition(answered: number, cards: number, questions: number): RoundPosition {
  if (answered < cards) return { part: "cards", index: answered, total: cards };
  if (answered - cards < questions) return { part: "quiz", index: answered - cards, total: questions };
  return { part: "done" };
}

/** True when every Item ID of the Round is in the Study Set (otherwise the set has changed or gone). */
export function itemsResolve(round: Pick<RoundRecord, "itemIds">, studySet: Pick<StudySetRecord, "concepts">): boolean {
  const ids = new Set(studySet.concepts.flatMap((c) => [...c.flashcards, ...c.quizQuestions].map((item) => item.id)));
  return round.itemIds.every((id) => ids.has(id));
}

/**
 * Round screen (Stories 2.1, 2.2; UX-DR7, UX-DR8, UX-DR13, UX-DR15): rendered from the stored Round, never
 * recomposed. The progress line is the focused `h1` "Runde {n}" and the Item `h2` ("Kort {x} av {y}", or
 * "Spørsmål {x} av {y}" in the Quiz part) set inline, then the 6 px `aria-hidden` bar and the current
 * concept's Mastery chip; a review Round shows `round.review`. Below, in the Notatoversikt split / tabs
 * (reset to 'Studier' per Item): the current Flashcard, or after the last card the Quiz part's shell (the
 * first unanswered stem as plain text; options arrive in Story 2.3).
 *
 * A mark runs `updateMastery` and `recordFlashcardMark` (one transaction); on success the stored Round
 * and row replace the local ones, the next Item shows and focus moves to its `h2`. When the mark
 * completes the Round (no Quiz Questions), the screen goes back to Notatoversikt (Resultat is Story 2.4).
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
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // The revealed card's Item ID: a new card starts on its front.
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const answered = round.answers.length;
  const shownAnswered = useRef(answered);

  // Item change → focus the new Item's h2. On mount the h1 has focus (from Screen); comparing with the
  // last count, not a first-run flag, keeps that true when Strict Mode runs the effect twice.
  useEffect(() => {
    if (shownAnswered.current === answered) return;
    shownAnswered.current = answered;
    document.getElementById(ITEM_HEADING_ID)?.focus();
  }, [answered]);

  const lang = contentLang(studySet.language);
  const n = String(round.number);
  const cards = roundFlashcards(round, studySet);
  const questions = roundQuizQuestions(round, studySet);
  const position = roundPosition(answered, cards.length, questions.length);
  const card = position.part === "cards" ? cards[position.index] : null;
  const question = position.part === "quiz" ? questions[position.index] : null;
  const conceptId = card?.conceptId ?? question?.conceptId ?? round.conceptIds[0];
  const state: MasteryState = progress.find((p) => p.keyConceptId === conceptId)?.state ?? "new";
  const conceptName = studySet.concepts.find((c) => c.id === conceptId)?.name ?? "";
  const itemId = card?.card.id ?? question?.question.id ?? "done";
  const fill = position.part === "done" ? 100 : ((position.index + 1) / position.total) * 100;
  const heading =
    position.part === "cards"
      ? format("round.item.card", { x: String(position.index + 1), y: String(position.total) })
      : position.part === "quiz"
        ? format("round.item.question", { x: String(position.index + 1), y: String(position.total) })
        : null;

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
      router.push(`/notat/${note.noteHash}`);
      return;
    }
    pendingRef.current = false;
    setPending(false);
    if (!saved.ok) {
      setFailed(true);
      return;
    }
    const { round: stored, progress: row } = saved.value;
    setRound(stored);
    setProgress((rows) => [...rows.filter((p) => p.keyConceptId !== row.keyConceptId), row]);
  }

  return (
    <Screen title={{ key: "round.title", vars: { n } }} note={note.title}>
      <div className={styles.progress}>
        <ScreenHeading className={styles.h1}>{format("round.title", { n })}</ScreenHeading>
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
              position={answered + 1}
              headingId={ITEM_HEADING_ID}
              lang={lang}
              revealed={revealedId === card.card.id}
              onReveal={() => setRevealedId(card.card.id)}
              pending={pending}
              failed={failed}
              onMark={(knew) => void mark(knew)}
            />
          ) : question ? (
            <section aria-labelledby={ITEM_HEADING_ID} className={styles.card}>
              <p lang={lang} className={styles.stem}>
                {question.question.question}
              </p>
              <p className={styles.ref}>{format("source.ref", { id: passageLabel(question.question.passageId) })}</p>
            </section>
          ) : null
        }
      />
    </Screen>
  );
}
