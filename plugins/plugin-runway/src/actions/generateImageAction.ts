import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { extractPromptAfterKeyword, matchesAny, normalizeText, parseKeyValuePairs } from '../lib/actionHelpers.ts';
import { MediaProcessingService } from '../services/MediaProcessingService.ts';
import { RunwayService } from '../services/RunwayService.ts';

const TRIGGERS = ['generate image', 'create image', 'text to image', 'runway image', 'draw with runway'];

export const generateImageAction: Action = {
  name: 'RUNWAY_GENERATE_IMAGE',
  similes: ['RUNWAY_IMAGE', 'GEN4_IMAGE'],
  description:
    'Starts Runway gen4_image from a text prompt. Optional reference images: ref1:https://... tags in prompt with @tag.',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const t = normalizeText(message);
    return !!t && matchesAny(t, TRIGGERS);
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
        const err = 'Add a prompt, e.g. "generate image: a friendly robot reading a book".';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const kv = parseKeyValuePairs(raw);
      const ratio = kv.ratio || '1920:1080';

      const referenceImages: Array<{ uri: string; tag?: string }> = [];
      Object.keys(kv).forEach((k) => {
        if (k.startsWith('ref') || k === 'reference' || k === 'uri') {
          const uri = kv[k];
          if (uri && (uri.startsWith('http') || uri.startsWith('data:'))) {
            const tag = kv[`${k}_tag`] || kv[`tag_${k}`];
            referenceImages.push({ uri, ...(tag ? { tag } : {}) });
          }
        }
      });

      if (callback) {
        await callback({
          text: `Starting Runway gen4_image (ratio ${ratio})…`,
          actions: ['RUNWAY_GENERATE_IMAGE'],
        });
      }

      const { id } = await runway.startGen4Image({
        promptText,
        ratio,
        referenceImages: referenceImages.length ? referenceImages : undefined,
      });

      const task = await media.waitForTask(id);

      if (task.status !== 'SUCCEEDED' || !task.output?.[0]) {
        const detail = task.failure || task.failureCode || task.status;
        const err = `Image generation did not succeed: ${detail}`;
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err), data: { taskId: id, task } };
      }

      const url = task.output[0];
      const msg = `Image ready.\nURL: ${url}\n(task ${id})`;
      if (callback) await callback({ text: msg, actions: ['RUNWAY_GENERATE_IMAGE'] });

      return { success: true, text: msg, data: { taskId: id, imageUrl: url, task } };
    } catch (error) {
      logger.error({ error }, 'RUNWAY_GENERATE_IMAGE failed');
      const errMsg = error instanceof Error ? error.message : String(error);
      if (callback) await callback({ text: `Runway image error: ${errMsg}`, error: true });
      return { success: false, text: errMsg, error: error instanceof Error ? error : new Error(errMsg) };
    }
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'generate image: minimal desk lamp, warm light' } },
      { name: '{{agent}}', content: { text: 'Image ready…', actions: ['RUNWAY_GENERATE_IMAGE'] } },
    ],
  ],
};
