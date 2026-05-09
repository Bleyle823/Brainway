/**
 * Shared utilities for the Transform / Safe-images / Safe-audio routes.
 * Kept tiny and free of UI imports so each route stays self-contained.
 */

/** Max file size we'll accept as a data URI (12 MB unencoded → ~16 MB base64) */
export const MAX_DATAURI_BYTES = 12 * 1024 * 1024;

/** Max image size for data-URI reference upload (adapt-from-image) */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Poll interval while a Runway task is running */
export const POLL_INTERVAL_MS = 5_000;

/** Total visible steps in the ProcessingPipeline component */
export const TOTAL_PIPELINE_STEPS = 9;

/** Convert a File to a base64 data URI */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Map a Runway task's status / progress (0–1) to one of the 9 pipeline step
 * indices so the ProcessingPipeline UI reflects real progress.
 */
export function mapProgressToStep(
  status: string,
  progress: number | undefined,
): number {
  if (status === "PENDING") return 1;
  if (status === "RUNNING") {
    const p = progress ?? 0;
    return Math.min(Math.max(Math.floor(p * 7) + 2, 2), 7);
  }
  if (status === "SUCCEEDED") return TOTAL_PIPELINE_STEPS;
  return 0;
}

/** Returns true for a syntactically valid HTTP/HTTPS URL string */
export function isHttpUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}
