/** Ratios supported by gen4.5 image-to-video. */
export type Gen45ImageRatio =
  | '1280:720'
  | '720:1280'
  | '1104:832'
  | '960:960'
  | '832:1104'
  | '1584:672';

/** Ratios supported by gen4.5 text-to-video (subset). */
export type Gen45TextRatio = '1280:720' | '720:1280';

export interface Gen45VideoStartParams {
  promptText: string;
  promptImage?: string;
  ratio: Gen45ImageRatio;
  duration: number;
  seed?: number;
}

export interface Gen4ImageStartParams {
  promptText: string;
  ratio: string;
  referenceImages?: Array<{ uri: string; tag?: string }>;
  seed?: number;
}

export interface VideoToVideoStartParams {
  promptVideo: string;
  promptText: string;
  promptImage?: string;
  ratio?: string;
  seed?: number;
}

export interface CharacterPerformanceStartParams {
  character: { type: 'image' | 'video'; uri: string };
  reference: { type: 'video'; uri: string };
  ratio: '1280:720' | '720:1280' | '960:960' | '1104:832' | '832:1104';
  bodyControl?: boolean;
  expressionIntensity?: 1 | 2 | 3 | 4 | 5;
  seed?: number;
}
