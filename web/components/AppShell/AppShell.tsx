"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { t } from "../../i18n/messages";
import { AppSettingsProvider } from "../AppSettings/AppSettings";
import { ConsentDialog } from "../ConsentDialog/ConsentDialog";
import { TopBar } from "../TopBar/TopBar";
import { MAIN_ID, SKIP_LINK_ID } from "./ids";
import styles from "./AppShell.module.css";

export { MAIN_ID, SKIP_LINK_ID };

function focusMainHeading(event: MouseEvent<HTMLAnchorElement>) {
  const heading = document.querySelector<HTMLElement>(`#${MAIN_ID} h1`);
  if (heading) {
    event.preventDefault();
    heading.focus();
  }
}

/**
 * Client-rendered shell (AD-15): nothing renders until mounted, so browser-only state
 * (theme, Consent, storage) is never read on the server and the Consent dialog cannot flash.
 * DOM order: skip link → header → main (EXPERIENCE.md › Page structure); the Consent
 * dialog is portalled to the end of body.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <AppSettingsProvider>
      <a id={SKIP_LINK_ID} className={styles.skipLink} href={`#${MAIN_ID}`} onClick={focusMainHeading}>
        {t("skip.link")}
      </a>
      <TopBar />
      <main id={MAIN_ID} className={styles.main}>
        {children}
      </main>
      <ConsentDialog />
    </AppSettingsProvider>
  );
}
