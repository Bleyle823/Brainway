import { getRunwayApiBase, RUNWAY_API_VERSION } from '../config/runwayConfig.ts';
import { RunwayApiError, classifyHttpError } from './runwayErrors.ts';

export function jsonHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': RUNWAY_API_VERSION,
  };
}

export function authHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    'X-Runway-Version': RUNWAY_API_VERSION,
  };
}

export async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw classifyHttpError(res.status, `Runway ${label}: ${res.status} ${text}`);
  }
}

export type RunwayTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'THROTTLED';

export interface RunwayTask {
  id: string;
  status: RunwayTaskStatus;
  progress?: number;
  output?: string[];
  failure?: string;
  failureCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchRunwayTask(apiKey: string, taskId: string): Promise<RunwayTask> {
  const res = await fetch(`${getRunwayApiBase()}/tasks/${taskId}`, {
    headers: authHeaders(apiKey),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw classifyHttpError(res.status, `Runway getTask: ${res.status} ${text}`);
  }
  return res.json() as Promise<RunwayTask>;
}

export async function cancelRunwayTask(apiKey: string, taskId: string): Promise<void> {
  const res = await fetch(`${getRunwayApiBase()}/tasks/${taskId}/cancel`, {
    method: 'POST',
    headers: authHeaders(apiKey),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw new RunwayApiError(`Runway cancelTask: ${res.status} ${text}`, res.status, false);
  }
}
