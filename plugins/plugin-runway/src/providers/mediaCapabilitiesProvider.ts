import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from '@elizaos/core';

export const mediaCapabilitiesProvider: Provider = {
  name: 'RUNWAY_MEDIA_CAPABILITIES',
  description: 'Summarizes Runway models exposed by this plugin actions.',

  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State | undefined): Promise<ProviderResult> => {
    const text = [
      'Runway capabilities (this plugin):',
      '- Video: Gen-4.5 text-to-video / image-to-video (`RUNWAY_GENERATE_VIDEO`)',
      '- Image: gen4_image text-to-image with optional refs (`RUNWAY_GENERATE_IMAGE`)',
      '- Characters: gwm1_avatars realtime session + consume (`RUNWAY_START_CHARACTER_SESSION`)',
      '- Audio: sound effects, TTS, dubbing, speech-to-speech (`RUNWAY_GENERATE_AUDIO`)',
      '- Transform: gen4_aleph video-to-video, act_two (`RUNWAY_TRANSFORM_MEDIA`)',
    ].join('\n');

    return {
      text,
      values: {},
      data: {
        videoModels: ['gen4.5'],
        imageModels: ['gen4_image'],
        characterModels: ['gwm1_avatars'],
        transformModels: ['gen4_aleph', 'act_two'],
      },
    };
  },
};
