"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "../../../components/Button/Button";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { Screen, ScreenHeading } from "../../../components/Screen/Screen";
import { t } from "../../../i18n/messages";
import { readNote, type NoteRecord } from "../../../storage/db";

/** A malformed escape (for example `/notat/%E0`) gives "", which reads as a missing Note. */
function decodeParam(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

type State = { kind: "loading" } | { kind: "found"; note: NoteRecord } | { kind: "missing" };

// Notatoversikt, placeholder until Story 1.11: the stored Note's title as h1 and page title.
// A missing or invalid record gets an empty state with a way back to Start.
export default function NoteOverviewPage() {
  const params = useParams<{ noteHash: string }>();
  const noteHash = decodeParam(params?.noteHash);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    setState({ kind: "loading" });
    void readNote(noteHash).then((result) => {
      if (live) setState(result.ok ? { kind: "found", note: result.value } : { kind: "missing" });
    });
    return () => {
      live = false;
    };
  }, [noteHash]);

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
  return (
    <Screen note={state.note.title}>
      <ScreenHeading>{state.note.title}</ScreenHeading>
    </Screen>
  );
}
