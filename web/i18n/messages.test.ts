// Story 1.3: placeholder formatting and the approved Consent strings.
import { describe, expect, it } from "vitest";
import { format, t } from "./messages";

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
