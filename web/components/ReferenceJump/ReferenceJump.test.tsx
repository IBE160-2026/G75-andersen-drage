// HighlightedText (DESIGN.md › Quote highlight): the whole Passage text survives, with one <mark> around the
// Quote bracketed by quote.start / quote.end; no match or no Quote renders the text plain (Story 1.12).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "../../i18n/messages";
import { HighlightedText } from "./ReferenceJump";

const TEXT = "Før sitatet. Dette er selve sitatet i avsnittet. Etter sitatet.";
const QUOTE = "Dette er selve sitatet i avsnittet.";

describe("HighlightedText", () => {
  it("keeps the text before and after, with one mark between the hidden markers", () => {
    const html = renderToStaticMarkup(<HighlightedText text={TEXT} quote={QUOTE} />);
    expect(html.match(/<mark/g)).toHaveLength(1);
    const order = [
      "Før sitatet.",
      t("quote.start"),
      `>${QUOTE}</mark>`,
      t("quote.end"),
      "Etter sitatet.",
    ].map((part) => html.indexOf(part));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("renders the full text plain when the Quote is not found or null", () => {
    for (const quote of ["finnes ikke i teksten", null]) {
      const html = renderToStaticMarkup(<HighlightedText text={TEXT} quote={quote} />);
      expect(html).toBe(TEXT);
    }
  });
});
