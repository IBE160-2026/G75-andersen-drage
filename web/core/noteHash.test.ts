// Note Hash (AD-9): SHA-256 lowercase hex of the Passage texts joined by "\n\n".
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { noteHash } from "./noteHash";
import { sha256Hex } from "./sha256";

const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

describe("sha256Hex", () => {
  it("matches the FIPS 180-4 test vectors", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(sha256Hex(enc(""))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex(enc("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex(enc("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("matches node:crypto for every length around the block boundaries and for large input", () => {
    for (let n = 0; n <= 200; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 31 + n) & 0xff);
      expect(sha256Hex(bytes), `length ${n}`).toBe(sha(bytes));
    }
    const big = Uint8Array.from({ length: 300_000 }, (_, i) => (i * 7) & 0xff);
    expect(sha256Hex(big)).toBe(sha(big));
  });
});

describe("noteHash", () => {
  it("hashes the UTF-8 Passage texts joined by a blank line", () => {
    const passages = [
      { id: "p1", text: "Smidig" },
      { id: "p2", text: "Scrum – æøå" },
    ];
    expect(noteHash(passages)).toBe(sha("Smidig\n\nScrum – æøå"));
  });

  it("is 64 lowercase hex characters", () => {
    expect(noteHash([{ id: "p1", text: "a" }])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("depends on the texts only, not on the Passage IDs", () => {
    expect(noteHash([{ id: "x", text: "a" }])).toBe(noteHash([{ id: "p1", text: "a" }]));
  });

  it("changes when the Passage boundaries change", () => {
    const one = noteHash([{ id: "p1", text: "a b" }]);
    const two = noteHash([
      { id: "p1", text: "a" },
      { id: "p2", text: "b" },
    ]);
    expect(one).not.toBe(two);
  });
});
