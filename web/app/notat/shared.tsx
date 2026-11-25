"use client";

// Shared by the Note routes (Notatoversikt, Story 1.11; Round screen, Story 2.1). Not a route itself.
import { ButtonLink } from "../../components/Button/Button";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Screen } from "../../components/Screen/Screen";
import { t } from "../../i18n/messages";

/** A route parameter, decoded. A malformed escape (for example `/notat/%E0`) gives "", which reads as missing. */
export function decodeParam(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

/** The `note.missing` empty state: a record in the URL is missing or invalid in this browser. */
export function NoteMissing() {
  return (
    <Screen title="note.missing">
      <EmptyState
        heading={t("note.missing")}
        next={t("start.empty.next")}
        actions={
          <ButtonLink href="/" variant="primary">
            {t("gen.back")}
          </ButtonLink>
        }
      />
    </Screen>
  );
}
