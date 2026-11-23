// EmptyState (DESIGN.md › Empty state): h1 (tabindex="-1") + next-step line + optional actions.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  const html = renderToStaticMarkup(<EmptyState heading="overskrift" next="neste steg" />);

  it("renders the heading as a programmatically focusable h1", () => {
    expect(html).toMatch(/<h1[^>]*tabindex="-1"[^>]*>overskrift<\/h1>/);
  });

  it("renders the next-step line after the h1", () => {
    expect(html).toMatch(/<\/h1><p[^>]*>neste steg<\/p>/);
  });

  it("renders the actions slot only when given", () => {
    expect(html).not.toContain("<button");
    const withActions = renderToStaticMarkup(
      <EmptyState heading="overskrift" next="neste steg" actions={<button type="button">a</button>} />,
    );
    expect(withActions).toContain('<button type="button">a</button>');
  });
});
