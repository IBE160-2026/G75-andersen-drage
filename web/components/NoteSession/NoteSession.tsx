"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { NoteRecord, StudySetRecord } from "../../storage/db";

/** The open Note and its Study Set (AD-11): one context, set by Notatoversikt on load, cleared on unmount. */
export type NoteSession = { note: NoteRecord; studySet: StudySetRecord } | null;

type NoteSessionValue = {
  session: NoteSession;
  setSession: (session: NoteSession) => void;
};

const NoteSessionContext = createContext<NoteSessionValue>({ session: null, setSession: () => {} });

export function NoteSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<NoteSession>(null);
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <NoteSessionContext.Provider value={value}>{children}</NoteSessionContext.Provider>;
}

export function useNoteSession(): NoteSessionValue {
  return useContext(NoteSessionContext);
}
