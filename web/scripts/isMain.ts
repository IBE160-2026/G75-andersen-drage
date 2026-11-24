// True when the module at `moduleUrl` is the script node/tsx was started with (not imported by a test).
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const same = (a: string, b: string) => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);
  return same(resolve(entry), fileURLToPath(moduleUrl));
}
