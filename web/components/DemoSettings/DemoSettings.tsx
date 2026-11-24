"use client";

import { Switch } from "radix-ui";
import { format, t } from "../../i18n/messages";
import { useAppSettings } from "../AppSettings/AppSettings";
import styles from "./DemoSettings.module.css";

const SWITCH_ID = "settings-demo-switch";
const DESC_ID = "settings-demo-desc";

/**
 * Innstillinger › Studier (Story 1.14, EXPERIENCE.md › Settings row, Toggle; DESIGN.md › Toggle).
 * 'Demomodus' as a Radix Switch: takes effect at once and is persisted (no save button). The visible
 * 'På' / 'Av' carries the state beside the track, so it is not color- or position-only; AT gets it from
 * `aria-checked`. Turning it off returns to live generation if Consent is given (the send gate decides).
 */
export function DemoSettings() {
  const { settings, provider, setDemoMode } = useAppSettings();
  const on = settings.demoMode === true;

  return (
    <section className={styles.section} aria-labelledby="settings-studies">
      <h2 id="settings-studies" className={styles.heading}>
        {t("settings.studies.h2")}
      </h2>
      <div className={styles.row}>
        <div className={styles.text}>
          <label htmlFor={SWITCH_ID} className={styles.label}>
            {t("settings.demo")}
          </label>
          <p id={DESC_ID} className={styles.desc}>
            {format("settings.demo.desc", { leverandør: provider })}
          </p>
        </div>
        <div className={styles.control}>
          <Switch.Root
            id={SWITCH_ID}
            className={styles.switch}
            checked={on}
            onCheckedChange={setDemoMode}
            aria-describedby={DESC_ID}
          >
            <Switch.Thumb className={styles.thumb} />
          </Switch.Root>
          <span className={styles.state} aria-hidden="true">
            {t(on ? "toggle.on" : "toggle.off")}
          </span>
        </div>
      </div>
    </section>
  );
}
