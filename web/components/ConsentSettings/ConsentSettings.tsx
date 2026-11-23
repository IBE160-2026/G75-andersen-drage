"use client";

import { useState } from "react";
import { format, t } from "../../i18n/messages";
import { useAppSettings } from "../AppSettings/AppSettings";
import { Button } from "../Button/Button";
import styles from "./ConsentSettings.module.css";

/**
 * Innstillinger › Samtykke (EXPERIENCE.md › Settings row). Accepted: status text and
 * 'Trekk tilbake samtykke' (no confirmation, announces settings.consent.withdrawn).
 * Otherwise: 'Godta at notater sendes' opens the Consent dialog. One button node for both,
 * so focus stays on it (and returns to it) when the state flips.
 */
export function ConsentSettings() {
  const { settings, provider, withdraw, openConsent } = useAppSettings();
  const [announcement, setAnnouncement] = useState("");
  const accepted = settings.consent === "accepted";

  return (
    <section className={styles.section} aria-labelledby="settings-consent">
      <h2 id="settings-consent" className={styles.heading}>
        {t("settings.consent.h2")}
      </h2>
      <p>{format(accepted ? "settings.consent.on" : "settings.consent.off", { leverandør: provider })}</p>
      <div>
        <Button
          variant="secondary"
          onClick={(event) => {
            if (accepted) {
              withdraw();
              setAnnouncement(t("settings.consent.withdrawn"));
            } else {
              setAnnouncement("");
              openConsent(event.currentTarget);
            }
          }}
        >
          {t(accepted ? "settings.consent.on.action" : "settings.consent.off.action")}
        </Button>
      </div>
      <p role="status" aria-live="polite" className={styles.status}>
        {announcement}
      </p>
    </section>
  );
}
