"use client";

import { Dialog } from "radix-ui";
import { useId, useState } from "react";
import { format, t, type MessageKey } from "../../i18n/messages";
import { useAppSettings } from "../AppSettings/AppSettings";
import { Button } from "../Button/Button";
import styles from "./ConsentDialog.module.css";

const MORE: MessageKey[] = ["consent.more.b", "consent.more.c", "consent.more.d", "consent.more.e"];

/**
 * Consent gate (FR-5, EXPERIENCE.md › Consent & Privacy). Radix Dialog: h2 title
 * (aria-labelledby), body (aria-describedby), focus trapped. It cannot be dismissed:
 * Esc and outside clicks are ignored and there is no close button.
 */
export function ConsentDialog() {
  const { consentOpen, providerWithModel, accept, decline, restoreFocus } = useAppSettings();
  const [more, setMore] = useState(false);
  const moreId = useId();

  return (
    <Dialog.Root open={consentOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            setMore(false);
            restoreFocus();
          }}
        >
          <Dialog.Title className={styles.title}>{t("consent.title")}</Dialog.Title>
          <Dialog.Description className={styles.body}>
            {format("consent.body", { leverandør: providerWithModel })}
          </Dialog.Description>

          <div className={styles.more}>
            <Button variant="ghost" aria-expanded={more} aria-controls={moreId} onClick={() => setMore((m) => !m)}>
              <svg className={styles.chevron} data-open={more} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 6l6 6-6 6" />
              </svg>
              {t("consent.more")}
            </Button>
            <ul id={moreId} className={styles.points} hidden={!more}>
              {MORE.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={decline}>
              {t("consent.decline")}
            </Button>
            <Button variant="primary" onClick={accept}>
              {t("consent.accept")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
