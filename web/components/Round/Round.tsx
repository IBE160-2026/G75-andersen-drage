"use client";

import { contentLang, passageLabel } from "../../core/overview";
import type { MasteryState } from "../../core/round";
import type { VerifiedFlashcard } from "../../core/types";
import { format, t } from "../../i18n/messages";
import type { ConceptProgressRecord, NoteRecord, RoundRecord, StudySetRecord } from "../../storage/db";
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

/** True when every Item ID of the Round is in the Study Set (otherwise the set has changed or gone). */
export function itemsResolve(round: Pick<RoundRecord, "itemIds">, studySet: Pick<StudySetRecord, "concepts">): boolean {
  const ids = new Set(studySet.concepts.flatMap((c) => [...c.flashcards, ...c.quizQuestions].map((item) => item.id)));
  return round.itemIds.every((id) => ids.has(id));
}

/**
 * Round screen shell (Story 2.1, UX-DR7, UX-DR8, UX-DR15): rendered only from the stored Round, never
 * recomposed. The progress line is the focused `h1` "Runde {n}" and the Item `h2` "Kort {x} av {y}" set
 * inline, then the 6 px `aria-hidden` bar and the current concept's Mastery chip; a review Round shows
 * `round.review`. Below, in the Notatoversikt split / tabs: the current Flashcard front (question and
 * "Kilde: Pn" as plain text). Reveal and marks arrive in Story 2.2, the Quiz in 2.3.
 */
export function RoundScreen({
  note,
  studySet,
  round,
  progress,
  wide,
}: {
  note: NoteRecord;
  studySet: StudySetRecord;
  round: RoundRecord;
  progress: readonly ConceptProgressRecord[];
  wide: boolean;
}) {
  const lang = contentLang(studySet.language);
  const n = String(round.number);
  const cards = roundFlashcards(round, studySet);
  const index = Math.min(round.answers.length, cards.length - 1);
  const current = index >= 0 ? cards[index] : null;
  const conceptId = current?.conceptId ?? round.conceptIds[0];
  const state: MasteryState = progress.find((p) => p.keyConceptId === conceptId)?.state ?? "new";
  const fill = cards.length > 0 ? ((index + 1) / cards.length) * 100 : 0;

  return (
    <Screen title={{ key: "round.title", vars: { n } }} note={note.title}>
      <div className={styles.progress}>
        <ScreenHeading className={styles.h1}>{format("round.title", { n })}</ScreenHeading>
        {current ? (
          <>
            <span aria-hidden="true" className={styles.separator}>
              ·
            </span>
            <h2 id={ITEM_HEADING_ID} tabIndex={-1} className={styles.h2}>
              {format("round.item.card", { x: String(index + 1), y: String(cards.length) })}
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
        note={note}
        lang={lang}
        wide={wide}
        study={
          current ? (
            <section aria-labelledby={ITEM_HEADING_ID} className={styles.card}>
              <p lang={lang} className={styles.front}>
                {current.card.front}
              </p>
              <p className={styles.ref}>{format("source.ref", { id: passageLabel(current.card.passageId) })}</p>
            </section>
          ) : null
        }
      />
    </Screen>
  );
}
