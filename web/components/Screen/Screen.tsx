"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { pageTitle, type MessageKey } from "../../i18n/messages";
import { SKIP_LINK_ID } from "../AppShell/AppShell";
import styles from "./Screen.module.css";

/**
 * One screen (route). On mount it sets document.title and focuses its h1
 * (EXPERIENCE.md › Accessibility Floor › Focus management). Each page owns its focus;
 * there is no router listener.
 *
 * The focused h1 sits inside main, so a plain Tab would skip the skip link. The first
 * Tab after mount, while focus is still on the h1, therefore goes to the skip link,
 * which keeps it the first Tab stop on every route (spec 1.2, Implementation Notes).
 */
export function Screen({ title, children }: { title: MessageKey; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = pageTitle(title);
    const heading = ref.current?.querySelector<HTMLElement>("h1");
    if (!heading) return;
    heading.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      document.removeEventListener("keydown", onKeyDown, true);
      if (event.shiftKey || document.activeElement !== heading) return;
      const skip = document.getElementById(SKIP_LINK_ID);
      if (skip) {
        event.preventDefault();
        skip.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [title]);

  return (
    <div ref={ref} className={styles.screen}>
      {children}
    </div>
  );
}

/** The screen's h1: programmatically focusable, not a Tab stop. */
export function ScreenHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 tabIndex={-1} className={[styles.heading, className].filter(Boolean).join(" ")}>
      {children}
    </h1>
  );
}
