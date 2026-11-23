"use client";

import { Screen, ScreenHeading } from "../../components/Screen/Screen";
import { t } from "../../i18n/messages";

// Innstillinger: placeholder heading only. Consent and other settings arrive in Story 1.3.
export default function SettingsPage() {
  return (
    <Screen title="title.settings">
      <ScreenHeading>{t("settings.h1")}</ScreenHeading>
    </Screen>
  );
}
