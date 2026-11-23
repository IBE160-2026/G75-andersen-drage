"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { t } from "../../i18n/messages";
import { TopBar } from "../TopBar/TopBar";
import styles from "./AppShell.module.css";

export const SKIP_LINK_ID = "skip-link";
export const MAIN_ID = "main";

function focusMainHeading(event: MouseEvent<HTMLAnchorElement>) {
  const heading = document.querySelector<HTMLElement>(`#${MAIN_ID} h1`);
  if (heading) {
    event.preventDefault();
    heading.focus();
  }
}

/**
 * Client-rendered shell (AD-15): nothing renders until mounted, so browser-only state
 * (theme, later Consent and storage) is never read on the server.
 * DOM order: skip link → header → main (EXPERIENCE.md › Page structure).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <>
      <a id={SKIP_LINK_ID} className={styles.skipLink} href={`#${MAIN_ID}`} onClick={focusMainHeading}>
        {t("skip.link")}
      </a>
      <TopBar />
      <main id={MAIN_ID} className={styles.main}>
        {children}
      </main>
    </>
  );
}
