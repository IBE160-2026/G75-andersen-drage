"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Generating } from "../../../components/Generating/Generating";
import { NoteOverview } from "../../../components/NoteOverview/NoteOverview";
import { useNoteSession } from "../../../components/NoteSession/NoteSession";
import { useWide } from "../../../components/StudyLayout/StudyLayout";
import { bareNoteHash } from "../../../core/ids";
import { extractedFromNote } from "../../../core/overview";
import { format } from "../../../i18n/messages";
import {
  readConceptProgress,
  readNote,
  readStudySet,
  type ConceptProgressRecord,
  type NoteRecord,
  type StudySetRecord,
} from "../../../storage/db";
import { decodeParam, NoteMissing } from "../shared";

type Records = { note: NoteRecord; studySet: StudySetRecord; progress: ConceptProgressRecord[] };
type State = { kind: "loading" } | ({ kind: "found" } & Records) | { kind: "missing" };

/**
 * Both validated records, or null if either is missing or invalid, plus the Note's progress rows for the
 * Mastery chips (Story 2.4). A failed progress read is never an error: every chip then reads 'ny'.
 */
async function loadRecords(noteHash: string): Promise<Records | null> {
  const note = await readNote(noteHash);
  if (!note.ok) return null;
  const studySet = await readStudySet(note.value.currentCacheKey);
  if (!studySet.ok) return null;
  const progress = await readConceptProgress(noteHash).catch(() => null);
  return { note: note.value, studySet: studySet.value, progress: progress?.ok ? progress.value : [] };
}

const number = new Intl.NumberFormat("nb-NO");

// Notatoversikt (Story 1.11): the stored Note and its Study Set, both validated, in the NoteSession
// context while this page shows them. A missing or invalid record gets the `note.missing` empty state.
// After `err.noConcepts`, 'Prøv igjen' renders Genererer in place; once it has saved, the records reload.
export default function NoteOverviewPage() {
  const params = useParams<{ noteHash: string }>();
  const noteHash = decodeParam(params?.noteHash);
  const router = useRouter();
  const { setSession } = useNoteSession();
  const wide = useWide();
  const [loaded, setLoaded] = useState<State>({ kind: "loading" });
  const [regenerating, setRegenerating] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setLoaded({ kind: "loading" });
    void loadRecords(noteHash).then((records) => {
      if (!live) return;
      setLoaded(records ? { kind: "found", ...records } : { kind: "missing" });
      setRegenerating(false);
    });
    return () => {
      live = false;
    };
  }, [noteHash, reload]);

  // A different Note in the URL: the records on screen belong to the previous one until it loads.
  const state: State = loaded.kind === "found" && loaded.note.noteHash !== noteHash ? { kind: "loading" } : loaded;
  // The session holds what is on screen; Genererer is a single-column screen without it.
  const shownNote = state.kind === "found" && !regenerating ? state.note : null;
  const shownSet = state.kind === "found" && !regenerating ? state.studySet : null;
  useEffect(() => {
    setSession(shownNote && shownSet ? { note: shownNote, studySet: shownSet } : null);
  }, [shownNote, shownSet, setSession]);
  useEffect(() => () => setSession(null), [setSession]);

  if (state.kind === "loading") return null;
  if (state.kind === "missing") return <NoteMissing />;
  if (regenerating) {
    const extracted = extractedFromNote(state.note);
    return (
      <Generating
        note={extracted}
        noteHash={bareNoteHash(state.note.noteHash)}
        meta={format("note.meta", {
          filnavn: extracted.fileName,
          ord: number.format(extracted.wordCount),
          avsnitt: number.format(extracted.passages.length),
        })}
        onBack={() => router.push("/")}
        onSaved={(saved) => {
          // Demo Mode may have changed since this Note was stored: the answer then lives under the other key.
          if (saved === noteHash) setReload((n) => n + 1);
          else router.push(`/notat/${saved}`);
        }}
      />
    );
  }
  return (
    <NoteOverview
      key={state.studySet.cacheKey + reload}
      note={state.note}
      studySet={state.studySet}
      progress={state.progress}
      wide={wide}
      onRetry={() => setRegenerating(true)}
    />
  );
}
