"use client";

import { useEffect, useRef } from "react";
import type { VerifiedFlashcard } from "../../core/types";
import { format, t } from "../../i18n/messages";
import { Button } from "../Button/Button";
import { ErrorMessage } from "../ErrorMessage/ErrorMessage";
import { SourceRef, type ReturnContext } from "../ReferenceJump/ReferenceJump";
import { QuoteBlock } from "../QuoteBlock/QuoteBlock";
import styles from "./Flashcard.module.css";

const MARK_ERROR_ID = "mark-error";

/**
 * Flashcard region (UX-DR13, Story 2.2). A `section` labelled by the Item `h2` ("Kort {x} av {y}", which
 * the Round screen renders in its progress line), with the concept chip on top. Front: the question in
 * `card-front` serif and "Kilde: Pn" (the reference jump works before reveal), no Quote. 'Snu kortet'
 * reveals the back: the answer in `card-back` (focused), a dashed divider and the Quote block with the
 * reference; then 'Kunne det ikke' / 'Kunne det'. `revealed` is held by the Round screen, so it survives
 * the mobile 'Kilde' tab unmounting the card during a reference jump; focus moves to the answer only on
 * the reveal itself, never when a revealed card mounts again (the return focuses the reference). While
 * a mark saves (`pending`) both marks are `aria-disabled`; `failed` shows `err.generation` inline, named
 * by both marks.
 */
export function Flashcard({
  card,
  conceptName,
  position,
  headingId,
  lang,
  revealed,
  onReveal,
  pending,
  failed,
  onMark,
}: {
  card: VerifiedFlashcard;
  conceptName: string;
  /** 1-based "x" of "Kort x av y", for the return context "Viser Pn fra kort x". */
  position: number;
  headingId: string;
  lang: string;
  revealed: boolean;
  onReveal: () => void;
  pending: boolean;
  failed: boolean;
  onMark: (knew: boolean) => void;
}) {
  const answerRef = useRef<HTMLParagraphElement>(null);
  const justRevealed = useRef(false);

  useEffect(() => {
    if (revealed && justRevealed.current) {
      justRevealed.current = false;
      answerRef.current?.focus();
    }
  }, [revealed]);

  const returnContext: ReturnContext = { from: format("return.from.card", { x: String(position) }), action: t("return.card") };
  const ref = <SourceRef id={`ref-${card.id}`} passageId={card.passageId} quote={card.quote} returnContext={returnContext} />;
  const describedBy = failed ? MARK_ERROR_ID : undefined;

  return (
    <section aria-labelledby={headingId} className={styles.card}>
      <div className={styles.top}>
        <span lang={lang} className={styles.conceptChip}>
          {conceptName}
        </span>
      </div>
      <p lang={lang} className={styles.front}>
        {card.front}
      </p>
      {revealed ? (
        <>
          <p ref={answerRef} tabIndex={-1} lang={lang} className={styles.back}>
            {card.back}
          </p>
          <hr className={styles.divider} />
          <QuoteBlock quote={card.quote} lang={lang}>
            {ref}
          </QuoteBlock>
          <div className={styles.actions}>
            <Button variant="secondary" pending={pending} aria-describedby={describedBy} onClick={() => onMark(false)}>
              {t("card.unknown")}
            </Button>
            <Button variant="primary" pending={pending} aria-describedby={describedBy} onClick={() => onMark(true)}>
              {t("card.known")}
            </Button>
          </div>
          {failed ? <ErrorMessage id={MARK_ERROR_ID} text={t("err.generation")} /> : null}
        </>
      ) : (
        <>
          <p className={styles.ref}>{ref}</p>
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={() => {
                justRevealed.current = true;
                onReveal();
              }}
            >
              {t("card.reveal")}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
