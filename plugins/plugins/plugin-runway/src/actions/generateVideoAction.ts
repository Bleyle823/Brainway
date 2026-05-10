import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { Gen45ImageRatio } from '../types/index.ts';
import { extractPromptAfterKeyword, matchesAny, normalizeText, parseKeyValuePairs } from '../lib/actionHelpers.ts';
import { MediaProcessingService } from '../services/MediaProcessingService.ts';
import { RunwayService } from '../services/RunwayService.ts';

const TRIGGERS = [
  'generate video',
  'create video',
  'text to video',
  'image to video',
  'runway video',
];

function defaultRatio(): Gen45ImageRatio {
  return '1280:720';
}

function parseDuration(text: string): number {
  const kv = parseKeyValuePairs(text);
  const d = Number(kv.duration ?? kv.seconds);
  if (Number.isFinite(d) && d >= 2 && d <= 10) return Math.floor(d);
  const m = text.match(/\b(\d+)\s*(s|sec|seconds)\b/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 2 && n <= 10) return n;
  }
  return 5;
}

function parsePromptImage(text: string): string | undefined {
  const kv = parseKeyValuePairs(text);
  const img = kv.promptimage || kv.image || kv.img;
  if (img && (img.startsWith('http') || img.startsWith('data:'))) return img;
  const m = text.match(/\b(https?:\/\/\S+|data:image\/[^;]+;base64,\S+)/i);
  return m ? m[1] : undefined;
}

export const generateVideoAction: Action = {
  name: 'RUNWAY_GENERATE_VIDEO',
  similes: ['RUNWAY_VIDEO', 'GEN45_VIDEO'],
  description:
    'Starts a Runway Gen-4.5 video task (text-to-video or image-to-video). User should describe the scene; optional image URL via image:https://... or promptImage:...',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    return matchesAny(t, TRIGGERS);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const runway = runtime.getService(RunwayService.serviceType) as RunwayService | null;
      const media = runtime.getService(MediaProcessingService.serviceType) as MediaProcessingService | null;
      if (!runway || !media) {
        const err = 'Runway services are not available on this runtime.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const raw = normalizeText(message);
      const promptText = extractPromptAfterKeyword(raw, TRIGGERS);
      if (!promptText) {
        const err = 'Add a description after your request, e.g. "generate video: a calm ocean at sunset".';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const promptImage = parsePromptImage(raw);
      const duration = parseDuration(raw);
      const ratio = defaultRatio();

      const { id } = await runway.startGen45Video({
        promptText: promptImage ? promptText.replace(/\b\w+\s*[:=]\s*\S+/g, '').trim() : promptText,
        promptImage,
        ratio,
        duration,
      });

      if (callback) {
        await callback({
          text: `Started Runway Gen-4.5 video (task \`${id}\`). Polling until complete…`,
          actions: ['RUNWAY_GENERATE_VIDEO'],
        });
      }

      const task = await media.waitForTask(id);

      if (task.status !== 'SUCCEEDED' || !task.output?.[0]) {
        const detail = task.failure || task.failureCode || task.status;
        const err = `Video generation did not succeed: ${detail}`;
        if (callback) await callback({ text: err, error: true });
        return {
          success: false,
          text: err,
          error: new Error(err),
          data: { taskId: id, task },
        };
      }

      const url = task.output[0];
      const msg = `Video ready.\nURL: ${url}\n(task ${id})`;
      if (callback) {
        await callback({
          text: msg,
          actions: ['RUNWAY_GENERATE_VIDEO'],
        });
      }

      return {
        success: true,
        text: msg,
        data: { taskId: id, videoUrl: url, task },
      };
    } catch (error) {
      logger.error({ error }, 'RUNWAY_GENERATE_VIDEO failed');
      const errMsg = error instanceof Error ? error.message : String(error);
      if (callback) await callback({ text: `Runway video error: ${errMsg}`, error: true });
      return {
        success: false,
        text: errMsg,
        error: error instanceof Error ? error : new Error(errMsg),
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'generate video: soft rain on a window at night, cozy' },
      },
      {
        name: '{{agent}}',
        content: { text: 'Started Runway Gen-4.5…', actions: ['RUNWAY_GENERATE_VIDEO'] },
      },
    ],
  ],
};
