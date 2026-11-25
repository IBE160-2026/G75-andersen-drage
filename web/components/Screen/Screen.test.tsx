// @vitest-environment happy-dom
// Story 2.1 review VG3, carried into Story 2.2: Screen reruns its title/focus effect only when the title
// text changes, so a re-render with a new but equal `{ key, vars }` object does not steal focus.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pageTitle } from "../../i18n/messages";
import { Screen, ScreenHeading } from "./Screen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(n: string) {
  act(() =>
    root.render(
      <Screen title={{ key: "round.title", vars: { n } }} note="Notat">
        <ScreenHeading>{`Runde ${n}`}</ScreenHeading>
        <button type="button">Annet</button>
      </Screen>,
    ),
  );
}

describe("Screen title/focus effect", () => {
  it("focuses the h1 and sets document.title on mount", () => {
    render("1");
    expect(document.activeElement?.tagName).toBe("H1");
    expect(document.title).toBe(pageTitle({ key: "round.title", vars: { n: "1" } }, "Notat"));
  });

  it("an equal new title object does not refocus the h1", () => {
    render("1");
    const button = container.querySelector("button")!;
    button.focus();
    render("1");
    expect(document.activeElement).toBe(button);
  });

  it("a changed title updates document.title and focuses the h1 again", () => {
    render("1");
    container.querySelector("button")!.focus();
    render("2");
    expect(document.title).toBe(pageTitle({ key: "round.title", vars: { n: "2" } }, "Notat"));
    expect(document.activeElement?.tagName).toBe("H1");
  });
});
