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
  // Top bar pill while Demo Mode is on; a link to Innstillinger (approved, Story 1.14).
  "demo.indicator": "Demomodus",
  // Proxy 404 for mode "demo" with a Note that has no Fixture (EXPERIENCE.md › Microcopy, draft).
  "err.demoOnly": "Demomodus støtter bare eksempelnotatene.",

  // Page titles (document.title = "{side} · {app.brand}")
  "title.notes": "Dine notater",
  "title.settings": "Innstillinger",
  // Genererer: also its h1 (EXPERIENCE.md › Page structure: "Lager kort og quiz · {notat} · …").
  "title.generating": "Lager kort og quiz",
  // Demovelger (Story 1.14, D-16): title and h1 from EXPERIENCE.md › Page structure.
  "title.demo": "Velg et eksempelnotat",

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
  // Link to Demovelger (EXPERIENCE.md › Screen inventory, Story 1.14, D-16).
  "start.demo": "Prøv demomodus",

  // Demovelger (Story 1.14, D-16). demo.lang.* is each sample note's language, shown under its title.
  "demo.h1": "Velg et eksempelnotat",
  "demo.lang.nb": "Norsk",
  "demo.lang.en": "Engelsk",

  // Input rejected (FR-3), inline at the drop zone
  "err.type": "Denne filtypen støttes ikke. Bruk .txt, .md, .docx eller .pdf.",
  "err.size": "Filen er større enn 10 MB. Velg en mindre fil.",
  "err.noText": "Fant ingen tekst i filen. Prøv en annen fil, eller lim inn teksten.",
  "err.scanned": "Skannede PDF-er støttes ikke. Bruk en PDF med tekst, eller lim inn teksten.",
  "err.unreadable": "Filen kunne ikke leses. Prøv å lagre den på nytt, eller lim inn teksten.",
  "err.tooShort": "Notatet er for kort. Det trengs minst 150 ord.",
  "err.tooLong": "Notatet er for langt. Grensen er 15 000 ord; del det opp.",
  "warn.encoding": "Æ, ø og å kan vises feil i dette notatet.",

  // Genererer (draft Microcopy). The 'Prøv igjen' / 'Tilbake til start' buttons are separate keys.
  // gen.status is split into one key per step (D-11); each step is announced once via role="status".
  "gen.status.concepts": "Finner nøkkelbegreper …",
  "gen.status.cards": "Lager kort …",
  "gen.status.sources": "Sjekker kildene …",
  // Accessible name of the time-based progress bar (D-11).
  "gen.progress": "Fremdrift",
  "gen.back": "Tilbake til start",
  // Primary action after err.generation / err.tooFewItems: a fresh request, never automatic (D-12).
  "gen.retry": "Prøv igjen",
  "err.generation": "Det gikk ikke å lage kort og quiz nå.",
  "err.tooFewItems": "For få kort eller spørsmål kunne knyttes til notatet ditt.",

  // Notatoversikt empty state: the Note or its Study Set is missing or invalid in this browser (D-11, Story 1.11).
  "note.missing": "Fant ikke notatet",

  // Notatoversikt (Story 1.11, D-13). {id} is the Passage label "P4"; {filnavn} is "{title}.{sourceType}".
  "overview.summary": "Sammendrag",
  "overview.concepts": "Nøkkelbegreper",
  "overview.notCovered": "ingen verifiserte elementer",
  "mastery.new": "ny",
  "source.ref": "Kilde: {id}",
  "source.label": "Kilde · {filnavn}",
  "source.aria": "Kilde: {filnavn}",
  "tabs.study": "Studier",
  "tabs.source": "Kilde",
  // 'Start runde' starts a Round (Story 2.1); the hint says how Rounds are composed (decided by Tor 2026-11-24).
  "overview.start": "Start runde",
  "overview.start.hint": "Usikre begreper kommer først.",
  "err.noConcepts": "Fant ingen nøkkelbegreper med verifisert kilde, så runden kan ikke starte.",

  // Runde (Story 2.1, D-18; approved by Tor 2026-11-25). round.title is the h1 and the page-title segment;
  // round.review ships with its EXPERIENCE.md text. mastery.* label the Mastery chip (text, never colour alone).
  "round.title": "Runde {n}",
  "round.item.card": "Kort {x} av {y}",
  "round.review": "Du kan alle nøkkelbegrepene. Dette er en repetisjonsrunde.",
  "mastery.shaky": "usikker",
  "mastery.known": "kan",

  // Reference jump (Story 1.12, D-14). quote.* bracket the <mark> for screen readers; {id} is "P4" and
  // {kilde} names where the student came from. Notatoversikt's context decided by Tor 2026-11-24.
  "quote.start": "Sitat start",
  "quote.end": "Sitat slutt",
  "return.label": "Viser {id} fra {kilde}",
  "return.hint": "Trykk Esc for å gå tilbake.",
  "return.from.summary": "sammendraget",
  "return.summary": "Tilbake til sammendraget",

  // Innstillinger
  "settings.h1": "Innstillinger",
  "settings.consent.h2": "Samtykke",
  "settings.consent.on": "Notatene dine sendes til {leverandør} når du lager kort og quiz.",
  "settings.consent.on.action": "Trekk tilbake samtykke",
  "settings.consent.off": "Notatene dine sendes ikke til {leverandør}. Du kan bruke eksempelnotatene.",
  "settings.consent.off.action": "Godta at notater sendes",
  "settings.consent.withdrawn": "Samtykket er trukket tilbake.",
  // Innstillinger › Studier (Story 1.14, D-16; EXPERIENCE.md › Microcopy settings.demo, toggle.state).
  "settings.studies.h2": "Studier",
  "settings.demo": "Demomodus",
  "settings.demo.desc": "Bruk bare eksempelnotatene, uten kall til {leverandør}.",
  "toggle.on": "På",
  "toggle.off": "Av",
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey): string {
  return messages[key];
}

/** `t()` with `{name}` placeholders filled from `vars`; unknown placeholders are left as is. */
export function format(key: MessageKey, vars: Record<string, string>): string {
  return t(key).replace(/\{([^{}]+)\}/g, (match, name: string) => (Object.hasOwn(vars, name) ? vars[name] : match));
}

/** A message key with its placeholder values, for a formatted page-title segment ("Runde {n}"). */
export type FormattedMessage = { key: MessageKey; vars: Record<string, string> };

/**
 * EXPERIENCE.md › Page structure: "{side} · Torsas læringsassistent", with an optional Note segment:
 * "{side} · {notat} · …" (Genererer, Runde) or "{notat} · …" (a Note's own screens, titled by the Note).
 * `side` is a key, or a key with values (Story 2.1); `note` is the Note's name as the student gave it.
 */
export function pageTitle(side?: MessageKey | FormattedMessage, note?: string): string {
  const sideText = side === undefined ? null : typeof side === "string" ? t(side) : format(side.key, side.vars);
  return [sideText, note || null, t("app.brand")].filter((part) => part !== null).join(" · ");
}
