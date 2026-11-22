import type { ReactNode } from "react";
import { ScreenHeading } from "../Screen/Screen";
import styles from "./EmptyState.module.css";

/**
 * Empty state (DESIGN.md › Empty state): the headline is the screen's h1, then one
 * ink-muted line on what to do next, then the relevant actions. Strings come from messages.ts.
 */
export function EmptyState({ heading, next, actions }: { heading: string; next: string; actions?: ReactNode }) {
  return (
    <section className={styles.emptyState}>
      <ScreenHeading>{heading}</ScreenHeading>
      <p className={styles.next}>{next}</p>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
