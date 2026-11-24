// Fixtures and recordings vs. the reference notes (Story 1.13, AD-12). Fixtures are keyed by Note Hash,
// so a change in extraction (new Passages, new hash) must fail here, naming the note and both hashes:
// re-export, re-record and re-promote. The Fixtures and proxy/recordings/passages.json are committed, so a
// missing file fails too. Each Fixture must also be its model's recording and pass the browser Quote Check.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Passage, RawStudySet } from "../core/types";
import { verifyStudySet } from "../core/verifyStudySet";
import { extractNote } from "./text";

const NOTES = new URL("../../reference-notes/", import.meta.url);
const FIXTURES = new URL("../../proxy/fixtures/", import.meta.url);
const RECORDINGS = new URL("../../proxy/recordings/", import.meta.url);
const PASSAGES = new URL("passages.json", RECORDINGS);

type Exported = { note: string; noteHash: string; passages: Passage[] };
type Fixture = { studySet: unknown; model: string };
type Recording = { studySet: unknown; validated: RawStudySet | null };

const readJson = <T>(url: URL): T => JSON.parse(readFileSync(url, "utf8")) as T;
const fixtureHashes = () =>
  readdirSync(FIXTURES)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length))
    .sort();

async function referenceNotes() {
  const names = readdirSync(NOTES)
    .filter((name) => name !== "README.md" && statSync(new URL(name, NOTES)).isFile())
    .sort();
  return Promise.all(
    names.map(async (note) => {
      const result = await extractNote(note, new Uint8Array(readFileSync(new URL(note, NOTES))));
      if (!result.ok) throw new Error(`${note}: extraction failed (${result.error})`);
      return { note, noteHash: result.noteHash, passages: result.note.passages };
    }),
  );
}

describe("Fixtures", () => {
  it("proxy/fixtures/ holds exactly one Fixture per reference note, named by its Note Hash", async () => {
    const fixtures = fixtureHashes();
    const notes = await referenceNotes();
    const problems = [
      ...notes
        .filter(({ noteHash }) => !fixtures.includes(noteHash))
        .map(({ note, noteHash }) => `${note}: no Fixture for Note Hash ${noteHash}`),
      ...fixtures
        .filter((hash) => !notes.some((n) => n.noteHash === hash))
        .map((hash) => `Fixture ${hash}.json matches no reference note`),
    ];
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("proxy/recordings/passages.json matches the current extraction", async () => {
    const exported = readJson<Exported[]>(PASSAGES);
    const notes = await referenceNotes();
    const problems = notes.flatMap(({ note, noteHash, passages }) => {
      const entry = exported.find((e) => e.note === note);
      if (!entry) return [`${note}: missing from passages.json`];
      if (entry.noteHash !== noteHash) return [`${note}: passages.json has ${entry.noteHash}, extraction gives ${noteHash}`];
      if (JSON.stringify(entry.passages) !== JSON.stringify(passages)) return [`${note}: Passages differ from the extraction`];
      return [];
    });
    if (exported.length !== notes.length) problems.push(`passages.json has ${exported.length} notes, expected ${notes.length}`);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("each Fixture is its model's recording and passes verifyStudySet on the exported Passages", () => {
    const exported = readJson<Exported[]>(PASSAGES);
    const hashes = fixtureHashes();
    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of hashes) {
      const fixture = readJson<Fixture>(new URL(`${hash}.json`, FIXTURES));
      const recording = readJson<Recording>(new URL(`${fixture.model.replaceAll("/", "__")}/${hash}.json`, RECORDINGS));
      expect(recording.studySet, hash).toEqual(fixture.studySet);
      const passages = exported.find((e) => e.noteHash === hash)?.passages;
      expect(passages, `${hash}: not in passages.json`).toBeDefined();
      expect(recording.validated, `${hash}: validated is null`).not.toBeNull();
      const result = verifyStudySet(recording.validated!, passages!);
      expect(result.ok ? "ok" : result.code, hash).toBe("ok");
    }
  });
});
