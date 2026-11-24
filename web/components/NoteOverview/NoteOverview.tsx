"use client";

import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Tabs } from "radix-ui";
import { contentLang, hasCoveredConcept, noteFileName, passageLabel, sortConcepts } from "../../core/overview";
import { format, t } from "../../i18n/messages";
import type { NoteRecord, StudySetRecord } from "../../storage/db";
import { useAsideSlot } from "../AppShell/asideSlot";
import { Button } from "../Button/Button";
import {
  HighlightedText,
  passageActiveClass,
  passageElementId,
  ReferenceJumpProvider,
  ReturnControl,
  SourceRef,
  useActivePassage,
  useSourceEscape,
  type ReturnContext,
} from "../ReferenceJump/ReferenceJump";
import { ErrorMessage } from "../ErrorMessage/ErrorMessage";
import { Screen, ScreenHeading } from "../Screen/Screen";
import styles from "./NoteOverview.module.css";

const START_HINT_ID = "start-hint";
const NO_CONCEPTS_ID = "no-concepts-error";
const SOURCE_LABEL_ID = "source-label";
type Tab = "study" | "source";

/**
 * Notatoversikt (FR-6, FR-12, UX-DR6–9). The study panel is the content of `main`; the source panel is an
 * `<aside>` portalled into the shell's aside slot, so it follows `main` in the DOM and the AppShell grid
 * places it on the left from 768 px. Below 768 px (`wide` false) the panels become manual-activation Tabs
 * 'Studier' / 'Kilde'; the 'Kilde' Tabs.Content renders inside the aside, and the aside is hidden while
 * 'Studier' is active. Generated content and Passage text carry `lang` from `StudySet.language`.
 * Story 1.12: both panels sit in one ReferenceJumpProvider; on mobile a jump switches to 'Kilde' and the
 * return switches back to 'Studier'.
 */
export function NoteOverview({
  note,
  studySet,
  wide,
  onRetry,
}: {
  note: NoteRecord;
  studySet: StudySetRecord;
  wide: boolean;
  /** 'Prøv igjen' after `err.noConcepts`. */
  onRetry: () => void;
}) {
  const slot = useAsideSlot();
  const [tab, setTab] = useState<Tab>("study");
  const fileName = noteFileName(note);
  const lang = contentLang(studySet.language);
  const asideLabel = format("source.aria", { filnavn: fileName });
  const showSource = useCallback(() => setTab("source"), []);
  const showStudy = useCallback(() => setTab("study"), []);

  const study = <StudyPanel studySet={studySet} lang={lang} onRetry={onRetry} />;
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
    <Screen note={note.title}>
      <ScreenHeading>{note.title}</ScreenHeading>
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
    </Screen>
  );
}

/** Summary Point references return to the summary (decided by Tor 2026-11-24). */
function summaryReturn(): ReturnContext {
  return { from: t("return.from.summary"), action: t("return.summary") };
}

function StudyPanel({ studySet, lang, onRetry }: { studySet: StudySetRecord; lang: string; onRetry: () => void }) {
  const concepts = sortConcepts(studySet.concepts);
  return (
    <div className={styles.studyPanel}>
      <section className={styles.section} aria-labelledby="overview-summary">
        <h2 id="overview-summary" className={styles.h2}>
          {t("overview.summary")}
        </h2>
        <ul className={styles.points}>
          {studySet.summaryPoints.map((point) => (
            <li key={point.id} className={styles.point}>
              <p lang={lang}>{point.text}</p>
              <figure className={styles.quote}>
                <blockquote className={styles.blockquote}>
                  <p lang={lang} className={styles.quoteText}>
                    {point.quote}
                  </p>
                </blockquote>
                <figcaption>
                  <SourceRef
                    id={`ref-${point.id}`}
                    passageId={point.passageId}
                    quote={point.quote}
                    returnContext={summaryReturn()}
                  />
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="overview-concepts">
        <h2 id="overview-concepts" className={styles.h2}>
          {t("overview.concepts")}
        </h2>
        <ul className={styles.concepts}>
          {concepts.map((concept) => (
            <li key={concept.id} className={styles.concept}>
              <span lang={lang}>{concept.name}</span>
              {concept.covered ? (
                <span className={styles.chip}>{t("mastery.new")}</span>
              ) : (
                <span className={styles.notCovered}>{t("overview.notCovered")}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {hasCoveredConcept(studySet.concepts) ? (
        <div className={styles.start}>
          <Button variant="primary" pending aria-describedby={START_HINT_ID}>
            {t("overview.start")}
          </Button>
          <p id={START_HINT_ID} className={styles.hint}>
            {t("overview.start.hint")}
          </p>
        </div>
      ) : (
        <ErrorMessage
          id={NO_CONCEPTS_ID}
          text={t("err.noConcepts")}
          actions={
            <Button variant="primary" onClick={onRetry}>
              {t("gen.retry")}
            </Button>
          }
        />
      )}
    </div>
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
