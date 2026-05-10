import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { extractPromptAfterKeyword, matchesAny, normalizeText, parseKeyValuePairs } from '../lib/actionHelpers.ts';
import { MediaProcessingService } from '../services/MediaProcessingService.ts';
import { RunwayService } from '../services/RunwayService.ts';

const V2V_TRIGGERS = ['video to video', 'transform video', 'gen4 aleph', 'runway v2v'];
const ACT_TRIGGERS = ['act two', 'character performance', 'runway act'];

export const transformMediaAction: Action = {
  name: 'RUNWAY_TRANSFORM_MEDIA',
  similes: ['RUNWAY_VIDEO_TO_VIDEO', 'RUNWAY_ACT_TWO'],
  description:
    'Runway video transforms: gen4_aleph video-to-video (promptVideo:https://... promptText:...) or act_two character performance (characterUri:... referenceUri:...).',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    return matchesAny(t, V2V_TRIGGERS) || matchesAny(t, ACT_TRIGGERS);
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
      const kv = parseKeyValuePairs(raw);
      const isAct = matchesAny(raw.toLowerCase(), ACT_TRIGGERS);

      if (isAct) {
        const characterUri = kv.characteruri || kv.character;
        const referenceUri = kv.referenceuri || kv.reference;
        if (!characterUri || !referenceUri) {
          const err =
            'For act_two provide characterUri:https://... and referenceUri:https://... (reference must be video).';
          if (callback) await callback({ text: err, error: true });
          return { success: false, text: err, error: new Error(err) };
        }
        const charType = (kv.charactertype || 'image').toLowerCase() === 'video' ? 'video' : 'image';
        const ratio = (kv.ratio as '1280:720') || '1280:720';

        if (callback) {
          await callback({ text: 'Starting Runway act_two character performance…', actions: ['RUNWAY_TRANSFORM_MEDIA'] });
        }

        const { id } = await runway.startCharacterPerformance({
          model: 'act_two',
          character: { type: charType, uri: characterUri },
          reference: { type: 'video', uri: referenceUri },
          ratio,
        });

        const task = await media.waitForTask(id);
        if (task.status !== 'SUCCEEDED' || !task.output?.[0]) {
          const detail = task.failure || task.failureCode || task.status;
          const err = `act_two did not succeed: ${detail}`;
          if (callback) await callback({ text: err, error: true });
          return { success: false, text: err, error: new Error(err), data: { taskId: id, task } };
        }
        const url = task.output[0];
        const msg = `act_two output ready.\nURL: ${url}\n(task ${id})`;
        if (callback) await callback({ text: msg, actions: ['RUNWAY_TRANSFORM_MEDIA'] });
        return { success: true, text: msg, data: { taskId: id, videoUrl: url, kind: 'act_two', task } };
      }

      const promptVideo = kv.promptvideo || kv.video || kv.source;
      const promptText =
        kv.prompttext ||
        kv.prompt ||
        extractPromptAfterKeyword(raw, V2V_TRIGGERS);
      if (!promptVideo || !promptText) {
        const err = 'For video-to-video provide promptVideo:https://... and a text prompt (promptText:... or after the trigger).';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      if (callback) {
        await callback({ text: 'Starting Runway gen4_aleph video-to-video…', actions: ['RUNWAY_TRANSFORM_MEDIA'] });
      }

      const { id } = await runway.startVideoToVideo({
        model: 'gen4_aleph',
        promptVideo,
        promptText,
        ...(kv.promptimage ? { promptImage: kv.promptimage } : {}),
        ...(kv.ratio ? { ratio: kv.ratio } : {}),
        ...(kv.seed ? { seed: Number(kv.seed) } : {}),
      });

      const task = await media.waitForTask(id);
      if (task.status !== 'SUCCEEDED' || !task.output?.[0]) {
        const detail = task.failure || task.failureCode || task.status;
        const err = `Video-to-video did not succeed: ${detail}`;
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err), data: { taskId: id, task } };
      }

      const url = task.output[0];
      const msg = `Transformed video ready.\nURL: ${url}\n(task ${id})`;
      if (callback) await callback({ text: msg, actions: ['RUNWAY_TRANSFORM_MEDIA'] });
      return { success: true, text: msg, data: { taskId: id, videoUrl: url, kind: 'gen4_aleph', task } };
    } catch (error) {
      logger.error({ error }, 'RUNWAY_TRANSFORM_MEDIA failed');
      const errMsg = error instanceof Error ? error.message : String(error);
      if (callback) await callback({ text: `Runway transform error: ${errMsg}`, error: true });
      return { success: false, text: errMsg, error: error instanceof Error ? error : new Error(errMsg) };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'video to video promptVideo:https://example.com/in.mp4 promptText: make it more cinematic',
        },
      },
      { name: '{{agent}}', content: { text: 'Transformed video ready…', actions: ['RUNWAY_TRANSFORM_MEDIA'] } },
    ],
  ],
};
