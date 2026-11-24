"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { requestStudySet } from "../../api/studySet";
import { buildNoteRecord } from "../../core/noteRecord";
import type { ExtractedNote } from "../../core/types";
import { verifyStudySet } from "../../core/verifyStudySet";
import { fileType } from "../../extract/types";
import { t } from "../../i18n/messages";
import { saveGeneratedNote } from "../../storage/db";
import { useAppSettings } from "../AppSettings/AppSettings";
import { Button } from "../Button/Button";
import { ConsentDeclinedText } from "../ConsentNotice/ConsentNotice";
import { useBlockWindowDrop } from "../DropZone/DropZone";
import { ErrorMessage } from "../ErrorMessage/ErrorMessage";
import { Screen, ScreenHeading } from "../Screen/Screen";
import styles from "./Generating.module.css";

const ERROR_ID = "generation-error";
/** Time-based progress (one POST has no real progress, D-11): 0 → 90 over the first 60 s, then held. */
const PROGRESS_CAP = 90;
const PROGRESS_SPAN_MS = 60_000;
const PROGRESS_TICK_MS = 500;
/** `gen.status.cards` replaces `gen.status.concepts` after 15 s; `gen.status.sources` when the answer arrives. */
const CARDS_STEP_MS = 15_000;

type Step = "gen.status.concepts" | "gen.status.cards" | "gen.status.sources";
/** What the failure view shows. `consent.declined` only if Consent was withdrawn (another tab) after Start. */
export type FailureCode = "err.generation" | "err.tooFewItems" | "err.noKey" | "consent.declined";

/** 'Prøv igjen' only where a fresh request can help; no key or no Consent needs the student to act first. */
export function canRetry(code: FailureCode): boolean {
  return code === "err.generation" || code === "err.tooFewItems";
}

export function progressAt(elapsedMs: number): number {
  return Math.min(PROGRESS_CAP, Math.round((elapsedMs / PROGRESS_SPAN_MS) * PROGRESS_CAP));
}

/**
 * Genererer (FR-11, UX-DR26). Rendered on `/` in place of the Start content, so the URL does not change.
 * On mount: one live POST (api/), then verifyStudySet, then the Note and its Study Set in one
 * transaction, then Notatoversikt. Unmounting aborts the request; an answer arriving after unmount is
 * discarded before storage. A save already under way completes, and only the navigation is skipped.
 * Any failure stores nothing and shows its message, focused, with 'Prøv igjen' (where it can help) and
 * 'Tilbake til start' (Story 1.10). 'Prøv igjen' bumps `attempt`, which restarts the run in this same
 * instance with a fresh POST; nothing ever retries on its own.
 */
export function Generating({
  note,
  noteHash,
  meta,
  onBack,
}: {
  note: ExtractedNote;
  noteHash: string;
  /** The `note.meta` line from Start. */
  meta: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const { status } = useAppSettings();
  const [step, setStep] = useState<Step>("gen.status.concepts");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<FailureCode | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Ignores a second 'Prøv igjen' press that arrives before the progress view replaces the button.
  const retryingRef = useRef(false);
  // Captured at mount: the Start page ran the gate with this status, and api/ runs it again.
  const start = useRef({ note, noteHash, status, router });
  useBlockWindowDrop();

  useEffect(() => {
    retryingRef.current = false;
    const { note, noteHash, status, router } = start.current;
    const controller = new AbortController();
    const { signal } = controller;
    const startedAt = Date.now();
    const tick = setInterval(() => setProgress(progressAt(Date.now() - startedAt)), PROGRESS_TICK_MS);
    const cards = setTimeout(() => setStep("gen.status.cards"), CARDS_STEP_MS);
    const stop = () => {
      clearInterval(tick);
      clearTimeout(cards);
    };
    const fail = (code: FailureCode) => {
      stop();
      setError(code);
    };

    void (async () => {
      const result = await requestStudySet({ noteHash, passages: note.passages, status, signal });
      if (signal.aborted) return;
      if (!result.ok) return fail(result.code);
      clearTimeout(cards);
      setStep("gen.status.sources");
      const verified = verifyStudySet(result.studySet, note.passages);
      const sourceType = fileType(note.fileName);
      if (!verified.ok) return fail(verified.code);
      if (!sourceType) return fail("err.generation");
      const record = buildNoteRecord({ ...note, sourceType }, noteHash, verified.set);
      const saved = await saveGeneratedNote(record, verified.set);
      if (signal.aborted) return;
      if (!saved.ok) return fail("err.generation");
      stop();
      setProgress(100);
      router.push(`/notat/${noteHash}`);
    })();

    return () => {
      stop();
      controller.abort();
    };
  }, [attempt]);

  useEffect(() => {
    if (error) document.getElementById(ERROR_ID)?.focus();
    // After 'Prøv igjen' the focused button is gone; focus the screen h1 instead of losing it to body.
    else if (attempt > 0) document.querySelector<HTMLElement>("main h1")?.focus();
  }, [error, attempt]);

  function retry() {
    if (retryingRef.current) return;
    retryingRef.current = true;
    setProgress(0);
    setStep("gen.status.concepts");
    setError(null);
    setAttempt((n) => n + 1);
  }

  return (
    <Screen title="title.generating" note={note.fileName}>
      <ScreenHeading>{t("title.generating")}</ScreenHeading>
      {error ? (
        <>
          <p className={styles.meta}>{meta}</p>
          <ErrorMessage
            key={attempt}
            id={ERROR_ID}
            text={error === "consent.declined" ? <ConsentDeclinedText /> : t(error)}
            actions={
              <>
                {canRetry(error) ? (
                  <Button variant="primary" onClick={retry}>
                    {t("gen.retry")}
                  </Button>
                ) : null}
                <Button onClick={onBack}>{t("gen.back")}</Button>
              </>
            }
          />
        </>
      ) : (
        <>
          <progress className={styles.progress} max={100} value={progress} aria-label={t("gen.progress")} />
          <p role="status" className={styles.status}>
            {t(step)}
          </p>
          <p className={styles.meta}>{meta}</p>
        </>
      )}
    </Screen>
  );
}
