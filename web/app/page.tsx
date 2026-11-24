"use client";

import { useEffect, useRef, useState } from "react";
import { checkSendGate, type StudySetErrorCode } from "../api/studySet";
import { DEMO_PATH, useAppSettings } from "../components/AppSettings/AppSettings";
import { ButtonLink } from "../components/Button/Button";
import { ConsentDeclinedText, ConsentNotice } from "../components/ConsentNotice/ConsentNotice";
import { DropZone } from "../components/DropZone/DropZone";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage/ErrorMessage";
import { Generating } from "../components/Generating/Generating";
import { Screen } from "../components/Screen/Screen";
import type { ExtractedNote } from "../core/types";
import { checkFile, extractInWorker } from "../extract/client";
import type { ExtractErrorKey } from "../extract/text";
import { format, t } from "../i18n/messages";
import styles from "./page.module.css";

const INPUT_ID = "note-file";
const ERROR_ID = "note-file-error";

type Extracted = { meta: string; noteHash: string; encodingFallback: boolean; note: ExtractedNote };
type GateCode = Exclude<StudySetErrorCode, "err.generation">;
/** `field` errors are about the file itself and mark the input invalid; gate errors do not (the file is fine). */
type StartError = { key: ExtractErrorKey; field: true; seq: number } | { key: GateCode; field: false; seq: number };

const number = new Intl.NumberFormat("nb-NO");

// Start — 'Dine notater'. Stored Notes are not listed yet, so this is still the empty state.
// A file is checked (type, size) on the main thread, then extracted in a Web Worker (Story 1.4).
// Story 1.9: after a successful extraction the send gate runs (AD-20). If it blocks, its code is shown
// inline at the drop zone and the Note meta stays; if it passes, Genererer replaces the Start content.
// After declining Consent, consent.declined is shown with a link that reopens the dialog.
// Story 1.14: 'Prøv demomodus' links to Demovelger. In Demo Mode an own file passes FR-3 and the gate,
// and the Proxy's 404 comes back through Genererer's `onRejected` as `err.demoOnly`, inline at the drop zone.
export default function StartPage() {
  const { status, settings } = useAppSettings();
  // onFile awaits extraction; the gate must see the status as it is then, not as it was at the drop.
  const statusRef = useRef(status);
  statusRef.current = status;
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // `seq` remounts the alert for every rejection, so a repeated error is announced and focused again.
  const [error, setError] = useState<StartError | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [generating, setGenerating] = useState<Extracted | null>(null);

  useEffect(() => {
    if (error) document.getElementById(ERROR_ID)?.focus();
  }, [error]);

  // Accepting via the inline 'godta nå' link resolves that gate error; the next file goes through.
  useEffect(() => {
    if (settings.consent === "accepted") setError((prev) => (prev?.key === "consent.declined" ? null : prev));
  }, [settings.consent]);

  function reject(key: ExtractErrorKey) {
    setError((prev) => ({ key, field: true, seq: (prev?.seq ?? 0) + 1 }));
  }

  function block(key: GateCode) {
    setError((prev) => ({ key, field: false, seq: (prev?.seq ?? 0) + 1 }));
  }

  async function onFile(file: File) {
    if (busyRef.current) return;
    setExtracted(null);
    const problem = checkFile(file);
    if (problem) {
      reject(problem);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    const result = await extractInWorker(file);
    busyRef.current = false;
    setBusy(false);
    if (!result.ok) {
      reject(result.error);
      return;
    }
    const { note } = result;
    const next: Extracted = {
      meta: format("note.meta", {
        filnavn: note.fileName,
        ord: number.format(note.wordCount),
        avsnitt: number.format(note.passages.length),
      }),
      noteHash: result.noteHash,
      encodingFallback: note.encodingFallback,
      note,
    };
    setExtracted(next);
    const gate = checkSendGate(statusRef.current);
    if (!gate.ok) {
      block(gate.code);
      return;
    }
    setError(null);
    // The drop zone is gone while Genererer shows; busyRef keeps a late pick or drop from starting another.
    busyRef.current = true;
    setGenerating(next);
  }

  /** The file was fine, but Demo Mode only serves the sample notes: back to Start, meta kept, error inline. */
  function rejectedInDemo(code: "err.demoOnly") {
    busyRef.current = false;
    setGenerating(null);
    block(code);
  }

  function backToStart() {
    busyRef.current = false;
    setGenerating(null);
    setExtracted(null);
    setError(null);
  }

  if (generating) {
    return (
      <Generating
        key={generating.noteHash}
        note={generating.note}
        noteHash={generating.noteHash}
        meta={generating.meta}
        onBack={backToStart}
        onRejected={rejectedInDemo}
      />
    );
  }

  const fieldError = error?.field ? ERROR_ID : undefined;
  return (
    <Screen title="title.notes">
      <EmptyState heading={t("start.empty")} next={t("start.empty.next")} />
      <div className={styles.upload}>
        <DropZone id={INPUT_ID} busy={busy} errorId={fieldError} onFile={onFile} />
        {error ? (
          <ErrorMessage
            key={error.seq}
            id={ERROR_ID}
            text={error.key === "consent.declined" ? <ConsentDeclinedText /> : t(error.key)}
          />
        ) : null}
        <div role="status" className={styles.status} data-note-hash={extracted?.noteHash}>
          {extracted ? <p>{extracted.meta}</p> : null}
          {extracted?.encodingFallback ? <p>{t("warn.encoding")}</p> : null}
        </div>
      </div>
      <div>
        <ButtonLink href={DEMO_PATH} variant="secondary">
          {t("start.demo")}
        </ButtonLink>
      </div>
      {error?.key === "consent.declined" ? null : <ConsentNotice />}
    </Screen>
  );
}
