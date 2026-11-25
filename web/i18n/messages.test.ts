// Story 1.3: placeholder formatting and the approved Consent strings.
import { describe, expect, it } from "vitest";
import { format, pageTitle, t } from "./messages";

describe("format", () => {
  it("fills {leverandør} and leaves the rest of the string intact", () => {
    expect(format("consent.declined", { leverandør: "OpenRouter" })).toBe(
      "Du har ikke godtatt at notater sendes til OpenRouter. Du kan bruke demomodus, eller [godta nå].",
    );
  });

  it("fills several placeholders", () => {
    expect(format("consent.provider.model", { provider: "OpenRouter", model: "a/b" })).toBe("OpenRouter (modellen a/b)");
  });

  it("leaves unknown placeholders as they are", () => {
    expect(format("consent.body", {})).toBe(t("consent.body"));
  });
});

describe("pageTitle", () => {
  it("is '{side} · {app.brand}' for a plain screen", () => {
    expect(pageTitle("title.notes")).toBe("Dine notater · Torsas læringsassistent");
  });

  it("adds the Note segment: '{side} · {notat} · …' (Genererer) and '{notat} · …' (Notatoversikt)", () => {
    expect(pageTitle("title.generating", "forelesning-7.pdf")).toBe(
      "Lager kort og quiz · forelesning-7.pdf · Torsas læringsassistent",
    );
    expect(pageTitle(undefined, "forelesning-7")).toBe("forelesning-7 · Torsas læringsassistent");
  });

  it("takes a formatted segment: 'Runde {n} · {notat} · …' (Story 2.1)", () => {
    expect(pageTitle({ key: "round.title", vars: { n: "3" } }, "forelesning-7")).toBe(
      "Runde 3 · forelesning-7 · Torsas læringsassistent",
    );
  });
});
