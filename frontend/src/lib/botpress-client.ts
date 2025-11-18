import { Client } from "@botpress/client";

const API_BASE_URL = "https://api.botpress.cloud";

/**
 * Get the Botpress API client
 *
 * The PAT (Personal Access Token) is read from VITE_BOTPRESS_PAT environment variable.
 * Get your PAT from: https://app.botpress.cloud/settings/access-tokens
 */
export function getBotpressClient({
  botId,
  workspaceId,
}: {
  botId?: string;
  workspaceId?: string;
}) {
  const pat = import.meta.env.VITE_BOTPRESS_PAT;

  if (!pat) {
    throw new Error(
      "VITE_BOTPRESS_PAT not set. Please add it to your .env file."
    );
  }

  return new Client({
    apiUrl: API_BASE_URL,
    token: pat,
    workspaceId,
    botId,
  });
}

/**
 * Get the Target Bot API client (for viewing conversations)
 */
export function getTargetBotClient({
  botId,
  workspaceId,
}: {
  botId?: string;
  workspaceId?: string;
}) {
  const pat = import.meta.env.VITE_BOTPRESS_PAT;

  if (!pat) {
    throw new Error(
      "VITE_BOTPRESS_PAT not set. Please add it to your .env file."
    );
  }

  return new Client({
    apiUrl: API_BASE_URL,
    token: pat,
    workspaceId,
    botId,
  });
}
