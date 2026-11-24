"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { DropdownMenu } from "radix-ui";
import { t } from "../../i18n/messages";
import { ButtonLink, buttonClass } from "../Button/Button";
import { useNoteSession } from "../NoteSession/NoteSession";
import styles from "./TopBar.module.css";

const SETTINGS_PATH = "/innstillinger";

/**
 * Top bar (DESIGN.md › Top bar, EXPERIENCE.md › Component Patterns › Top bar).
 * Brand, then the open Note's name (Story 1.11, from NoteSession) in `ink-muted`, then 'Innstillinger'.
 * The Note name sits outside the two nav variants, so it shows at every width.
 * Below 768 px the bar condenses to brand + 'Mer' (Radix DropdownMenu, AD-15).
 * Both variants sit in one nav landmark; CSS hides one, which also hides it from assistive tech.
 */
export function TopBar() {
  const pathname = usePathname();
  const { session } = useNoteSession();
  // A menu item that navigates hands focus to the new screen's h1, not back to 'Mer'.
  const navigated = useRef(false);

  return (
    <header className={styles.topBar}>
      <Link href="/" className={styles.brand}>
        {t("app.brand")}
      </Link>
      {session ? <span className={styles.noteName}>{session.note.title}</span> : null}

      <nav className={styles.nav} aria-label={t("nav.label")}>
        <div className={styles.wide}>
          <ButtonLink href={SETTINGS_PATH} variant="ghost">
            {t("nav.settings")}
          </ButtonLink>
        </div>

        <div className={styles.narrow}>
          <DropdownMenu.Root
            onOpenChange={(open) => {
              if (open) navigated.current = false;
            }}
          >
            <DropdownMenu.Trigger className={buttonClass("ghost", styles.moreTrigger)}>
              <svg className={styles.moreIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
              {t("topbar.more")}
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={styles.menu}
                align="end"
                sideOffset={4}
                onCloseAutoFocus={(event) => {
                  if (navigated.current) event.preventDefault();
                }}
              >
                <DropdownMenu.Item
                  asChild
                  className={styles.menuItem}
                  onSelect={() => {
                    // Already on Innstillinger: no Screen remounts, so let Radix refocus 'Mer'.
                    navigated.current = pathname !== SETTINGS_PATH;
                  }}
                >
                  <Link href={SETTINGS_PATH}>{t("nav.settings")}</Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </nav>
    </header>
  );
}
