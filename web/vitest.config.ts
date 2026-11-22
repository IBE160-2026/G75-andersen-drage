import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "core/**/*.test.ts",
      "extract/**/*.test.ts",
      "storage/**/*.test.ts",
      "api/**/*.test.ts",
      "i18n/**/*.test.ts",
      "components/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
    ],
    environment: "node",
  },
});
