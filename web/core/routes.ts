// The app's route builders (AD-3 purity: plain strings, no dependencies). One home for every `/notat/…`
// path, used by components/ and app/ alike.

/** Notatoversikt's route; Note keys keep their `demo:` prefix. */
export function notePath(noteHash: string): string {
  return `/notat/${noteHash}`;
}

/** The Round screen's route; Note keys keep their `demo:` prefix, as on `/notat/{noteHash}`. */
export function roundPath(noteHash: string, roundId: string): string {
  return `${notePath(noteHash)}/runde/${roundId}`;
}

/** Resultat's route (Story 2.4): the complete Round's route + `/resultat`. */
export function resultPath(noteHash: string, roundId: string): string {
  return `${roundPath(noteHash, roundId)}/resultat`;
}
