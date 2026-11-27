"use client";

import { contentLang, hasCoveredConcept, sortConcepts } from "../../core/overview";
import type { MasteryState } from "../../core/round";
import { t } from "../../i18n/messages";
import type { ConceptProgressRecord, NoteRecord, StudySetRecord } from "../../storage/db";
import { Button } from "../Button/Button";
import { ErrorMessage } from "../ErrorMessage/ErrorMessage";
import { MasteryChip } from "../MasteryChip/MasteryChip";
import { QuoteBlock } from "../QuoteBlock/QuoteBlock";
import { SourceRef, type ReturnContext } from "../ReferenceJump/ReferenceJump";
import { useStartRound } from "../Round/useStartRound";
import { Screen, ScreenHeading } from "../Screen/Screen";
import { StudyLayout } from "../StudyLayout/StudyLayout";
import styles from "./NoteOverview.module.css";

const START_HINT_ID = "start-hint";
const START_ERROR_ID = "start-error";
const NO_CONCEPTS_ID = "no-concepts-error";

/** Notatoversikt's route; Note keys keep their `demo:` prefix. */
export function notePath(noteHash: string): string {
  return `/notat/${noteHash}`;
}

/** The Round screen's route; Note keys keep their `demo:` prefix, as on `/notat/{noteHash}`. */
export function roundPath(noteHash: string, roundId: string): string {
  return `${notePath(noteHash)}/runde/${roundId}`;
}

/** Resultat's route (Story 2.4): the complete Round's route + `/resultat`. */
export function resultPath(noteHash: string, roundId: string): string {
  return `${roundPath(noteHash, roundId)}/resultat`;
}

/**
 * Notatoversikt (FR-6, FR-12, UX-DR6–9): summary, Key Concepts and 'Start runde' in the study panel,
 * in the shared StudyLayout (split from 768 px, tabs below). Generated content carries `lang` from
 * `StudySet.language`. Story 2.1: 'Start runde' reads the progress rows, composes the Round in core/
 * (Round ID and time from here) and stores it in one transaction, then opens the Round screen. While it
 * runs the button is pending; a failure keeps the student here with `err.generation` inline.
 * Story 2.5: that path is `useStartRound`, shared with Resultat's 'Ny runde'.
 * Story 2.4: each covered concept's Mastery chip shows its stored state from `progress` (no row → 'ny').
 */
export function NoteOverview({
  note,
  studySet,
  progress,
  wide,
  onRetry,
}: {
  note: NoteRecord;
  studySet: StudySetRecord;
  /** The Note's `conceptProgress` rows; empty when the read failed (every chip then reads 'ny'). */
  progress: readonly Pick<ConceptProgressRecord, "keyConceptId" | "state">[];
  wide: boolean;
  /** 'Prøv igjen' after `err.noConcepts`. */
  onRetry: () => void;
}) {
  const lang = contentLang(studySet.language);
  const { start, pending, failed } = useStartRound(note, studySet);

  return (
    <Screen note={note.title}>
      <ScreenHeading>{note.title}</ScreenHeading>
      <StudyLayout
        note={note}
        lang={lang}
        wide={wide}
        study={
          <StudyPanel
            studySet={studySet}
            progress={progress}
            lang={lang}
            onRetry={onRetry}
            onStart={() => void start()}
            pending={pending}
            failed={failed}
          />
        }
      />
    </Screen>
  );
}

/** Summary Point references return to the summary (decided by Tor 2026-11-24). */
function summaryReturn(): ReturnContext {
  return { from: t("return.from.summary"), action: t("return.summary") };
}

function StudyPanel({
  studySet,
  progress,
  lang,
  onRetry,
  onStart,
  pending,
  failed,
}: {
  studySet: StudySetRecord;
  progress: readonly Pick<ConceptProgressRecord, "keyConceptId" | "state">[];
  lang: string;
  onRetry: () => void;
  onStart: () => void;
  pending: boolean;
  failed: boolean;
}) {
  const concepts = sortConcepts(studySet.concepts);
  const states = new Map<string, MasteryState>(progress.map((p) => [p.keyConceptId, p.state]));
  return (
    <div className={styles.studyPanel}>
      <section className={styles.section} aria-labelledby="overview-summary">
        <h2 id="overview-summary" className={styles.h2}>
          {t("overview.summary")}
        </h2>
        <ul className={styles.points}>
          {studySet.summaryPoints.map((point) => (
            <li key={point.id} className={styles.point}>
              <p lang={lang}>{point.text}</p>
              <QuoteBlock quote={point.quote} lang={lang}>
                <SourceRef
                  id={`ref-${point.id}`}
                  passageId={point.passageId}
                  quote={point.quote}
                  returnContext={summaryReturn()}
                />
              </QuoteBlock>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="overview-concepts">
        <h2 id="overview-concepts" className={styles.h2}>
          {t("overview.concepts")}
        </h2>
        <ul className={styles.concepts}>
          {concepts.map((concept) => (
            <li key={concept.id} className={styles.concept}>
              <span lang={lang}>{concept.name}</span>
              {concept.covered ? (
                <MasteryChip state={states.get(concept.id) ?? "new"} />
              ) : (
                <span className={styles.notCovered}>{t("overview.notCovered")}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {hasCoveredConcept(studySet.concepts) ? (
        <div className={styles.start}>
          <Button
            variant="primary"
            pending={pending}
            aria-describedby={failed ? `${START_HINT_ID} ${START_ERROR_ID}` : START_HINT_ID}
            onClick={onStart}
          >
            {t("overview.start")}
          </Button>
          <p id={START_HINT_ID} className={styles.hint}>
            {t("overview.start.hint")}
          </p>
          {failed ? <ErrorMessage id={START_ERROR_ID} text={t("err.generation")} /> : null}
        </div>
      ) : (
        <ErrorMessage
          id={NO_CONCEPTS_ID}
          text={t("err.noConcepts")}
          actions={
            <Button variant="primary" onClick={onRetry}>
              {t("gen.retry")}
            </Button>
          }
        />
      )}
    </div>
  );
}
