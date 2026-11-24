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

export function progressAt(elapsedMs: number): number {
  return Math.min(PROGRESS_CAP, Math.round((elapsedMs / PROGRESS_SPAN_MS) * PROGRESS_CAP));
}

/**
 * Genererer (FR-11, UX-DR26). Rendered on `/` in place of the Start content, so the URL does not change.
 * On mount: one live POST (api/), then verifyStudySet, then the Note and its Study Set in one
 * transaction, then Notatoversikt. Unmounting aborts the request; an answer arriving after unmount is
 * discarded before storage. A save already under way completes, and only the navigation is skipped.
 * Any failure shows `err.generation` (Story 1.10 adds 'Prøv igjen' and the detailed texts).
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
  const [failed, setFailed] = useState(false);
  // Captured at mount: the Start page ran the gate with this status, and api/ runs it again.
  const start = useRef({ note, noteHash, status, router });
  useBlockWindowDrop();

  useEffect(() => {
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
    const fail = () => {
      stop();
      setFailed(true);
    };

    void (async () => {
      const result = await requestStudySet({ noteHash, passages: note.passages, status, signal });
      if (signal.aborted) return;
      if (!result.ok) return fail();
      clearTimeout(cards);
      setStep("gen.status.sources");
      const verified = verifyStudySet(result.studySet, note.passages);
      const sourceType = fileType(note.fileName);
      if (!verified.ok || !sourceType) return fail();
      const record = buildNoteRecord({ ...note, sourceType }, noteHash, verified.set);
      const saved = await saveGeneratedNote(record, verified.set);
      if (signal.aborted) return;
      if (!saved.ok) return fail();
      stop();
      setProgress(100);
      router.push(`/notat/${noteHash}`);
    })();

    return () => {
      stop();
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (failed) document.getElementById(ERROR_ID)?.focus();
  }, [failed]);

  return (
    <Screen title="title.generating" note={note.fileName}>
      <ScreenHeading>{t("title.generating")}</ScreenHeading>
      {failed ? (
        <>
          <p className={styles.meta}>{meta}</p>
          <ErrorMessage
            id={ERROR_ID}
            text={t("err.generation")}
            actions={<Button onClick={onBack}>{t("gen.back")}</Button>}
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
