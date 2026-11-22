// Every UI string (AD-16, NFR-9). Keys follow EXPERIENCE.md › Microcopy; keys that the
// Microcopy table lacks use the same `surface.item` scheme (spec 1.2, Decisions).
// Later stories add their keys here; components never hard-code visible text.

export const messages = {
  // Global
  "app.brand": "Torsas læringsassistent",
  "skip.link": "Gå til hovedinnhold",
  "topbar.more": "Mer",
  "nav.notes": "Dine notater",
  "nav.settings": "Innstillinger",
  "nav.label": "Hovedmeny",
  "err.prefix": "Feil:",

  // Page titles (document.title = "{side} · {app.brand}")
  "title.notes": "Dine notater",
  "title.settings": "Innstillinger",

  // Start
  "start.empty": "Dine notater: ingen ennå",
  "start.empty.next": "Last opp en fil, lim inn tekst eller prøv et eksempelnotat.",

  // Innstillinger
  "settings.h1": "Innstillinger",
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey): string {
  return messages[key];
}

/** EXPERIENCE.md › Page structure: "{side} · Torsas læringsassistent". */
export function pageTitle(side: MessageKey): string {
  return `${t(side)} · ${t("app.brand")}`;
}
