"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fetchSampleFile, fetchSampleManifest, type Sample } from "../../api/samples";
import { useAppSettings } from "../../components/AppSettings/AppSettings";
import { Button } from "../../components/Button/Button";
import { ErrorMessage } from "../../components/ErrorMessage/ErrorMessage";
import { Generating } from "../../components/Generating/Generating";
import { Screen, ScreenHeading } from "../../components/Screen/Screen";
import type { ExtractedNote } from "../../core/types";
import { checkFile, extractInWorker } from "../../extract/client";
import type { ExtractErrorKey } from "../../extract/text";
import { format, t } from "../../i18n/messages";
import styles from "./page.module.css";

const ERROR_ID = "demo-error";

type Picked = { meta: string; noteHash: string; note: ExtractedNote };
type DemoErrorKey = ExtractErrorKey | "err.unreadable" | "err.generation";

const number = new Intl.NumberFormat("nb-NO");

// Demovelger (Story 1.14, FR-23, UX-DR32). Lists the bundled sample notes from the build-time manifest.
// Picking one runs the upload pipeline (checkFile → extractInWorker), turns Demo Mode on, then Genererer
// (requestStudySet → verifyStudySet → saveGeneratedNote under `demo:` keys) → Notatoversikt.
// The browser never decides which Note Hashes are samples: the Proxy answers 404 for anything else.
export default function DemoPage() {
  const router = useRouter();
  const { setDemoMode } = useAppSettings();
  const [samples, setSamples] = useState<Sample[] | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // `seq` remounts the alert for every failure, so a repeated error is announced and focused again.
  const [error, setError] = useState<{ key: DemoErrorKey; seq: number } | null>(null);
  const [generating, setGenerating] = useState<Picked | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchSampleManifest({ signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) setSamples(result.samples);
      else fail(result.code);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (error) document.getElementById(ERROR_ID)?.focus();
  }, [error]);

  function fail(key: DemoErrorKey) {
    setError((prev) => ({ key, seq: (prev?.seq ?? 0) + 1 }));
  }

  async function pick(sample: Sample) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const loaded = await fetchSampleFile(sample);
    const problem = loaded.ok ? checkFile(loaded.file) : loaded.code;
    const result = loaded.ok && !problem ? await extractInWorker(loaded.file) : null;
    setBusy(false);
    if (!result || !result.ok) {
      busyRef.current = false;
      fail(result ? result.error : (problem ?? "err.unreadable"));
      return;
    }
    const { note } = result;
    setDemoMode(true);
    // busyRef stays set: the list is gone while Genererer shows.
    setGenerating({
      meta: format("note.meta", {
        filnavn: note.fileName,
        ord: number.format(note.wordCount),
        avsnitt: number.format(note.passages.length),
      }),
      noteHash: result.noteHash,
      note,
    });
  }

  if (generating) {
    return (
      <Generating
        key={generating.noteHash}
        note={generating.note}
        noteHash={generating.noteHash}
        meta={generating.meta}
        onBack={() => router.push("/")}
      />
    );
  }

  return (
    <Screen title="title.demo">
      <ScreenHeading>{t("demo.h1")}</ScreenHeading>
      {samples ? (
        <ul className={styles.list}>
          {samples.map((sample) => (
            <li key={sample.file}>
              <Button className={styles.sample} pending={busy} onClick={() => void pick(sample)}>
                <span lang={sample.language}>{sample.title}</span>
                <span className={styles.language}>{t(sample.language === "en" ? "demo.lang.en" : "demo.lang.nb")}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <ErrorMessage key={error.seq} id={ERROR_ID} text={t(error.key)} /> : null}
    </Screen>
  );
}
