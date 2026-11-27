"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uuidFromBytes } from "../../core/ids";
import { composeRound } from "../../core/round";
import { readConceptProgress, startRound, type NoteRecord, type StudySetRecord } from "../../storage/db";
import { roundPath } from "../NoteOverview/NoteOverview";

/** `crypto.randomUUID()`, which exists only in a secure context; elsewhere a v4 UUID from getRandomValues. */
function newRoundId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return uuidFromBytes(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * Story 2.1 / 2.5 (FR-18, AD-11, AD-21): the one Round-start path, shared by Notatoversikt's 'Start runde'
 * and Resultat's 'Ny runde'. `start` reads the Note's progress rows, composes the Round in core/ (Round ID
 * and time from here) from `studySet`, stores it in one transaction (`startRound` numbers it n + 1) and
 * opens the Round screen. While it runs `pending` is true and a second press is ignored; on a failure
 * `pending` clears and `failed` is set, and a new `start` retries. Never throws.
 */
export function useStartRound(
  note: Pick<NoteRecord, "noteHash">,
  studySet: Pick<StudySetRecord, "cacheKey" | "concepts">,
): { start: () => Promise<void>; pending: boolean; failed: boolean } {
  const router = useRouter();
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
      try {
        // Stays pending until the Round screen replaces this one.
        router.push(roundPath(note.noteHash, roundId));
        return;
      } catch {
        // Falls through to the failure state.
      }
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

  return { start, pending, failed };
}
