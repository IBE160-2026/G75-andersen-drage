"use client";

import { EmptyState } from "../components/EmptyState/EmptyState";
import { Screen } from "../components/Screen/Screen";
import { t } from "../i18n/messages";

// Start — 'Dine notater'. No Notes can exist before Story 1.4, so this is the empty state.
export default function StartPage() {
  return (
    <Screen title="title.notes">
      <EmptyState heading={t("start.empty")} next={t("start.empty.next")} />
    </Screen>
  );
}
