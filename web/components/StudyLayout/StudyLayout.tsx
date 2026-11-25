"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Tabs } from "radix-ui";
import { noteFileName, passageLabel } from "../../core/overview";
import { format, t } from "../../i18n/messages";
import type { NoteRecord } from "../../storage/db";
import { useAsideSlot } from "../AppShell/asideSlot";
import {
  HighlightedText,
  passageActiveClass,
  passageElementId,
  ReferenceJumpProvider,
  ReturnControl,
  useActivePassage,
  useSourceEscape,
} from "../ReferenceJump/ReferenceJump";
import styles from "./StudyLayout.module.css";

const SOURCE_LABEL_ID = "source-label";
type Tab = "study" | "source";

/** The same breakpoint as the CSS (EXPERIENCE.md › Responsive & Platform). */
const WIDE_QUERY = "(min-width: 768px)";

/** True from 768 px: the split layout; below it the 'Studier' / 'Kilde' tabs. */
export function useWide(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const list = window.matchMedia(WIDE_QUERY);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, []);
  return matches;
}

/**
 * The Notatoversikt split (Story 1.11), shared with the Round screen (Story 2.1). `study` is the content
 * of `main`; the source panel is an `<aside>` portalled into the shell's aside slot, so it follows `main`
 * in the DOM and the AppShell grid places it on the left from 768 px. Below 768 px (`wide` false) the
 * panels become manual-activation Tabs 'Studier' / 'Kilde'; the 'Kilde' Tabs.Content renders inside the
 * aside, and the aside is hidden while 'Studier' is active. Passage text carries `lang`.
 * Story 1.12: both panels sit in one ReferenceJumpProvider; on mobile a jump switches to 'Kilde' and the
 * return switches back to 'Studier'. The caller sets the session (split grid) and renders the `h1`.
 */
export function StudyLayout({
  note,
  lang,
  wide,
  study,
}: {
  note: NoteRecord;
  /** `lang` for Passage text (`contentLang(studySet.language)`). */
  lang: string;
  wide: boolean;
  study: ReactNode;
}) {
  const slot = useAsideSlot();
  const [tab, setTab] = useState<Tab>("study");
  const fileName = noteFileName(note);
  const asideLabel = format("source.aria", { filnavn: fileName });
  const showSource = useCallback(() => setTab("source"), []);
  const showStudy = useCallback(() => setTab("study"), []);

  const source = <SourcePanel note={note} fileName={fileName} lang={lang} />;
  const aside = (children: ReactNode, hidden = false) =>
    slot
      ? createPortal(
          <aside aria-label={asideLabel} className={styles.aside} hidden={hidden}>
            {children}
          </aside>,
          slot,
        )
      : null;

  // One provider at the same tree position for both widths, so a jump survives crossing 768 px.
  return (
    <ReferenceJumpProvider onShowSource={wide ? undefined : showSource} onShowStudy={wide ? undefined : showStudy}>
      {wide ? (
        <>
          {study}
          {aside(source)}
        </>
      ) : (
        <Tabs.Root value={tab} onValueChange={(value) => setTab(value as Tab)} activationMode="manual">
          <Tabs.List className={styles.tabList}>
            <Tabs.Trigger value="study" className={styles.tab}>
              {t("tabs.study")}
            </Tabs.Trigger>
            <Tabs.Trigger value="source" className={styles.tab}>
              {t("tabs.source")}
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="study" tabIndex={-1} className={styles.tabPanel}>
            <p className={styles.statusStrip}>{note.title}</p>
            {study}
          </Tabs.Content>
          {aside(
            <Tabs.Content value="source" tabIndex={-1} className={styles.tabPanel}>
              {source}
            </Tabs.Content>,
            tab !== "source",
          )}
        </Tabs.Root>
      )}
    </ReferenceJumpProvider>
  );
}

function SourcePanel({ note, fileName, lang }: { note: NoteRecord; fileName: string; lang: string }) {
  const escape = useSourceEscape();
  return (
    <div className={styles.sourcePanel} {...escape}>
      <p id={SOURCE_LABEL_ID} className={styles.panelLabel}>
        {format("source.label", { filnavn: fileName })}
      </p>
      <ReturnControl />
      <div role="region" tabIndex={0} aria-labelledby={SOURCE_LABEL_ID} className={styles.region}>
        <ol className={styles.passages}>
          {note.passages.map((passage) => (
            <Passage key={passage.id} id={passage.id} text={passage.text} lang={lang} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function Passage({ id, text, lang }: { id: string; text: string; lang: string }) {
  const { active, describedBy, quote } = useActivePassage(id);
  return (
    <li
      id={passageElementId(id)}
      tabIndex={-1}
      aria-describedby={describedBy}
      data-active={active || undefined}
      className={active ? `${styles.passage} ${passageActiveClass}` : styles.passage}
    >
      <span className={styles.passageId}>{passageLabel(id)}</span>
      <p lang={lang} className={styles.passageText}>
        <HighlightedText text={text} quote={quote} />
      </p>
    </li>
  );
}
