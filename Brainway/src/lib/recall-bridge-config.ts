/** Base URL of the recall-bridge Node service (no trailing slash). Recall.ai loads bot.html from here. */
export function getRecallBridgeUrl(): string {
  const raw = process.env.RECALL_BRIDGE_URL?.trim();
  if (!raw) {
    throw new Error(
      "RECALL_BRIDGE_URL is not configured. Deploy recall-bridge (see recall-bridge/README.md at the repo root), set PUBLIC_URL there, then add RECALL_BRIDGE_URL in Brainwave.",
    );
  }
  return raw.replace(/\/+$/, "");
}

export function isRecallBridgeConfigured(): boolean {
  return Boolean(process.env.RECALL_BRIDGE_URL?.trim());
}
