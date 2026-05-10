import { describe, expect, it } from 'bun:test';
import { RunwayApiError, backoffMs, classifyHttpError, isRetryableStatus } from '../lib/runwayErrors.ts';

describe('runwayErrors', () => {
  it('classifies retryable HTTP statuses', () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
  });

  it('classifyHttpError sets retryable flag', () => {
    const e = classifyHttpError(429, 'rate limited');
    expect(e).toBeInstanceOf(RunwayApiError);
    expect(e.retryable).toBe(true);
    expect(e.statusCode).toBe(429);
  });

  it('backoffMs grows with attempt', () => {
    const a = backoffMs(0, 100, 10_000);
    const b = backoffMs(3, 100, 10_000);
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
