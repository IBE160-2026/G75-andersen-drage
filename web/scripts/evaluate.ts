// Story 1.13, step 3 (PRD OQ1, AD-12): compares the recorded models on the reference notes.
// Reads only proxy/recordings/ (no network, no key): passages.json from `npm run export-passages`
// and one folder per model from proxy/scripts/record_fixtures.py. Usage: `npm run evaluate` (from web/).
//
// Per model × note: Quote Check pass rate over the Proxy-validated Items (`validated`, since
// verifyStudySet expects the Proxy-trimmed StudySet), surviving Flashcards / Quiz Questions /
// Summary Points after verifyStudySet, its result code, and the generation time.
// Choice rule (spec 1.13), in order: highest mean pass rate, among models with no note below the
// err.tooFewItems floor (every note `ok`); then most surviving Items; then fastest mean generation.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isMain } from "./isMain";
import { normalize } from "../core/normalize";
import type { Passage, RawStudySet } from "../core/types";
import { quoteCheck, verifyStudySet } from "../core/verifyStudySet";

const RECORDINGS = new URL("../../proxy/recordings/", import.meta.url);

export type ExportedNote = { note: string; noteHash: string; passages: Passage[] };
export type Recording = {
  studySet: unknown;
  validated: RawStudySet | null;
  model: string;
  generationMs?: number;
  error?: string;
};

type Cell =
  | { kind: "missing" }
  | { kind: "failed"; ms: number | null }
  | {
      kind: "recorded";
      passRate: number | null;
      flashcards: number | null;
      quizQuestions: number | null;
      summaryPoints: number | null;
      code: string;
      ms: number | null;
    };

const readJson = <T>(url: URL): T => JSON.parse(readFileSync(url, "utf8")) as T;

/** Share of quoted Items (Flashcards, Quiz Questions, Summary Points) whose Quote passes the Quote Check. */
function passRate(set: RawStudySet, passages: readonly Passage[]): number | null {
  const byId = new Map(passages.map((p) => [p.id, p] as const));
  const quoted = [
    ...set.concepts.flatMap((c) => [...c.flashcards, ...c.quizQuestions]),
    ...set.summaryPoints,
  ];
  if (!quoted.length) return null;
  return quoted.filter((item) => quoteCheck(item.passageId, item.quote, byId) !== null).length / quoted.length;
}

/** Surviving Items as verifyStudySet would keep them; also counted when a floor rejects the set. */
function survivors(set: RawStudySet, passages: readonly Passage[]) {
  const result = verifyStudySet(set, passages);
  if (result.ok) {
    const { concepts, summaryPoints } = result.set;
    return {
      code: "ok",
      flashcards: concepts.reduce((n, c) => n + c.flashcards.length, 0),
      quizQuestions: concepts.reduce((n, c) => n + c.quizQuestions.length, 0),
      summaryPoints: summaryPoints.length,
    };
  }
  // Same checks without the floors (duplicate concepts are not dropped here; the count is indicative).
  const byId = new Map(passages.map((p) => [p.id, p] as const));
  const passes = (item: { passageId: string; quote: string }) => quoteCheck(item.passageId, item.quote, byId) !== null;
  return {
    code: result.code,
    flashcards: set.concepts.reduce((n, c) => n + c.flashcards.filter(passes).length, 0),
    quizQuestions: set.concepts.reduce(
      (n, c) => n + c.quizQuestions.filter((q) => passes(q) && new Set(q.options.map(normalize)).size === q.options.length).length,
      0,
    ),
    summaryPoints: set.summaryPoints.filter(passes).length,
  };
}

function evaluateCell(recording: Recording | null, passages: readonly Passage[]): Cell {
  if (!recording) return { kind: "missing" };
  const ms = typeof recording.generationMs === "number" ? recording.generationMs : null;
  if (recording.studySet === null || recording.error) return { kind: "failed", ms };
  if (!recording.validated) {
    // The Proxy's count rules reject this draft: live, it would be err.generation.
    return { kind: "recorded", passRate: null, flashcards: null, quizQuestions: null, summaryPoints: null, code: "rejected", ms };
  }
  return { kind: "recorded", passRate: passRate(recording.validated, passages), ...survivors(recording.validated, passages), ms };
}

const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)} %`);
const num = (x: number | null) => (x === null ? "—" : String(x));
const ms = (x: number | null) => (x === null ? "—" : `${Math.round(x)} ms`);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function table(rows: string[][]): string {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  return rows.map((r) => r.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd()).join("\n");
}

export type ModelSummary = {
  slug: string;
  model: string;
  /** Mean over every exported note; a missing, failed or rejected note counts as 0. */
  meanPassRate: number | null;
  /** Surviving Flashcards + Quiz Questions + Summary Points over all notes. */
  items: number;
  meanMs: number | null;
  /** Every note recorded and `ok` (none below the err.tooFewItems floor). */
  allOk: boolean;
};
export type Evaluation = {
  /** One row per model × note: model, note, pass rate, flashcards, quiz, summary, verify, ms. */
  rows: string[][];
  summary: ModelSummary[];
  winner: ModelSummary | null;
};

const HEADER = ["model", "note", "pass rate", "flashcards", "quiz", "summary", "verify", "ms"];

/** Pure: compares the recordings (`recordingsBySlug[slug][noteHash]`, absent = not recorded). */
export function evaluate(
  notes: readonly ExportedNote[],
  recordingsBySlug: Readonly<Record<string, Readonly<Record<string, Recording | undefined>>>>,
): Evaluation {
  const rows: string[][] = [];
  const summary: ModelSummary[] = [];

  for (const slug of Object.keys(recordingsBySlug).sort()) {
    const cells = notes.map((note) => {
      const recording = recordingsBySlug[slug][note.noteHash] ?? null;
      return { note, recording, cell: evaluateCell(recording, note.passages) };
    });
    const model = cells.find((c) => c.recording)?.recording?.model ?? slug;
    for (const { note, cell } of cells) {
      if (cell.kind === "missing") rows.push([model, note.note, "—", "—", "—", "—", "—", "—"]);
      else if (cell.kind === "failed") rows.push([model, note.note, "failed", "—", "—", "—", "failed", ms(cell.ms)]);
      else
        rows.push([
          model,
          note.note,
          pct(cell.passRate),
          num(cell.flashcards),
          num(cell.quizQuestions),
          num(cell.summaryPoints),
          cell.code,
          ms(cell.ms),
        ]);
    }

    const recorded = cells.flatMap(({ cell }) => (cell.kind === "recorded" ? [cell] : []));
    summary.push({
      slug,
      model,
      meanPassRate: mean(cells.map(({ cell }) => (cell.kind === "recorded" ? (cell.passRate ?? 0) : 0))),
      items: recorded.reduce((n, c) => n + (c.flashcards ?? 0) + (c.quizQuestions ?? 0) + (c.summaryPoints ?? 0), 0),
      meanMs: mean(cells.flatMap(({ cell }) => (cell.kind !== "missing" && cell.ms !== null ? [cell.ms] : []))),
      allOk: recorded.length === notes.length && recorded.every((c) => c.code === "ok"),
    });
  }

  // Choice rule: the floor excludes; then pass rate (rounded to the printed 0.1 %, so float noise
  // never skips the tie-breaks), surviving Items, generation time.
  const permille = (rate: number) => Math.round(rate * 1000);
  const candidates = summary
    .filter((s) => s.allOk && s.meanPassRate !== null && s.meanMs !== null)
    .sort(
      (a, b) =>
        permille(b.meanPassRate!) - permille(a.meanPassRate!) || b.items - a.items || a.meanMs! - b.meanMs!,
    );
  return { rows, summary, winner: candidates[0] ?? null };
}

/** The console report printed by `npm run evaluate`. */
export function report({ rows, summary, winner }: Evaluation): string {
  const summaryRows = [
    ["model", "mean pass rate", "surviving Items", "mean ms", "all notes ok"],
    ...summary.map((s) => [s.model, pct(s.meanPassRate), String(s.items), ms(s.meanMs), s.allOk ? "yes" : "no"]),
  ];
  const choice = winner
    ? `Choice: ${winner.model} (promote with --promote ${winner.slug})`
    : "Choice: none (no model has every note at or above the err.tooFewItems floor)";
  return [table([HEADER, ...rows]), "", table(summaryRows), "", choice].join("\n");
}

function main(): number {
  const passagesFile = new URL("passages.json", RECORDINGS);
  if (!existsSync(passagesFile)) {
    console.error("proxy/recordings/passages.json is missing: run `npm run export-passages` first.");
    return 1;
  }
  const notes = readJson<ExportedNote[]>(passagesFile);
  const slugs = readdirSync(RECORDINGS).filter((name) => statSync(new URL(name, RECORDINGS)).isDirectory());
  if (!slugs.length) {
    console.log("No recordings yet: run proxy/scripts/record_fixtures.py --model <name> first.");
    return 0;
  }
  const recordingsBySlug = Object.fromEntries(
    slugs.map((slug) => [
      slug,
      Object.fromEntries(
        notes.flatMap((note) => {
          const file = new URL(`${slug}/${note.noteHash}.json`, RECORDINGS);
          return existsSync(file) ? [[note.noteHash, readJson<Recording>(file)]] : [];
        }),
      ),
    ]),
  );
  console.log(report(evaluate(notes, recordingsBySlug)));
  return 0;
}

// Runs only when executed directly (`npm run evaluate`), not when a test imports the module.
if (isMain(import.meta.url)) process.exit(main());
