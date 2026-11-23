"use client";

import { ConsentSettings } from "../../components/ConsentSettings/ConsentSettings";
import { Screen, ScreenHeading } from "../../components/Screen/Screen";
import { t } from "../../i18n/messages";

// Innstillinger. Story 1.3 adds Samtykke; Studier, Lagring and Sletting come in later stories.
export default function SettingsPage() {
  return (
    <Screen title="title.settings">
      <ScreenHeading>{t("settings.h1")}</ScreenHeading>
      <ConsentSettings />
    </Screen>
  );
}
