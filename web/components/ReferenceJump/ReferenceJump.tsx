"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { passageLabel, splitQuote } from "../../core/overview";
import { format, t } from "../../i18n/messages";
import styles from "./ReferenceJump.module.css";

/**
 * Reference jump (FR-12, UX-DR10, UX-DR11). A screen wraps its study content and source panel in one
 * `ReferenceJumpProvider`; each "Kilde: Pn" is a `SourceRef` carrying its own return context, so Round and
 * Resultat screens (Epic 2) reuse this unchanged with their own `from` / `action` strings.
 *
 * Activation: (mobile: `onShowSource` switches to 'Kilde') → scroll the Passage into view (instant under
 * reduced motion) → the Passage turns active and its Quote is wrapped in one `<mark>` → focus the Passage.
 * Esc inside the source panel or the return control: (mobile: `onShowStudy`) → focus the exact reference.
 * The reference is found again by DOM id, since inactive Tabs content is unmounted in between.
 * The return control stays until the next jump or until the provider unmounts; no timer.
 */

/** Where the student came from: `from` fills `return.label` ("Viser P4 fra {from}"), `action` is the button. */
export type ReturnContext = { from: string; action: string };

type Jump = { refId: string; passageId: string; quote: string; context: ReturnContext };
type FocusRequest = { seq: number; target: "passage" | "ref" };

type ReferenceJumpValue = {
  jump: Jump | null;
  jumpTo: (jump: Jump) => void;
  returnToRef: () => void;
};

const ReferenceJumpContext = createContext<ReferenceJumpValue | null>(null);

/** The DOM id of a Passage in the source panel. */
export function passageElementId(passageId: string): string {
  return `passage-${passageId}`;
}

const RETURN_HINT_ID = "return-hint";

/** How many animation frames to wait for a target that a tab switch is still mounting. */
const MAX_FRAMES = 10;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function focusRef(refId: string): boolean {
  const el = document.getElementById(refId);
  el?.focus();
  return !!el && document.activeElement === el;
}

/** Focus the Passage and scroll its Quote (or itself) into view, instant under reduced motion. */
function focusPassage(passageId: string): boolean {
  const passage = document.getElementById(passageElementId(passageId));
  if (!passage) return false;
  passage.focus({ preventScroll: true });
  if (document.activeElement !== passage) return false;
  const target = passage.querySelector("mark") ?? passage;
  target.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "instant" : "smooth" });
  return true;
}

export function ReferenceJumpProvider({
  onShowSource,
  onShowStudy,
  children,
}: {
  /** Mobile: make the source panel visible before the jump (switch to 'Kilde'). */
  onShowSource?: () => void;
  /** Mobile: make the study content visible before returning (switch to 'Studier'). */
  onShowStudy?: () => void;
  children: ReactNode;
}) {
  const [jump, setJump] = useState<Jump | null>(null);
  const [request, setRequest] = useState<FocusRequest | null>(null);

  const jumpTo = useCallback(
    (next: Jump) => {
      onShowSource?.();
      setJump(next);
      setRequest((r) => ({ seq: (r?.seq ?? 0) + 1, target: "passage" }));
    },
    [onShowSource],
  );

  const returnToRef = useCallback(() => {
    onShowStudy?.();
    setRequest((r) => ({ seq: (r?.seq ?? 0) + 1, target: "ref" }));
  }, [onShowStudy]);

  // Focus and scroll after commit. A tab switch mounts the other Tabs.Content in a later render (Radix
  // Presence), so the target may not exist yet: look again on the next frames, a bounded number of times.
  // `request` alone keys the effect; `jump` is read as of the same commit.
  useEffect(() => {
    if (!request || !jump) return;
    let frame = 0;
    let handle = 0;
    const run = () => {
      const done = request.target === "ref" ? focusRef(jump.refId) : focusPassage(jump.passageId);
      if (!done && frame++ < MAX_FRAMES) handle = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(handle);
  }, [request]);

  const value = useMemo(() => ({ jump, jumpTo, returnToRef }), [jump, jumpTo, returnToRef]);
  return <ReferenceJumpContext.Provider value={value}>{children}</ReferenceJumpContext.Provider>;
}

function useReferenceJump(): ReferenceJumpValue {
  const value = useContext(ReferenceJumpContext);
  if (!value) throw new Error("ReferenceJump components need a ReferenceJumpProvider");
  return value;
}

/** "Kilde: Pn" as a link-styled button. `id` must be unique on the screen: focus returns to it. */
export function SourceRef({
  id,
  passageId,
  quote,
  returnContext,
}: {
  id: string;
  passageId: string;
  quote: string;
  returnContext: ReturnContext;
}) {
  const { jumpTo } = useReferenceJump();
  return (
    <button
      type="button"
      id={id}
      className={styles.ref}
      onClick={() => jumpTo({ refId: id, passageId, quote, context: returnContext })}
    >
      {format("source.ref", { id: passageLabel(passageId) })}
    </button>
  );
}

/** Esc anywhere inside the source panel returns to the reference (spread onto the panel's root). */
export function useSourceEscape(): { onKeyDown: (event: KeyboardEvent) => void } {
  const { jump, returnToRef } = useReferenceJump();
  return {
    onKeyDown: (event) => {
      if (event.key !== "Escape" || !jump) return;
      event.preventDefault();
      returnToRef();
    },
  };
}

/** The sticky strip at the top of the source panel after a jump: `return.label` + the context action. */
export function ReturnControl() {
  const { jump, returnToRef } = useReferenceJump();
  if (!jump) return null;
  return (
    <div className={styles.returnControl}>
      <p className={styles.returnLabel}>
        {format("return.label", { id: passageLabel(jump.passageId), kilde: jump.context.from })}
      </p>
      <button type="button" className={styles.returnAction} onClick={returnToRef}>
        {jump.context.action}
      </button>
      <span id={RETURN_HINT_ID} className="visually-hidden">
        {t("return.hint")}
      </span>
    </div>
  );
}

/** A Passage's jump state: active, its `aria-describedby` (→ `return.hint`) and the Quote to highlight. */
export function useActivePassage(passageId: string): { active: boolean; describedBy?: string; quote: string | null } {
  const { jump } = useReferenceJump();
  const active = jump?.passageId === passageId;
  return { active, describedBy: active ? RETURN_HINT_ID : undefined, quote: active ? jump.quote : null };
}

/**
 * Passage text with the Quote highlighted: one `<mark>` bracketed by visually hidden `quote.start` /
 * `quote.end`. Without a Quote, or when it is not found, the text renders plain.
 */
export function HighlightedText({ text, quote }: { text: string; quote: string | null }) {
  const split = quote ? splitQuote(text, quote) : null;
  if (!split) return <>{text}</>;
  return (
    <>
      {split.before}
      <span className="visually-hidden" lang="nb">
        {` ${t("quote.start")} `}
      </span>
      <mark className={styles.mark}>{split.quote}</mark>
      <span className="visually-hidden" lang="nb">
        {` ${t("quote.end")} `}
      </span>
      {split.after}
    </>
  );
}

export const passageActiveClass = styles.activePassage;
