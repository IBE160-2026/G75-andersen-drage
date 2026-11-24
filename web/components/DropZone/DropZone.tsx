"use client";

import { useEffect, useState, type DragEvent, type MouseEvent } from "react";
import { t } from "../../i18n/messages";
import styles from "./DropZone.module.css";

/** Extensions offered by the native file picker; the real check is checkFile() (extract/client.ts). */
const ACCEPT = ".txt,.md,.docx,.pdf";

/**
 * A file dropped outside the drop zone would make the browser open it and leave the app. Used by
 * the drop zone and by Genererer, which replaces it while a generation is pending (Story 1.9).
 */
export function useBlockWindowDrop() {
  useEffect(() => {
    const block = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);
}

/**
 * Drop zone (DESIGN.md › Drop zone, EXPERIENCE.md › Component Patterns): a label around a visually
 * hidden native file input, so a click or Enter/Space anywhere on it opens the picker, and the
 * same label is the drop target. Only the first file of a drop is used. While `busy` the input is
 * aria-disabled and picks and drops are ignored. `errorId` ties an inline error to the input.
 */
export function DropZone({
  id,
  busy,
  errorId,
  onFile,
}: {
  id: string;
  busy: boolean;
  errorId?: string;
  onFile: (file: File) => void;
}) {
  const [over, setOver] = useState(false);
  useBlockWindowDrop();
  const text = t("start.dropzone");
  const match = text.match(/^([\s\S]*)\[([^\]]+)\]([\s\S]*)$/);
  const [before, link, after] = match ? [match[1], match[2], match[3]] : [text, "", ""];

  function onDragOver(event: DragEvent) {
    // Always prevent the default, or the browser would open a dropped file itself.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = busy ? "none" : "copy";
    if (!busy) setOver(true);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer?.files[0];
    if (!busy && file) onFile(file);
  }

  function onInputClick(event: MouseEvent<HTMLInputElement>) {
    if (busy) event.preventDefault();
  }

  return (
    <label
      htmlFor={id}
      className={styles.zone}
      data-over={over || undefined}
      data-busy={busy || undefined}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <span className={styles.main}>
        {before}
        {link ? <span className={styles.link}>{link}</span> : null}
        {after}
      </span>
      <span className={styles.types}>{t("start.dropzone.types")}</span>
      <input
        id={id}
        type="file"
        accept={ACCEPT}
        className="visually-hidden"
        aria-disabled={busy || undefined}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        onClick={onInputClick}
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          // Reset so choosing the same file again fires change again.
          input.value = "";
          if (!busy && file) onFile(file);
        }}
      />
    </label>
  );
}
