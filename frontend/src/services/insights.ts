import { getBotpressClient, getTargetBotClient } from "@/lib/botpress-client";
import { WORKSPACE_ID, BOT_ID, TARGET_BOT_WORKSPACE_ID, TARGET_BOT_ID } from "@/config";
import type {
  InsightsConfig,
  ClusteringResult,
  Conversation,
  Message,
  ConversationWithMessages,
} from "@/types/insights";

const client = getBotpressClient({ workspaceId: WORKSPACE_ID, botId: BOT_ID });
const targetClient = getTargetBotClient({ workspaceId: TARGET_BOT_WORKSPACE_ID, botId: TARGET_BOT_ID });

/**
 * Create a new insights config from natural language
 */
export async function createInsight(input: {
  agent_description: string;
  analytical_question: string;
}): Promise<{ configId: string }> {
  try {
    const { workflow } = await client.getOrCreateWorkflow({
      name: "config_translation",
      status: "pending",
      tags: { configType: "insights" },
      input,
    });

    // Don't poll - just return the workflow, frontend can check status later
    return { configId: workflow.id };
  } catch (error) {
    console.error("Failed to create insight:", error);
    throw error;
  }
}

/**
 * List all insights configs
 */
export async function listConfigs(): Promise<InsightsConfig[]> {
  try {
    const result = await client.findTableRows({
      table: "InsightsConfigsTable",
      limit: 1000,
    });

    return result.rows as unknown as InsightsConfig[];
  } catch (error) {
    console.error("Failed to list configs:", error);
    throw new Error("Failed to fetch insights configs");
  }
}

/**
 * Get a single config by key
 */
export async function getConfig(configId: string): Promise<InsightsConfig | null> {
  try {
    const result = await client.findTableRows({
      table: "InsightsConfigsTable",
      filter: { key: configId },
      limit: 1,
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as unknown as InsightsConfig;
  } catch (error) {
    console.error("Failed to get config:", error);
    return null;
  }
}

/**
 * Get clustering results for a config
 */
export async function getClusteringResults(
  configId: string
): Promise<ClusteringResult | null> {
  try {
    const result = await client.findTableRows({
      table: "ClusteringResultsTable",
      filter: { config_id: configId },
      limit: 1,
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as unknown as ClusteringResult;
  } catch (error) {
    console.error("Failed to get clustering results:", error);
    return null;
  }
}

/**
 * Delete an insights config and all associated data
 */
export async function deleteConfig(configId: string): Promise<void> {
  try {
    await client.deleteTableRows({
      table: "ClusteringResultsTable",
      filter: { config_id: configId },
    });

    await client.deleteTableRows({
      table: "ConversationFeaturesTable",
      filter: { config_id: configId },
    });

    await client.deleteTableRows({
      table: "InsightsConfigsTable",
      filter: { key: configId },
    });
  } catch (error) {
    console.error("Failed to delete config:", error);
    throw new Error("Failed to delete insight config");
  }
}

/**
 * Fetch a single conversation by ID from the target bot
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const result = await targetClient.getConversation({ id: conversationId });
    return result.conversation as unknown as Conversation;
  } catch (error) {
    console.error("Failed to get conversation:", error);
    return null;
  }
}

/**
 * Fetch all messages for a conversation from the target bot
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const messages: Message[] = [];
    let nextToken: string | undefined;

    do {
      const result = await targetClient.listMessages({
        conversationId,
        nextToken,
      });

      messages.push(...(result.messages as unknown as Message[]));
      nextToken = result.meta.nextToken;
    } while (nextToken);

    return messages;
  } catch (error) {
    console.error("Failed to get messages:", error);
    return [];
  }
}

/**
 * Fetch conversation with all its messages
 */
export async function getConversationWithMessages(
  conversationId: string
): Promise<ConversationWithMessages | null> {
  try {
    const [conversation, messages] = await Promise.all([
      getConversation(conversationId),
      getMessages(conversationId),
    ]);

    if (!conversation) {
      return null;
    }

    return {
      conversation,
      messages,
    };
  } catch (error) {
    console.error("Failed to get conversation with messages:", error);
    return null;
  }
}
