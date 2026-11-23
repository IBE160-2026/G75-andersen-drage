// Pending Button (I/O matrix): aria-disabled, activation ignored, still focusable.
import type { MouseEvent, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

type ButtonElement = ReactElement<{ onClick: (e: MouseEvent<HTMLButtonElement>) => void }>;

function fakeClick() {
  return { preventDefault: vi.fn() } as unknown as MouseEvent<HTMLButtonElement> & { preventDefault: ReturnType<typeof vi.fn> };
}

describe("Button", () => {
  it("marks a pending button aria-disabled but keeps it focusable", () => {
    const html = renderToStaticMarkup(<Button pending>x</Button>);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(html).toContain('type="button"');
  });

  it("ignores activation while pending", () => {
    const onClick = vi.fn();
    const element = Button({ pending: true, onClick, children: "x" }) as ButtonElement;
    const event = fakeClick();
    element.props.onClick(event);
    expect(onClick).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("calls onClick when not pending, without aria-disabled", () => {
    const onClick = vi.fn();
    const element = Button({ onClick, children: "x" }) as ButtonElement;
    element.props.onClick(fakeClick());
    expect(onClick).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(<Button>x</Button>)).not.toContain("aria-disabled");
  });
});
