// StudySet.language check (AD-16): the primary subtag if it is on the allow-list, else `und`.
// The allow-list is not named in the planning docs; chosen in spec 1.8 (Design Notes).

export const LANGUAGE_ALLOW_LIST: readonly string[] = [
  "nb",
  "nn",
  "no",
  "da",
  "sv",
  "fi",
  "is",
  "en",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "pl",
];

export function checkLanguage(tag: string): string {
  const primary = tag.trim().split(/[-_]/)[0].toLowerCase();
  return LANGUAGE_ALLOW_LIST.includes(primary) ? primary : "und";
}
