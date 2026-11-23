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
  "err.noKey": "Ingen API-nøkkel er satt opp. Bruk demomodus, eller legg inn en nøkkel i .env.",

  // Page titles (document.title = "{side} · {app.brand}")
  "title.notes": "Dine notater",
  "title.settings": "Innstillinger",

  // Samtykke (Consent dialog). {leverandør} is filled from /api/status (spec 1.3, Decisions).
  "consent.title": "Før du starter",
  "consent.body":
    "Notatet ditt sendes til {leverandør} for å lage kort og quiz. Vil du ikke det, kan du prøve appen med eksempelnotater.",
  "consent.more": "Les mer",
  "consent.more.b": "OpenRouter sender notatet bare til KI-tjenester som verken lagrer det eller bruker det til trening.",
  "consent.more.c": "Appen lagrer og logger ikke innholdet i notatene dine.",
  "consent.more.d": "Notatene og fremgangen din lagres bare i denne nettleseren.",
  "consent.more.e": "Du kan trekke tilbake samtykket når som helst i Innstillinger.",
  "consent.accept": "Jeg forstår, fortsett",
  "consent.decline": "Nei takk, vis demo",
  // [..] marks the inline link that reopens the Consent dialog.
  "consent.declined": "Du har ikke godtatt at notater sendes til {leverandør}. Du kan bruke demomodus, eller [godta nå].",
  "consent.provider.fallback": "OpenRouter",
  // {leverandør} in consent.body once /api/status has answered.
  "consent.provider.model": "{provider} (modellen {model})",

  // Start
  "start.empty": "Dine notater: ingen ennå",
  "start.empty.next": "Last opp en fil, lim inn tekst eller prøv et eksempelnotat.",
  // Drop zone (spec 1.4, Decisions). [..] marks the link-styled part; start.dropzone.types is the second line.
  "start.dropzone": "Slipp en fil her eller [velg fil]",
  "start.dropzone.types": ".txt .md .docx .pdf · maks 10 MB",
  // Note meta after a successful extraction (role="status"); Story 1.9 reuses it.
  "note.meta": "{filnavn} · {ord} ord · {avsnitt} avsnitt",

  // Input rejected (FR-3), inline at the drop zone
  "err.type": "Denne filtypen støttes ikke. Bruk .txt, .md, .docx eller .pdf.",
  "err.size": "Filen er større enn 10 MB. Velg en mindre fil.",
  "err.noText": "Fant ingen tekst i filen. Prøv en annen fil, eller lim inn teksten.",
  "err.scanned": "Skannede PDF-er støttes ikke. Bruk en PDF med tekst, eller lim inn teksten.",
  "err.unreadable": "Filen kunne ikke leses. Prøv å lagre den på nytt, eller lim inn teksten.",
  "err.tooShort": "Notatet er for kort. Det trengs minst 150 ord.",
  "err.tooLong": "Notatet er for langt. Grensen er 15 000 ord; del det opp.",
  "warn.encoding": "Æ, ø og å kan vises feil i dette notatet.",

  // Innstillinger
  "settings.h1": "Innstillinger",
  "settings.consent.h2": "Samtykke",
  "settings.consent.on": "Notatene dine sendes til {leverandør} når du lager kort og quiz.",
  "settings.consent.on.action": "Trekk tilbake samtykke",
  "settings.consent.off": "Notatene dine sendes ikke til {leverandør}. Du kan bruke eksempelnotatene.",
  "settings.consent.off.action": "Godta at notater sendes",
  "settings.consent.withdrawn": "Samtykket er trukket tilbake.",
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey): string {
  return messages[key];
}

/** `t()` with `{name}` placeholders filled from `vars`; unknown placeholders are left as is. */
export function format(key: MessageKey, vars: Record<string, string>): string {
  return t(key).replace(/\{([^{}]+)\}/g, (match, name: string) => (Object.hasOwn(vars, name) ? vars[name] : match));
}

/** EXPERIENCE.md › Page structure: "{side} · Torsas læringsassistent". */
export function pageTitle(side: MessageKey): string {
  return `${t(side)} · ${t("app.brand")}`;
}
