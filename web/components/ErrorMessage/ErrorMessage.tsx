import type { ReactNode } from "react";
import { t } from "../../i18n/messages";
import styles from "./ErrorMessage.module.css";

/**
 * Inline error (DESIGN.md › Error message): crimson role, icon + "Feil:" prefix + text,
 * plus an optional next-step slot (for example 'Prøv igjen'). Never colour-only.
 * `text` must already come from messages.ts (it may hold an inline control, as `consent.declined` does).
 */
export function ErrorMessage({ text, actions, id }: { text: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div id={id} role="alert" tabIndex={-1} className={styles.error}>
      <div className={styles.body}>
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 2 1 21h22L12 2Zm0 5.5 7.6 13H4.4L12 7.5ZM11 10v5h2v-5h-2Zm0 6.5v2h2v-2h-2Z" />
        </svg>
        <p className={styles.text}>
          <span className={styles.prefix}>{t("err.prefix")}</span> {text}
        </p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
