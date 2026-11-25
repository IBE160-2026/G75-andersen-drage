"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uuidFromBytes } from "../../core/ids";
import { contentLang, hasCoveredConcept, sortConcepts } from "../../core/overview";
import { composeRound } from "../../core/round";
import { t } from "../../i18n/messages";
import { readConceptProgress, startRound, type NoteRecord, type StudySetRecord } from "../../storage/db";
import { Button } from "../Button/Button";
import { ErrorMessage } from "../ErrorMessage/ErrorMessage";
import { MasteryChip } from "../MasteryChip/MasteryChip";
import { QuoteBlock } from "../QuoteBlock/QuoteBlock";
import { SourceRef, type ReturnContext } from "../ReferenceJump/ReferenceJump";
import { Screen, ScreenHeading } from "../Screen/Screen";
import { StudyLayout } from "../StudyLayout/StudyLayout";
import styles from "./NoteOverview.module.css";

const START_HINT_ID = "start-hint";
const START_ERROR_ID = "start-error";
const NO_CONCEPTS_ID = "no-concepts-error";

/** The Round screen's route; Note keys keep their `demo:` prefix, as on `/notat/{noteHash}`. */
export function roundPath(noteHash: string, roundId: string): string {
  return `/notat/${noteHash}/runde/${roundId}`;
}

/** `crypto.randomUUID()`, which exists only in a secure context; elsewhere a v4 UUID from getRandomValues. */
function newRoundId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return uuidFromBytes(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * Notatoversikt (FR-6, FR-12, UX-DR6–9): summary, Key Concepts and 'Start runde' in the study panel,
 * in the shared StudyLayout (split from 768 px, tabs below). Generated content carries `lang` from
 * `StudySet.language`. Story 2.1: 'Start runde' reads the progress rows, composes the Round in core/
 * (Round ID and time from here) and stores it in one transaction, then opens the Round screen. While it
 * runs the button is pending; a failure keeps the student here with `err.generation` inline.
 */
export function NoteOverview({
  note,
  studySet,
  wide,
  onRetry,
}: {
  note: NoteRecord;
  studySet: StudySetRecord;
  wide: boolean;
  /** 'Prøv igjen' after `err.noConcepts`. */
  onRetry: () => void;
}) {
  const router = useRouter();
  const lang = contentLang(studySet.language);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // A second press before the pending state has rendered must not start a second Round.
  const starting = useRef(false);

  async function start() {
    if (starting.current) return;
    starting.current = true;
    setPending(true);
    setFailed(false);
    const roundId = await begin();
    if (roundId) {
      // Stays pending until the Round screen replaces this one.
      router.push(roundPath(note.noteHash, roundId));
      return;
    }
    starting.current = false;
    setPending(false);
    setFailed(true);
  }

  /** The new Round's ID, or null when it could not be stored. Never throws. */
  async function begin(): Promise<string | null> {
    try {
      const progress = await readConceptProgress(note.noteHash);
      if (!progress.ok) return null;
      const composition = composeRound({
        roundId: newRoundId(),
        noteHash: note.noteHash,
        cacheKey: studySet.cacheKey,
        now: new Date().toISOString(),
        random: Math.random,
        concepts: studySet.concepts,
        progress: progress.value,
      });
      if (!composition) return null;
      const saved = await startRound(composition);
      return saved.ok ? saved.value.roundId : null;
    } catch {
      return null;
    }
  }

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
  lang,
  onRetry,
  onStart,
  pending,
  failed,
}: {
  studySet: StudySetRecord;
  lang: string;
  onRetry: () => void;
  onStart: () => void;
  pending: boolean;
  failed: boolean;
}) {
  const concepts = sortConcepts(studySet.concepts);
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
              {/* Chips from conceptProgress arrive in Story 2.4. */}
              {concept.covered ? (
                <MasteryChip state="new" />
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
