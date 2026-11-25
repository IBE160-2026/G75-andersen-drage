"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNoteSession } from "../../../../../components/NoteSession/NoteSession";
import { itemsResolve, RoundScreen } from "../../../../../components/Round/Round";
import { useWide } from "../../../../../components/StudyLayout/StudyLayout";
import {
  readConceptProgress,
  readNote,
  readRound,
  readStudySet,
  type ConceptProgressRecord,
  type NoteRecord,
  type RoundRecord,
  type StudySetRecord,
} from "../../../../../storage/db";
import { decodeParam, NoteMissing } from "../../../shared";

type Records = { note: NoteRecord; studySet: StudySetRecord; round: RoundRecord; progress: ConceptProgressRecord[] };
type State = { kind: "loading" } | ({ kind: "found" } & Records) | { kind: "missing" };

/**
 * The stored Round, its Note and the Study Set it was composed from, all validated, or null when any is
 * missing or invalid, the Round belongs to another Note or is no longer `active` (abandoned or complete:
 * later marks must never land on it), or an Item is no longer in the set.
 */
async function loadRecords(noteHash: string, roundId: string): Promise<Records | null> {
  const [note, round] = await Promise.all([readNote(noteHash), readRound(roundId)]);
  if (!note.ok || !round.ok || round.value.noteHash !== noteHash || round.value.status !== "active") return null;
  const studySet = await readStudySet(round.value.cacheKey);
  if (!studySet.ok || !itemsResolve(round.value, studySet.value)) return null;
  // Progress only colours the Mastery chip; unreadable rows read as `new`.
  const progress = await readConceptProgress(noteHash);
  return { note: note.value, studySet: studySet.value, round: round.value, progress: progress.ok ? progress.value : [] };
}

// Round screen (Story 2.1): `/notat/{noteHash}/runde/{roundId}`. Rendered only from the stored Round, so a
// reload shows the same Items; it never recomposes. Sets its own NoteSession (split layout, top bar).
// An unknown Round, a Round of another Note, a Round that is not active, or a Study Set that is gone gets the
// `note.missing` empty state.
export default function RoundPage() {
  const params = useParams<{ noteHash: string; roundId: string }>();
  const noteHash = decodeParam(params?.noteHash);
  const roundId = decodeParam(params?.roundId);
  const { setSession } = useNoteSession();
  const wide = useWide();
  const [loaded, setLoaded] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    setLoaded({ kind: "loading" });
    void loadRecords(noteHash, roundId).then((records) => {
      if (live) setLoaded(records ? { kind: "found", ...records } : { kind: "missing" });
    });
    return () => {
      live = false;
    };
  }, [noteHash, roundId]);

  // A different Round in the URL: the records on screen belong to the previous one until it loads.
  const state: State =
    loaded.kind === "found" && (loaded.note.noteHash !== noteHash || loaded.round.roundId !== roundId)
      ? { kind: "loading" }
      : loaded;
  const shownNote = state.kind === "found" ? state.note : null;
  const shownSet = state.kind === "found" ? state.studySet : null;
  useEffect(() => {
    setSession(shownNote && shownSet ? { note: shownNote, studySet: shownSet } : null);
  }, [shownNote, shownSet, setSession]);
  useEffect(() => () => setSession(null), [setSession]);

  if (state.kind === "loading") return null;
  if (state.kind === "missing") return <NoteMissing />;
  return (
    <RoundScreen
      key={state.round.roundId}
      note={state.note}
      studySet={state.studySet}
      round={state.round}
      progress={state.progress}
      wide={wide}
    />
  );
}
