// .docx extraction (spec 1.5 Design Notes): the HTML walk is tested on mammoth-shaped HTML strings;
// docxParagraphs on real files is covered by reference-notes.test.ts.
import { describe, expect, it } from "vitest";
import { docxParagraphs, htmlToParagraphs } from "./docx";

describe("htmlToParagraphs", () => {
  it("gives one paragraph per p and heading, and decodes entities", () => {
    expect(htmlToParagraphs("<h1>Tittel</h1><p>Én &amp; to &lt;3&gt;</p><h3>Under</h3><p>Tekst</p>")).toEqual([
      "Tittel",
      "Én & to <3>",
      "Under",
      "Tekst",
    ]);
  });

  it("keeps inline markup text and turns br into a line break", () => {
    expect(htmlToParagraphs("<p><strong>Fet:</strong> og <em>kursiv</em><br />neste linje</p>")).toEqual([
      "Fet: og kursiv\nneste linje",
    ]);
  });

  it("drops empty paragraphs and images", () => {
    expect(htmlToParagraphs('<p></p><p>   </p><p><img src="data:image/png;base64,AAAA" alt="bilde" /></p><p>Tekst</p>')).toEqual([
      "Tekst",
    ]);
  });

  it("joins stray text to the current paragraph", () => {
    expect(htmlToParagraphs("løs tekst<p>Avsnitt</p>mer løs")).toEqual(["løs tekst", "Avsnitt", "mer løs"]);
  });

  it("makes each li its own paragraph; an li ends at a nested list and nested items are their own", () => {
    const html = "<ul><li>Byte: åtte bit<ul><li>0 til 255</li><li>Eksempel</li></ul></li><li>Neste<p>inni</p></li></ul>";
    expect(htmlToParagraphs(html)).toEqual(["Byte: åtte bit", "0 til 255", "Eksempel", "Neste", "inni"]);
  });

  it("makes each table row one line, cells joined by ' | ', empty cells kept as ''", () => {
    const html =
      "<table><tr><td></td><td><p>Stat</p></td><td><p>Kommune</p></td></tr>" +
      "<tr><td><p>Ressurser</p></td><td><p>62,2</p></td><td></td></tr></table>";
    expect(htmlToParagraphs(html)).toEqual([" | Stat | Kommune", "Ressurser | 62,2 | "]);
  });

  it("writes a merged cell once and joins blocks in a cell with a space", () => {
    const html =
      '<table><tr><th colspan="3"><p><strong>Tittel</strong></p></th></tr>' +
      '<tr><td rowspan="2"><p>En</p><p>to</p><ul><li>tre</li></ul></td><td><p>a</p></td></tr>' +
      "<tr><td><p>b</p></td></tr></table><p>Etter</p>";
    expect(htmlToParagraphs(html)).toEqual(["Tittel", "En to tre | a", "b", "Etter"]);
  });

  it("ends the current paragraph at a table", () => {
    expect(htmlToParagraphs("<li>punkt<table><tr><td>x</td><td>y</td></tr></table></li>")).toEqual(["punkt", "x | y"]);
  });

  it("puts a nested table's rows into the outer cell", () => {
    const html = "<table><tr><td><table><tr><td>a</td><td>b</td></tr></table></td><td>c</td></tr></table>";
    expect(htmlToParagraphs(html)).toEqual(["a | b | c"]);
  });

  it("keeps footnote markers [n] and drops the ↑ back-links", () => {
    const html =
      '<p>Påstand<sup><a href="#footnote-1" id="footnote-ref-1">[1]</a></sup> og mer<sup><a href="#endnote-1" id="endnote-ref-1">[2]</a></sup>.</p>' +
      '<ol><li id="footnote-1"><p>Kilden. <a href="#footnote-ref-1">↑</a></p></li>' +
      '<li id="endnote-1"><p>Slutt <a href="#endnote-ref-1"><span>↑</span></a></p></li></ol>';
    expect(htmlToParagraphs(html)).toEqual(["Påstand[1] og mer[2].", "Kilden. ", "Slutt "]);
  });

  it("keeps the text of ordinary links", () => {
    expect(htmlToParagraphs('<p>Se <a href="https://eksempel.no">eksempel.no</a></p>')).toEqual(["Se eksempel.no"]);
  });

  it("returns nothing for empty HTML", () => {
    expect(htmlToParagraphs("")).toEqual([]);
  });
});

describe("docxParagraphs", () => {
  it("throws on bytes that are not a Word file", async () => {
    await expect(docxParagraphs(new TextEncoder().encode("ikke en zip"))).rejects.toThrow();
  });
});
