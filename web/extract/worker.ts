// Extraction Web Worker (AD-8): reads the File and runs extractNote off the main thread.
// The client terminates it after one answer, on error, or at the 15 s timeout.
import { extractNote, type ExtractResult } from "./text";

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ file: File }>) => void) | null;
  postMessage(message: ExtractResult): void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = async (event) => {
  let result: ExtractResult;
  try {
    const { file } = event.data;
    result = await extractNote(file.name, new Uint8Array(await file.arrayBuffer()));
  } catch {
    result = { ok: false, error: "err.unreadable" };
  }
  scope.postMessage(result);
};
