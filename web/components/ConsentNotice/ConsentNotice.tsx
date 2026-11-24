"use client";

import { format } from "../../i18n/messages";
import { useAppSettings } from "../AppSettings/AppSettings";
import styles from "./ConsentNotice.module.css";

/**
 * The `consent.declined` text with its bracketed part as an inline link-styled button that
 * reopens the Consent dialog. Also shown inline at the drop zone when the send gate blocks (Story 1.9).
 */
export function ConsentDeclinedText() {
  const { provider, openConsent } = useAppSettings();
  const text = format("consent.declined", { leverandør: provider });
  const match = text.match(/^([\s\S]*)\[([^\]]+)\]([\s\S]*)$/);
  const [before, link, after] = match ? [match[1], match[2], match[3]] : [text, null, ""];
  return (
    <>
      {before}
      {link ? (
        <button type="button" className={styles.link} onClick={(event) => openConsent(event.currentTarget)}>
          {link}
        </button>
      ) : null}
      {after}
    </>
  );
}

/** `consent.declined` on Start (FR-5): shown after declining or withdrawing. */
export function ConsentNotice() {
  const { settings } = useAppSettings();
  if (settings.consent !== "declined") return null;
  return (
    <p className={styles.notice}>
      <ConsentDeclinedText />
    </p>
  );
}
