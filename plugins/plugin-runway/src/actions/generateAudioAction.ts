import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { extractPromptAfterKeyword, matchesAny, normalizeText, parseKeyValuePairs } from '../lib/actionHelpers.ts';
import { MediaProcessingService } from '../services/MediaProcessingService.ts';
import { RunwayService } from '../services/RunwayService.ts';

const SOUND_TRIGGERS = ['sound effect', 'generate sound', 'runway sound', 'eleven sound'];
const TTS_TRIGGERS = ['text to speech', 'tts', 'runway speech', 'speak text'];
const DUB_TRIGGERS = ['voice dub', 'dub audio', 'runway dub'];
const STS_TRIGGERS = ['speech to speech', 'voice convert', 'runway sts'];

function modeFor(text: string): 'sound' | 'tts' | 'dub' | 'sts' | null {
  const t = text.toLowerCase();
  if (matchesAny(t, STS_TRIGGERS)) return 'sts';
  if (matchesAny(t, DUB_TRIGGERS)) return 'dub';
  if (matchesAny(t, TTS_TRIGGERS)) return 'tts';
  if (matchesAny(t, SOUND_TRIGGERS)) return 'sound';
  return null;
}

export const generateAudioAction: Action = {
  name: 'RUNWAY_GENERATE_AUDIO',
  similes: ['RUNWAY_SOUND', 'RUNWAY_TTS', 'RUNWAY_DUB', 'RUNWAY_STS'],
  description:
    'Runway audio tasks: sound effect (eleven_text_to_sound_v2), TTS (eleven_multilingual_v2), dubbing (eleven_voice_dubbing), speech-to-speech (eleven_multilingual_sts_v2). Use media:https://... audioUri:https://... targetLang:es voicePreset:...',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    return modeFor(t) !== null;
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
      const mode = modeFor(raw);
      if (!mode) {
        const err = 'Specify audio mode: sound effect / text to speech / voice dub / speech to speech.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const kv = parseKeyValuePairs(raw);
      const allTriggers = [...SOUND_TRIGGERS, ...TTS_TRIGGERS, ...DUB_TRIGGERS, ...STS_TRIGGERS];
      const promptTail = extractPromptAfterKeyword(raw, allTriggers);

      let taskId: string;

      if (mode === 'sound') {
        const promptText = kv.prompt || kv.text || promptTail;
        if (!promptText) {
          const err = 'Provide prompt text for the sound effect.';
          if (callback) await callback({ text: err, error: true });
          return { success: false, text: err, error: new Error(err) };
        }
        const duration = Number(kv.duration || kv.seconds || '3') || 3;
        const loop = (kv.loop || '').toLowerCase() === 'true';
        const started = await runway.startSoundEffect({
          model: 'eleven_text_to_sound_v2',
          promptText,
          duration: Math.min(22, Math.max(1, duration)),
          ...(loop ? { loop: true } : {}),
        });
        taskId = started.id;
      } else if (mode === 'tts') {
        const promptText = kv.prompt || kv.text || promptTail;
        if (!promptText) {
          const err = 'Provide text for TTS.';
          if (callback) await callback({ text: err, error: true });
          return { success: false, text: err, error: new Error(err) };
        }
        const voicePreset = kv.voicepreset || kv.presetid;
        const started = await runway.startTextToSpeech({
          model: 'eleven_multilingual_v2',
          promptText,
          ...(voicePreset ? { voice: { type: 'runway-preset', presetId: voicePreset } } : {}),
        });
        taskId = started.id;
      } else if (mode === 'dub') {
        const audioUri = kv.audiouri || kv.audio || kv.media;
        const targetLang = kv.targetlang || kv.lang || 'es';
        if (!audioUri) {
          const err = 'Provide audioUri:https://... for dubbing.';
          if (callback) await callback({ text: err, error: true });
          return { success: false, text: err, error: new Error(err) };
        }
        const started = await runway.startVoiceDubbing({
          model: 'eleven_voice_dubbing',
          audioUri,
          targetLang,
        });
        taskId = started.id;
      } else {
        const mediaUri = kv.media || kv.audiouri || kv.video;
        const presetId = kv.voicepreset || kv.presetid || 'English_CalmMale';
        if (!mediaUri) {
          const err = 'Provide media:https://... (audio or video URI) for speech-to-speech.';
          if (callback) await callback({ text: err, error: true });
          return { success: false, text: err, error: new Error(err) };
        }
        const mediaType = (kv.mediatype || '').toLowerCase() === 'video' ? 'video' : 'audio';
        const started = await runway.startSpeechToSpeech({
          model: 'eleven_multilingual_sts_v2',
          media: { type: mediaType, uri: mediaUri },
          voice: { type: 'runway-preset', presetId },
        });
        taskId = started.id;
      }

      if (callback) {
        await callback({
          text: `Started Runway audio task \`${taskId}\` (mode: ${mode}). Polling…`,
          actions: ['RUNWAY_GENERATE_AUDIO'],
        });
      }

      const task = await media.waitForTask(taskId);
      if (task.status !== 'SUCCEEDED' || !task.output?.[0]) {
        const detail = task.failure || task.failureCode || task.status;
        const err = `Audio task did not succeed: ${detail}`;
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err), data: { taskId, task } };
      }

      const url = task.output[0];
      const msg = `Audio ready.\nURL: ${url}\n(task ${taskId})`;
      if (callback) await callback({ text: msg, actions: ['RUNWAY_GENERATE_AUDIO'] });

      return { success: true, text: msg, data: { taskId, audioUrl: url, mode, task } };
    } catch (error) {
      logger.error({ error }, 'RUNWAY_GENERATE_AUDIO failed');
      const errMsg = error instanceof Error ? error.message : String(error);
      if (callback) await callback({ text: `Runway audio error: ${errMsg}`, error: true });
      return { success: false, text: errMsg, error: error instanceof Error ? error : new Error(errMsg) };
    }
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'sound effect: gentle keyboard typing, office' } },
      { name: '{{agent}}', content: { text: 'Audio ready…', actions: ['RUNWAY_GENERATE_AUDIO'] } },
    ],
  ],
};
