/**
 * Normalized Runway / HTTP errors with retry hints for 429 / 503.
 */

export class RunwayApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'RunwayApiError';
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502 || status === 408;
}

export function classifyHttpError(status: number, message: string): RunwayApiError {
  return new RunwayApiError(message, status, isRetryableStatus(status));
}

/** Exponential backoff delay in ms (capped). */
export function backoffMs(attempt: number, base = 500, cap = 30_000): number {
  const exp = Math.min(cap, base * 2 ** Math.min(attempt, 8));
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}
