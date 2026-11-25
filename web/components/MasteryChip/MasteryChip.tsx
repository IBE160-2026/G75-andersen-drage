import type { MasteryState } from "../../core/round";
import { t, type MessageKey } from "../../i18n/messages";
import styles from "./MasteryChip.module.css";

const LABEL: Record<MasteryState, MessageKey> = {
  new: "mastery.new",
  shaky: "mastery.shaky",
  known: "mastery.known",
};

/** DESIGN.md › Mastery chip: the state as text ('ny' / 'usikker' / 'kan'), never colour alone. */
export function MasteryChip({ state }: { state: MasteryState }) {
  return (
    <span className={`${styles.chip} ${styles[state]}`} data-state={state}>
      {t(LABEL[state])}
    </span>
  );
}
