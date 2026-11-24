"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "../../../components/Button/Button";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { Generating } from "../../../components/Generating/Generating";
import { NoteOverview } from "../../../components/NoteOverview/NoteOverview";
import { useNoteSession } from "../../../components/NoteSession/NoteSession";
import { Screen } from "../../../components/Screen/Screen";
import { bareNoteHash } from "../../../core/ids";
import { extractedFromNote } from "../../../core/overview";
import { format, t } from "../../../i18n/messages";
import { readNote, readStudySet, type NoteRecord, type StudySetRecord } from "../../../storage/db";

/** The same breakpoint as the CSS (EXPERIENCE.md › Responsive & Platform). */
const WIDE_QUERY = "(min-width: 768px)";

/** A malformed escape (for example `/notat/%E0`) gives "", which reads as a missing Note. */
function decodeParam(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

type State =
  | { kind: "loading" }
  | { kind: "found"; note: NoteRecord; studySet: StudySetRecord }
  | { kind: "missing" };

/** Both validated records, or null if either is missing or invalid. */
async function loadRecords(noteHash: string): Promise<{ note: NoteRecord; studySet: StudySetRecord } | null> {
  const note = await readNote(noteHash);
  if (!note.ok) return null;
  const studySet = await readStudySet(note.value.currentCacheKey);
  return studySet.ok ? { note: note.value, studySet: studySet.value } : null;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
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
  const wide = useMediaQuery(WIDE_QUERY);
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
  if (state.kind === "missing") {
    return (
      <Screen title="note.missing">
        <EmptyState
          heading={t("note.missing")}
          next={t("start.empty.next")}
          actions={
            <ButtonLink href="/" variant="primary">
              {t("gen.back")}
            </ButtonLink>
          }
        />
      </Screen>
    );
  }
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
      wide={wide}
      onRetry={() => setRegenerating(true)}
    />
  );
}
