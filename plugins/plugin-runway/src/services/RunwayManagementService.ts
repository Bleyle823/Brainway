import RunwayML from '@runwayml/sdk';
import type { IAgentRuntime } from '@elizaos/core';
import { Service, logger } from '@elizaos/core';
import { getRunwayApiOrigin, RUNWAY_API_VERSION, resolveRunwaySecretFromRuntime } from '../config/runwayConfig.ts';

const DEFAULT_LIST_LIMIT = 100;

export class RunwayManagementService extends Service {
  static serviceType = 'runway-management';
  capabilityDescription =
    'Runway Developer API: organization, usage, avatars, documents, custom voices, and published workflows.';

  private client: RunwayML | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<RunwayManagementService> {
    logger.info('[RunwayManagementService] starting');
    return new RunwayManagementService(runtime);
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const svc = runtime.getService(RunwayManagementService.serviceType) as RunwayManagementService | null;
    if (svc) {
      await svc.stop();
    }
    logger.info('[RunwayManagementService] stopped');
  }

  async stop(): Promise<void> {
    this.client = null;
  }

  getClient(): RunwayML {
    if (!this.client) {
      this.client = new RunwayML({
        apiKey: resolveRunwaySecretFromRuntime(this.runtime),
        baseURL: getRunwayApiOrigin(),
        runwayVersion: RUNWAY_API_VERSION,
      });
    }
    return this.client;
  }

  async retrieveOrganization() {
    return this.getClient().organization.retrieve();
  }

  async retrieveUsage(params?: { startDate?: string; beforeDate?: string }) {
    return this.getClient().organization.retrieveUsage(params ?? {});
  }

  async listAvatars(maxItems = DEFAULT_LIST_LIMIT) {
    const client = this.getClient();
    const items: unknown[] = [];
    for await (const row of client.avatars.list({ limit: Math.min(100, maxItems) })) {
      items.push(row);
      if (items.length >= maxItems) break;
    }
    return items;
  }

  async createAvatar(body: Parameters<RunwayML['avatars']['create']>[0]) {
    return this.getClient().avatars.create(body);
  }

  async retrieveAvatar(id: string) {
    return this.getClient().avatars.retrieve(id);
  }

  async updateAvatar(id: string, body: NonNullable<Parameters<RunwayML['avatars']['update']>[1]>) {
    return this.getClient().avatars.update(id, body);
  }

  async deleteAvatar(id: string) {
    return this.getClient().avatars.delete(id);
  }

  async createDocument(body: Parameters<RunwayML['documents']['create']>[0]) {
    return this.getClient().documents.create(body);
  }

  async listDocuments(maxItems = DEFAULT_LIST_LIMIT) {
    const client = this.getClient();
    const items: unknown[] = [];
    for await (const row of client.documents.list({
      limit: Math.min(100, maxItems),
      order: 'desc',
      sort: 'updatedAt',
    })) {
      items.push(row);
      if (items.length >= maxItems) break;
    }
    return items;
  }

  async retrieveDocument(id: string) {
    return this.getClient().documents.retrieve(id);
  }

  async deleteDocument(id: string) {
    return this.getClient().documents.delete(id);
  }

  async listVoices(maxItems = DEFAULT_LIST_LIMIT) {
    const client = this.getClient();
    const items: unknown[] = [];
    for await (const row of client.voices.list({ limit: Math.min(100, maxItems) })) {
      items.push(row);
      if (items.length >= maxItems) break;
    }
    return items;
  }

  async createVoice(body: Parameters<RunwayML['voices']['create']>[0]) {
    return this.getClient().voices.create(body);
  }

  async retrieveVoice(id: string) {
    return this.getClient().voices.retrieve(id);
  }

  async listWorkflows() {
    return this.getClient().workflows.list();
  }

  async retrieveWorkflow(id: string) {
    return this.getClient().workflows.retrieve(id);
  }

  async runWorkflow(id: string, body?: Parameters<RunwayML['workflows']['run']>[1]) {
    return this.getClient().workflows.run(id, body ?? {});
  }
}
