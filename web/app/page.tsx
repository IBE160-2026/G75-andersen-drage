"use client";

import { useEffect, useRef, useState } from "react";
import { ConsentNotice } from "../components/ConsentNotice/ConsentNotice";
import { DropZone } from "../components/DropZone/DropZone";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage/ErrorMessage";
import { Screen } from "../components/Screen/Screen";
import { checkFile, extractInWorker } from "../extract/client";
import type { ExtractErrorKey } from "../extract/text";
import { format, t } from "../i18n/messages";
import styles from "./page.module.css";

const INPUT_ID = "note-file";
const ERROR_ID = "note-file-error";

type Extracted = { meta: string; noteHash: string; encodingFallback: boolean };

const number = new Intl.NumberFormat("nb-NO");

// Start — 'Dine notater'. No Notes are stored before Story 1.9, so this is the empty state.
// A file is checked (type, size) on the main thread, then extracted in a Web Worker (Story 1.4).
// After declining Consent, consent.declined is shown with a link that reopens the dialog.
export default function StartPage() {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // `seq` remounts the alert for every rejection, so a repeated error is announced and focused again.
  const [error, setError] = useState<{ key: ExtractErrorKey; seq: number } | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);

  useEffect(() => {
    if (error) document.getElementById(ERROR_ID)?.focus();
  }, [error]);

  function reject(key: ExtractErrorKey) {
    setError((prev) => ({ key, seq: (prev?.seq ?? 0) + 1 }));
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
    setError(null);
    const { note } = result;
    setExtracted({
      meta: format("note.meta", {
        filnavn: note.fileName,
        ord: number.format(note.wordCount),
        avsnitt: number.format(note.passages.length),
      }),
      noteHash: result.noteHash,
      encodingFallback: note.encodingFallback,
    });
  }

  return (
    <Screen title="title.notes">
      <EmptyState heading={t("start.empty")} next={t("start.empty.next")} />
      <div className={styles.upload}>
        <DropZone id={INPUT_ID} busy={busy} errorId={error ? ERROR_ID : undefined} onFile={onFile} />
        {error ? <ErrorMessage key={error.seq} id={ERROR_ID} text={t(error.key)} /> : null}
        <div role="status" className={styles.status} data-note-hash={extracted?.noteHash}>
          {extracted ? <p>{extracted.meta}</p> : null}
          {extracted?.encodingFallback ? <p>{t("warn.encoding")}</p> : null}
        </div>
      </div>
      <ConsentNotice />
    </Screen>
  );
}
