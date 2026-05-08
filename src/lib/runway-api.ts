const BASE = "https://api.dev.runwayml.com/v1";
const VERSION = "2024-11-06";

function jsonHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-Runway-Version": VERSION,
  };
}

function authHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    "X-Runway-Version": VERSION,
  };
}

async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Runway ${label}: ${res.status} ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Ephemeral uploads
// ---------------------------------------------------------------------------

export interface UploadIntent {
  uploadUrl: string;
  fields: Record<string, string>;
  runwayUri: string;
}

export async function createEphemeralUpload(
  key: string,
  filename: string,
): Promise<UploadIntent> {
  const res = await fetch(`${BASE}/uploads`, {
    method: "POST",
    headers: jsonHeaders(key),
    body: JSON.stringify({ filename, type: "ephemeral" }),
  });
  await assertOk(res, "createEphemeralUpload");
  return res.json() as Promise<UploadIntent>;
}

// ---------------------------------------------------------------------------
// Video-to-video (gen4_aleph)
// ---------------------------------------------------------------------------

export interface VideoToVideoParams {
  model: "gen4_aleph";
  promptVideo: string;
  promptText: string;
  promptImage?: string;
  ratio?: string;
}

export interface RunwayTask {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  /** 0–1 float, only present while RUNNING */
  progress?: number;
  /** Array of output URLs when SUCCEEDED */
  output?: string[];
  failure?: string;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
}

export async function startVideoToVideo(
  key: string,
  params: VideoToVideoParams,
): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/video_to_video`, {
    method: "POST",
    headers: jsonHeaders(key),
    body: JSON.stringify(params),
  });
  await assertOk(res, "startVideoToVideo");
  return res.json() as Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Task polling
// ---------------------------------------------------------------------------

export async function getTask(key: string, taskId: string): Promise<RunwayTask> {
  const res = await fetch(`${BASE}/tasks/${taskId}`, {
    headers: authHeaders(key),
  });
  await assertOk(res, "getTask");
  return res.json() as Promise<RunwayTask>;
}

export async function cancelTask(key: string, taskId: string): Promise<void> {
  await fetch(`${BASE}/tasks/${taskId}/cancel`, {
    method: "POST",
    headers: authHeaders(key),
  });
}
