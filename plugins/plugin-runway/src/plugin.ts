import type { IAgentRuntime, Plugin, RouteRequest, RouteResponse } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { z } from 'zod';
import {
  generateAudioAction,
  generateImageAction,
  generateVideoAction,
  startCharacterAction,
  transformMediaAction,
} from './actions/index.ts';
import {
  activeSessionsProvider,
  mediaCapabilitiesProvider,
  runwayStatusProvider,
} from './providers/index.ts';
import { CharacterService, MediaProcessingService, RunwayService } from './services/index.ts';

const configSchema = z.object({
  RUNWAYML_API_SECRET: z
    .string()
    .min(1)
    .optional()
    .describe('Org API secret from https://dev.runwayml.com (also accepted via process.env).'),
  RUNWAYML_API_BASE_URL: z.string().optional(),
  RUNWAYML_BASE_URL: z.string().optional(),
  RUNWAY_CHARACTER_AVATAR_ID: z.string().optional(),
  RUNWAY_CHARACTER_AVATAR_TYPE: z.enum(['runway-preset', 'custom']).optional(),
});

export const runwayPlugin: Plugin = {
  name: 'plugin-runway',
  description:
    'ElizaOS plugin for Runway Developer API: Gen-4.5 video, gen4_image, Characters (gwm1_avatars), ElevenLabs audio tasks, gen4_aleph / act_two transforms.',
  config: {
    RUNWAYML_API_SECRET: process.env.RUNWAYML_API_SECRET,
    RUNWAYML_API_BASE_URL: process.env.RUNWAYML_API_BASE_URL,
    RUNWAYML_BASE_URL: process.env.RUNWAYML_BASE_URL,
    RUNWAY_CHARACTER_AVATAR_ID: process.env.RUNWAY_CHARACTER_AVATAR_ID,
    RUNWAY_CHARACTER_AVATAR_TYPE: process.env.RUNWAY_CHARACTER_AVATAR_TYPE as 'runway-preset' | 'custom' | undefined,
  },

  async init(config: Record<string, string>, _runtime?: IAgentRuntime) {
    try {
      const validated = await configSchema.parseAsync(config);
      for (const [key, value] of Object.entries(validated)) {
        if (value !== undefined && value !== null && String(value).length > 0) {
          process.env[key] = String(value);
        }
      }
      logger.info('[plugin-runway] configuration merged into process.env');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const msgs = error.issues?.map((e) => e.message).join(', ') || 'Unknown validation error';
        throw new Error(`Invalid runway plugin configuration: ${msgs}`);
      }
      throw new Error(
        `Invalid runway plugin configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  routes: [
    {
      name: 'runway-plugin-health',
      path: '/runway/health',
      type: 'GET',
      handler: async (_req: RouteRequest, res: RouteResponse) => {
        res.json({
          plugin: 'plugin-runway',
          ok: true,
          hasSecret: Boolean(process.env.RUNWAYML_API_SECRET?.trim()),
        });
      },
    },
  ],

  services: [RunwayService, MediaProcessingService, CharacterService],
  actions: [
    generateVideoAction,
    generateImageAction,
    startCharacterAction,
    generateAudioAction,
    transformMediaAction,
  ],
  providers: [runwayStatusProvider, activeSessionsProvider, mediaCapabilitiesProvider],
};

export default runwayPlugin;
