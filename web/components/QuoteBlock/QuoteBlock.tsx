import type { ReactNode } from "react";
import styles from "./QuoteBlock.module.css";

/**
 * DESIGN.md › Quote block (UX-DR12): `quote-bg`, 3 px accent rule, the Quote in serif between « », and
 * the source reference (`children`, a `SourceRef`) below. Shared by Notatoversikt and the Flashcard back.
 */
export function QuoteBlock({ quote, lang, children }: { quote: string; lang: string; children: ReactNode }) {
  return (
    <figure className={styles.quote}>
      <blockquote className={styles.blockquote}>
        <p lang={lang} className={styles.quoteText}>
          {quote}
        </p>
      </blockquote>
      <figcaption>{children}</figcaption>
    </figure>
  );
}
