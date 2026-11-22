// Story 1.2 guards for the shell plumbing (AD-15, AD-16, AD-17):
// tokens match DESIGN.md, components never use hex, Should flags are off,
// and every message key used in components/ and app/ exists.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { features } from "../features";
import { messages } from "../i18n/messages";

const WEB = fileURLToPath(new URL("..", import.meta.url));
// The test image copies DESIGN.md to the same relative path (e2e/Dockerfile, .dockerignore).
const DESIGN_MD = join(WEB, "..", ".docs/planning-artifacts/ux-designs/ux-G75-andersen-drage-2026-11-10/DESIGN.md");

function walk(dir: string, match: (file: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, match);
    return match(path) ? [path] : [];
  });
}

const sourceDirs = ["components", "app"].map((d) => join(WEB, d));
const moduleCss = sourceDirs.flatMap((d) => walk(d, (f) => f.endsWith(".module.css")));
// Every stylesheet that must use tokens: styles/ (global.css), components/, app/; not tokens.css.
const TOKENS_CSS = join(WEB, "styles/tokens.css");
const tokenUsers = [join(WEB, "styles"), ...sourceDirs].flatMap((d) =>
  walk(d, (f) => f.endsWith(".css") && f !== TOKENS_CSS),
);
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const uiSources = sourceDirs.flatMap((d) => walk(d, (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)));

type Token = { name: string; value: string; dark: boolean };

/** Minimal reader for the DESIGN.md frontmatter groups colors, typography, rounded, spacing. */
function designTokens(markdown: string): Token[] {
  const frontmatter = markdown.replace(/\r/g, "").split("\n---\n")[0].split("\n");
  const groups = new Set(["colors", "typography", "rounded", "spacing"]);
  const clean = (v: string) =>
    v.replace(/\s+#.*$/, "").trim().replace(/^'(.*)'$/, "$1").replace(/^"(.*)"$/, "$1");
  const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  const rem = (v: string) => {
    const px = v.match(/^([\d.]+)px$/);
    return px ? `${Number(px[1]) / 16}rem` : v;
  };
  const tokens: Token[] = [];
  let group: string | null = null;
  let role: string | null = null;
  for (const line of frontmatter) {
    const top = line.match(/^([a-z-]+):/);
    if (top) {
      group = groups.has(top[1]) ? top[1] : null;
      continue;
    }
    if (!group || !line.trim() || /^\s*#/.test(line)) continue;
    let m: RegExpMatchArray | null;
    let name: string;
    let value: string;
    if (group === "typography") {
      if ((m = line.match(/^ {2}([a-z-]+):\s*(#.*)?$/))) {
        role = m[1];
        continue;
      }
      m = line.match(/^ {4}([A-Za-z]+):\s*(.+)$/);
      if (!m || !role) continue;
      const dark = role.endsWith("-dark");
      const base = dark ? role.slice(0, -5) : role;
      name = `--typography-${base}-${kebab(m[1])}`;
      value = m[1] === "fontSize" ? rem(clean(m[2])) : clean(m[2]);
      tokens.push({ name, value, dark });
      continue;
    }
    m = line.match(/^ {2}'?([a-z0-9-]+)'?:\s*(.+)$/);
    if (!m) continue;
    const dark = m[1].endsWith("-dark");
    name = `--${group}-${dark ? m[1].slice(0, -5) : m[1]}`;
    value = clean(m[2]);
    tokens.push({ name, value, dark });
  }
  return tokens;
}

function declarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block in tokens.css`).toBeGreaterThanOrEqual(0);
  const block = css.slice(start, css.indexOf("}", start));
  const map = new Map<string, string>();
  for (const m of block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) map.set(m[1], m[2].trim());
  return map;
}

describe("design tokens (AD-15)", () => {
  const css = readFileSync(join(WEB, "styles/tokens.css"), "utf8");
  const light = declarations(css, ":root");
  const dark = declarations(css, '[data-theme="dark"]');

  it("finds DESIGN.md", () => {
    expect(existsSync(DESIGN_MD), DESIGN_MD).toBe(true);
  });

  it("defines every DESIGN.md token, light in :root and -dark values in [data-theme=dark]", () => {
    const tokens = designTokens(readFileSync(DESIGN_MD, "utf8"));
    expect(tokens.length).toBeGreaterThan(100);
    expect(tokens.some((tk) => tk.dark)).toBe(true);
    for (const tk of tokens) {
      const block = tk.dark ? dark : light;
      expect(block.get(tk.name), `${tk.dark ? "dark" : "light"} ${tk.name}`).toBe(tk.value);
    }
  });

  it("writes every font size in rem", () => {
    for (const [name, value] of [...light, ...dark]) {
      if (name.endsWith("-font-size")) expect(value, name).toMatch(/rem$/);
    }
  });

  it("finds the component CSS Modules and global.css", () => {
    expect(moduleCss.length).toBeGreaterThan(0);
    expect(tokenUsers).toContain(join(WEB, "styles/global.css"));
  });

  it.each(tokenUsers.map((f) => [relative(WEB, f), f]))("%s uses tokens, no hex colours", (_name, file) => {
    expect(stripComments(readFileSync(file, "utf8"))).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it.each(tokenUsers.map((f) => [relative(WEB, f), f]))("%s only references tokens declared in :root", (_name, file) => {
    const used = [...stripComments(readFileSync(file, "utf8")).matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((name) => !light.has(name))).toEqual([]);
  });
});

describe("feature flags (AD-17)", () => {
  it("keeps every Should flag off", () => {
    expect(Object.keys(features).sort()).toEqual(
      ["archive", "darkMode", "exportImport", "importance", "panicMode", "shortcuts"],
    );
    for (const [name, on] of Object.entries(features)) expect(on, name).toBe(false);
  });
});

describe("UI text (AD-16)", () => {
  it("finds the UI sources", () => {
    expect(uiSources.length).toBeGreaterThan(0);
  });

  it("uses only message keys that exist", () => {
    const used = new Set<string>();
    for (const file of uiSources) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/\b(?:t|pageTitle)\(\s*["']([^"']+)["']/g)) used.add(m[1]);
      for (const m of src.matchAll(/\btitle="([^"]+)"/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const key of used) expect(Object.hasOwn(messages, key), key).toBe(true);
  });

  it.each(uiSources.map((f) => [relative(WEB, f), f]))("%s has no hard-coded JSX text", (_name, file) => {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const text: string[] = [];
    const TEXT_ATTRS = ["aria-label", "aria-description", "aria-roledescription", "label", "title", "alt", "placeholder"];
    const hasLetter = (s: string) => /\p{L}/u.test(s);
    const literal = (node: ts.Node | undefined): string | undefined =>
      node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
    const visit = (node: ts.Node) => {
      // Literal JSX text with a letter in it, e.g. <p>Hei</p>.
      if (ts.isJsxText(node) && hasLetter(node.text)) text.push(node.text.trim());
      // A string literal as a direct JSX child, e.g. <p>{"Hei"}</p> or <p>{`Hei`}</p>.
      if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
        const value = literal(node.expression);
        if (value !== undefined && hasLetter(value)) text.push(`{"${value}"}`);
      }
      // Literal text attributes, e.g. aria-label="Meny" or aria-label={"Meny"}.
      // Screen's title="title.x" is a message key, so own keys of messages are allowed.
      if (ts.isJsxAttribute(node) && node.initializer) {
        const attr = node.name.getText(source);
        const init = node.initializer;
        const value = ts.isJsxExpression(init) ? literal(init.expression) : literal(init);
        if (TEXT_ATTRS.includes(attr) && value !== undefined && hasLetter(value) && !Object.hasOwn(messages, value)) {
          text.push(`${attr}="${value}"`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(text).toEqual([]);
  });

  it("keeps message values non-empty", () => {
    for (const [key, value] of Object.entries(messages)) expect(value.trim(), key).not.toBe("");
  });
});
