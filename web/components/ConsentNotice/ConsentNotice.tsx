"use client";

import { format } from "../../i18n/messages";
import { useAppSettings } from "../AppSettings/AppSettings";
import styles from "./ConsentNotice.module.css";

/**
 * `consent.declined` on Start (FR-5): shown after declining or withdrawing. The bracketed
 * part of the string is an inline link-styled button that reopens the Consent dialog.
 */
export function ConsentNotice() {
  const { settings, provider, openConsent } = useAppSettings();
  if (settings.consent !== "declined") return null;

  const text = format("consent.declined", { leverandør: provider });
  const match = text.match(/^([\s\S]*)\[([^\]]+)\]([\s\S]*)$/);
  const [before, link, after] = match ? [match[1], match[2], match[3]] : [text, null, ""];

  return (
    <p className={styles.notice}>
      {before}
      {link ? (
        <button type="button" className={styles.link} onClick={(event) => openConsent(event.currentTarget)}>
          {link}
        </button>
      ) : null}
      {after}
    </p>
  );
}
