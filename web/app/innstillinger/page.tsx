"use client";

import { ConsentSettings } from "../../components/ConsentSettings/ConsentSettings";
import { DemoSettings } from "../../components/DemoSettings/DemoSettings";
import { Screen, ScreenHeading } from "../../components/Screen/Screen";
import { t } from "../../i18n/messages";

// Innstillinger. Story 1.3 adds Samtykke, Story 1.14 Studier (Demomodus); Lagring and Sletting come later.
export default function SettingsPage() {
  return (
    <Screen title="title.settings">
      <ScreenHeading>{t("settings.h1")}</ScreenHeading>
      <ConsentSettings />
      <DemoSettings />
    </Screen>
  );
}
