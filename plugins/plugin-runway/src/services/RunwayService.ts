import RunwayML from '@runwayml/sdk';
import type { IAgentRuntime } from '@elizaos/core';
import { Service, logger } from '@elizaos/core';
import { getRunwayApiBase, getRunwayApiOrigin, RUNWAY_API_VERSION, resolveRunwaySecretFromRuntime } from '../config/runwayConfig.ts';
import { assertOk, jsonHeaders } from '../lib/runwayHttp.ts';
import type { Gen45ImageRatio, Gen45TextRatio } from '../types/index.ts';

export type { Gen45ImageRatio, Gen45TextRatio };

function isHttpsVideoUri(ref: string): boolean {
  return /^https?:\/\//i.test(ref.trim());
}

export class RunwayService extends Service {
  static serviceType = 'runway';
  capabilityDescription =
    'Runway Developer API: video, image, audio tasks, uploads, and task polling via @runwayml/sdk and REST.';

  private client: RunwayML | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<RunwayService> {
    logger.info('[RunwayService] starting');
    return new RunwayService(runtime);
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const svc = runtime.getService(RunwayService.serviceType) as RunwayService | null;
    if (svc) {
      await svc.stop();
    }
    logger.info('[RunwayService] stopped');
  }

  async stop(): Promise<void> {
    this.client = null;
  }

  getApiSecret(): string {
    return resolveRunwaySecretFromRuntime(this.runtime);
  }

  getClient(): RunwayML {
    if (!this.client) {
      this.client = new RunwayML({
        apiKey: this.getApiSecret(),
        baseURL: getRunwayApiOrigin(),
        runwayVersion: RUNWAY_API_VERSION,
      });
    }
    return this.client;
  }

  /** Gen-4.5: image-to-video when `promptImage` set, else text-to-video. */
  async startGen45Video(params: {
    promptText: string;
    promptImage?: string;
    ratio: Gen45ImageRatio;
    duration: number;
    seed?: number;
  }): Promise<{ id: string }> {
    const key = this.getApiSecret();
    const client = new RunwayML({
      apiKey: key,
      baseURL: getRunwayApiOrigin(),
      runwayVersion: RUNWAY_API_VERSION,
    });

    if (params.promptImage) {
      const created = await client.imageToVideo.create({
        model: 'gen4.5',
        promptImage: params.promptImage,
        promptText: params.promptText,
        ratio: params.ratio,
        duration: params.duration,
        ...(params.seed != null ? { seed: params.seed } : {}),
      });
      return { id: created.id };
    }

    const t2vRatio: Gen45TextRatio =
      params.ratio === '1280:720' || params.ratio === '720:1280' ? params.ratio : '1280:720';

    const created = await client.textToVideo.create({
      model: 'gen4.5',
      promptText: params.promptText,
      ratio: t2vRatio,
      duration: params.duration,
      ...(params.seed != null ? { seed: params.seed } : {}),
    });
    return { id: created.id };
  }

  async startGen4Image(params: {
    promptText: string;
    ratio: string;
    referenceImages?: Array<{ uri: string; tag?: string }>;
    seed?: number;
  }): Promise<{ id: string }> {
    const client = this.getClient();
    const created = await client.textToImage.create({
      model: 'gen4_image',
      promptText: params.promptText,
      ratio: params.ratio as any,
      ...(params.referenceImages && params.referenceImages.length > 0
        ? { referenceImages: params.referenceImages }
        : {}),
      ...(params.seed != null ? { seed: params.seed } : {}),
    });
    return { id: created.id };
  }

  async startVideoToVideo(params: {
    model: 'gen4_aleph';
    promptVideo: string;
    promptText: string;
    promptImage?: string;
    ratio?: string;
    seed?: number;
  }): Promise<{ id: string }> {
    const key = this.getApiSecret();
    const source = params.promptVideo.trim();

    if (isHttpsVideoUri(source)) {
      const client = this.getClient();
      const created = await client.videoToVideo.create({
        model: 'gen4_aleph',
        videoUri: source,
        promptText: params.promptText,
        ...(params.ratio ? { ratio: params.ratio as any } : {}),
        ...(params.seed != null ? { seed: params.seed } : {}),
      });
      return { id: created.id };
    }

    const body: Record<string, unknown> = {
      model: params.model,
      promptVideo: source,
      promptText: params.promptText,
    };
    if (params.promptImage) body.promptImage = params.promptImage;
    if (params.ratio) body.ratio = params.ratio;
    if (params.seed != null) body.seed = params.seed;

    const res = await fetch(`${getRunwayApiBase()}/video_to_video`, {
      method: 'POST',
      headers: jsonHeaders(key),
      body: JSON.stringify(body),
    });
    await assertOk(res, 'startVideoToVideo');
    return res.json() as Promise<{ id: string }>;
  }

  async startCharacterPerformance(params: {
    model: 'act_two';
    character: { type: 'image' | 'video'; uri: string };
    reference: { type: 'video'; uri: string };
    ratio: '1280:720' | '720:1280' | '960:960' | '1104:832' | '832:1104';
    bodyControl?: boolean;
    expressionIntensity?: 1 | 2 | 3 | 4 | 5;
    seed?: number;
  }): Promise<{ id: string }> {
    const client = this.getClient();
    const created = await client.characterPerformance.create({
      model: 'act_two',
      character: params.character,
      reference: params.reference,
      ratio: params.ratio,
      ...(params.bodyControl != null ? { bodyControl: params.bodyControl } : {}),
      ...(params.expressionIntensity != null ? { expressionIntensity: params.expressionIntensity } : {}),
      ...(params.seed != null ? { seed: params.seed } : {}),
    });
    return { id: created.id };
  }

  async startSoundEffect(params: {
    model: 'eleven_text_to_sound_v2';
    promptText: string;
    duration: number;
    loop?: boolean;
  }): Promise<{ id: string }> {
    const client = this.getClient();
    const created = await client.soundEffect.create({
      model: 'eleven_text_to_sound_v2',
      promptText: params.promptText,
      duration: params.duration,
      ...(params.loop != null ? { loop: params.loop } : {}),
    });
    return { id: created.id };
  }

  async startSpeechToSpeech(params: {
    model: 'eleven_multilingual_sts_v2';
    media: { type: 'audio' | 'video'; uri: string };
    voice: { type: 'runway-preset'; presetId: string };
  }): Promise<{ id: string }> {
    const client = this.getClient();
    const created = await client.speechToSpeech.create({
      model: 'eleven_multilingual_sts_v2',
      media: params.media,
      voice: params.voice,
    });
    return { id: created.id };
  }

  async startVoiceDubbing(params: {
    model: 'eleven_voice_dubbing';
    audioUri: string;
    targetLang: string;
  }): Promise<{ id: string }> {
    const client = this.getClient();
    const created = await client.voiceDubbing.create({
      model: 'eleven_voice_dubbing',
      audioUri: params.audioUri,
      targetLang: params.targetLang,
    });
    return { id: created.id };
  }

  /** Text-to-speech via REST (`POST /text_to_speech`) for broad SDK compatibility. */
  async startTextToSpeech(params: {
    model: 'eleven_multilingual_v2';
    promptText: string;
    voice?: { type: 'runway-preset'; presetId: string };
  }): Promise<{ id: string }> {
    const key = this.getApiSecret();
    const body: Record<string, unknown> = {
      model: params.model,
      promptText: params.promptText,
    };
    if (params.voice) body.voice = params.voice;

    const res = await fetch(`${getRunwayApiBase()}/text_to_speech`, {
      method: 'POST',
      headers: jsonHeaders(key),
      body: JSON.stringify(body),
    });
    await assertOk(res, 'startTextToSpeech');
    return res.json() as Promise<{ id: string }>;
  }
}
