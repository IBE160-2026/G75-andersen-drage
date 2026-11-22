// ErrorMessage (DESIGN.md › Error message): role="alert", "Feil:" before the text, aria-hidden icon, optional actions.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "../../i18n/messages";
import { ErrorMessage } from "./ErrorMessage";

describe("ErrorMessage", () => {
  const html = renderToStaticMarkup(<ErrorMessage text="melding" />);

  it("is an alert", () => {
    expect(html).toMatch(/^<div[^>]*role="alert"/);
  });

  it("renders the err.prefix text before the message", () => {
    const prefix = html.indexOf(t("err.prefix"));
    expect(prefix).toBeGreaterThan(-1);
    expect(prefix).toBeLessThan(html.indexOf("melding"));
  });

  it("has an aria-hidden icon", () => {
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("renders the actions slot only when given", () => {
    expect(html).not.toContain("<button");
    const withActions = renderToStaticMarkup(<ErrorMessage text="melding" actions={<button type="button">a</button>} />);
    expect(withActions).toContain('<button type="button">a</button>');
  });
});
