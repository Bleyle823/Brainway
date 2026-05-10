#!/usr/bin/env node
/**
 * Manual smoke of built `plugin-runway` exports (no ElizaOS runner required).
 */
console.log('Running manual E2E smoke for plugin-runway\n');

import runwayPlugin from '../dist/index.js';

const mockRuntime = {
  character: { name: 'Eliza' },
  actions: runwayPlugin.actions || [],
  providers: runwayPlugin.providers || [],
  getService(name) {
    if (name === 'runway') {
      return {
        getApiSecret: () => 'manual-test',
        startGen45Video: async () => ({ id: 't_manual' }),
      };
    }
    if (name === 'runway-media') {
      return {
        waitForTask: async () => ({
          status: 'SUCCEEDED',
          output: ['https://example.com/out.mp4'],
        }),
      };
    }
    if (name === 'runway-characters') {
      return {
        getApiSecret: () => 'manual-test',
        createReadyConsumedSession: async () => ({
          sessionId: 's1',
          url: 'wss://example',
          token: 'tok',
          roomName: 'r1',
        }),
      };
    }
    return null;
  },
};

const tests = [
  {
    name: 'plugin_metadata',
    fn: async () => {
      if (runwayPlugin.name !== 'plugin-runway') throw new Error('wrong plugin name');
    },
  },
  {
    name: 'actions_present',
    fn: async (rt) => {
      const n = new Set((rt.actions || []).map((a) => a.name));
      if (!n.has('RUNWAY_GENERATE_VIDEO')) throw new Error('missing video action');
    },
  },
  {
    name: 'generate_video_smoke',
    fn: async (rt) => {
      const action = rt.actions.find((a) => a.name === 'RUNWAY_GENERATE_VIDEO');
      const res = await action.handler(
        rt,
        {
          entityId: '12345678-1234-1234-1234-123456789012',
          roomId: '12345678-1234-1234-1234-123456789012',
          content: { text: 'generate video: waves', source: 'test' },
          createdAt: Date.now(),
        },
        {},
        {},
        async () => [],
      );
      if (!res.success) throw new Error(res.text || 'failed');
    },
  },
];

let passed = 0;
let failed = 0;
for (const test of tests) {
  try {
    console.log(`Running: ${test.name}`);
    await test.fn(mockRuntime);
    console.log(`  PASSED\n`);
    passed++;
  } catch (e) {
    console.log(`  FAILED: ${e.message}\n`);
    failed++;
  }
}
console.log(`Summary: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
