// Should features behind flags (AD-17). An entry point renders only when its flag is true.
// A flag is turned on by the story that completes the feature and stays false if it is cut.

export type FeatureName = "shortcuts" | "panicMode" | "exportImport" | "archive" | "importance" | "darkMode";

export const features: Readonly<Record<FeatureName, boolean>> = {
  shortcuts: false,
  panicMode: false,
  exportImport: false,
  archive: false,
  importance: false,
  darkMode: false,
};
