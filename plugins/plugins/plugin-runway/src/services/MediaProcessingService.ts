import type { IAgentRuntime } from '@elizaos/core';
import { Service, logger } from '@elizaos/core';
import { RunwayApiError, backoffMs } from '../lib/runwayErrors.ts';
import { fetchRunwayTask, type RunwayTask } from '../lib/runwayHttp.ts';
import { RunwayService } from './RunwayService.ts';

export interface WaitForTaskOptions {
  /** Max wall time for polling (ms). */
  timeoutMs?: number;
  /** Base interval between polls (ms). */
  pollIntervalMs?: number;
  /** Max attempts for retryable HTTP errors between polls. */
  maxHttpRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

export class MediaProcessingService extends Service {
  static serviceType = 'runway-media';
  capabilityDescription =
    'Polls Runway async tasks until completion, with backoff on transient API errors.';

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<MediaProcessingService> {
    logger.info('[MediaProcessingService] starting');
    return new MediaProcessingService(runtime);
  }

  static async stop(_runtime: IAgentRuntime): Promise<void> {
    logger.info('[MediaProcessingService] stopped');
  }

  async stop(): Promise<void> {
    /* no-op */
  }

  private getRunway(): RunwayService {
    const svc = this.runtime.getService(RunwayService.serviceType) as RunwayService | null;
    if (!svc) {
      throw new Error('RunwayService is not registered; load the runway plugin services in order.');
    }
    return svc;
  }

  /**
   * Poll `GET /tasks/:id` until terminal state or timeout.
   * Treats `THROTTLED` like `PENDING` (per Runway go-live guidance).
   */
  async waitForTask(taskId: string, options: WaitForTaskOptions = {}): Promise<RunwayTask> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const pollIntervalMs = options.pollIntervalMs ?? 2000;
    const maxHttpRetries = options.maxHttpRetries ?? 8;
    const key = this.getRunway().getApiSecret();
    const deadline = Date.now() + timeoutMs;
    let httpRetries = 0;

    while (Date.now() < deadline) {
      try {
        const task = await fetchRunwayTask(key, taskId);
        const status = task.status;

        if (status === 'SUCCEEDED') {
          return task;
        }
        if (status === 'FAILED' || status === 'CANCELLED') {
          return task;
        }
        // PENDING, RUNNING, THROTTLED → keep polling
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      } catch (e) {
        if (e instanceof RunwayApiError && e.retryable && httpRetries < maxHttpRetries) {
          const wait = backoffMs(httpRetries++);
          logger.warn({ taskId, wait, err: e.message }, '[MediaProcessingService] retryable error, backing off');
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw e;
      }
    }

    throw new RunwayApiError(`Timed out waiting for Runway task ${taskId}`, 408, false);
  }
}
