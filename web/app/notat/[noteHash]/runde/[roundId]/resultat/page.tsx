"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNoteSession } from "../../../../../../components/NoteSession/NoteSession";
import { ResultScreen, resultReady } from "../../../../../../components/Result/Result";
import { useWide } from "../../../../../../components/StudyLayout/StudyLayout";
import {
  readNote,
  readRound,
  readStudySet,
  type NoteRecord,
  type RoundRecord,
  type StudySetRecord,
} from "../../../../../../storage/db";
import { decodeParam, NoteMissing } from "../../../../shared";

type Records = { note: NoteRecord; studySet: StudySetRecord; round: RoundRecord };
type State = { kind: "loading" } | ({ kind: "found" } & Records) | { kind: "missing" };

/**
 * The complete Round, its Note and the Study Set it was composed from, all validated, or null when any is
 * missing or invalid, or the Round has no Resultat (`resultReady`: another Note's, not `complete`, an Item
 * no longer in the set, or no Quiz Question).
 */
async function loadRecords(noteHash: string, roundId: string): Promise<Records | null> {
  const [note, round] = await Promise.all([readNote(noteHash), readRound(roundId)]);
  if (!note.ok || !round.ok || round.value.noteHash !== noteHash || round.value.status !== "complete") return null;
  const studySet = await readStudySet(round.value.cacheKey);
  if (!studySet.ok || !resultReady(round.value, noteHash, studySet.value)) return null;
  return { note: note.value, studySet: studySet.value, round: round.value };
}

// Resultat (Story 2.4): `/notat/{noteHash}/runde/{roundId}/resultat`. Rendered only from the stored,
// complete Round, so a reload shows the same score and rows; nothing is written. Sets its own NoteSession
// (split layout, top bar). Anything else gets the `note.missing` empty state.
export default function ResultPage() {
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
    <ResultScreen key={state.round.roundId} note={state.note} studySet={state.studySet} round={state.round} wide={wide} />
  );
}
