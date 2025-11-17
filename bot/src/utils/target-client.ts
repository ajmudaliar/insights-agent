/**
 * Centralized Target Agent Client Utility
 *
 * This module provides a single source of truth for creating a client
 * that targets a different agent. All workflows should use this function
 * to get the target agent client.
 */

import { Client as APIClient } from "@botpress/client";

const API_BASE_URL = "https://api.botpress.cloud";

/**
 * Get a client configured for the target agent
 *
 * @returns A Botpress API client configured for the target agent
 */
export function getTargetBotClient(): APIClient {
  const pat = process.env.PAT;

  if (!pat) {
    throw new Error("PAT is not set. Please add it to the .env file.");
  }

  return new APIClient({
    apiUrl: API_BASE_URL,
    token: pat,
    workspaceId: process.env.TARGET_BOT_WORKSPACE_ID || "",
    botId: process.env.TARGET_BOT_ID || "",
  });
}
