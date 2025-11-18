import { getBotpressClient, getTargetBotClient } from "@/lib/botpress-client";
import { WORKSPACE_ID, BOT_ID, TARGET_BOT_WORKSPACE_ID, TARGET_BOT_ID } from "@/config";
import type { InsightsConfig, Conversation, Message, ConversationWithMessages } from "@/types/insights";

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
 * Get all categories for a config
 */
export async function getCategories(configId: string) {
  try {
    const result = await client.findTableRows({
      table: "CategoriesTable",
      filter: { config_id: configId },
      limit: 100,
    });

    return result.rows as unknown as import("@/types/insights").Category[];
  } catch (error) {
    console.error("Failed to get categories:", error);
    return [];
  }
}

/**
 * Get subcategories (optionally filtered by category)
 */
export async function getSubcategories(configId: string, categoryId?: string) {
  try {
    const filter: any = { config_id: configId };
    if (categoryId) {
      filter.category_id = categoryId;
    }

    const result = await client.findTableRows({
      table: "SubcategoriesTable",
      filter,
      limit: 500,
    });

    return result.rows as unknown as import("@/types/insights").Subcategory[];
  } catch (error) {
    console.error("Failed to get subcategories:", error);
    return [];
  }
}

/**
 * Get conversation assignments (category and subcategory)
 */
export async function getConversationCategories(configId: string) {
  try {
    const result = await client.findTableRows({
      table: "ConversationCategoriesTable",
      filter: { config_id: configId },
      limit: 1000,
    });

    return result.rows as unknown as import("@/types/insights").ConversationCategory[];
  } catch (error) {
    console.error("Failed to get conversation categories:", error);
    return [];
  }
}

/**
 * Get conversation features (intent, topics, outcome, etc.)
 */
export async function getConversationFeatures(configId: string) {
  try {
    const result = await client.findTableRows({
      table: "ConversationFeaturesTable",
      filter: { config_id: configId },
      limit: 1000,
    });

    return result.rows as unknown as import("@/types/insights").ConversationFeatures[];
  } catch (error) {
    console.error("Failed to get conversation features:", error);
    return [];
  }
}

/**
 * Get a category with its subcategories
 */
export async function getCategoryWithSubcategories(
  configId: string,
  categoryId: string
): Promise<import("@/types/insights").CategoryWithSubcategories | null> {
  try {
    const [categories, subcategories] = await Promise.all([
      getCategories(configId),
      getSubcategories(configId, categoryId),
    ]);

    const category = categories.find((c) => c.key === categoryId);
    if (!category) {
      return null;
    }

    return {
      category,
      subcategories,
    };
  } catch (error) {
    console.error("Failed to get category with subcategories:", error);
    return null;
  }
}

/**
 * Get conversation IDs for a category
 */
export async function getConversationsForCategory(configId: string, categoryId: string): Promise<string[]> {
  try {
    const assignments = await getConversationCategories(configId);
    return assignments.filter((a) => a.category_id === categoryId).map((a) => a.conversation_id);
  } catch (error) {
    console.error("Failed to get conversations for category:", error);
    return [];
  }
}

/**
 * Get conversation IDs for a subcategory
 */
export async function getConversationsForSubcategory(configId: string, subcategoryId: string): Promise<string[]> {
  try {
    const assignments = await getConversationCategories(configId);
    return assignments.filter((a) => a.subcategory_id === subcategoryId).map((a) => a.conversation_id);
  } catch (error) {
    console.error("Failed to get conversations for subcategory:", error);
    return [];
  }
}

/**
 * Calculate topology statistics for a config
 */
export async function getTopologyStats(configId: string): Promise<import("@/types/insights").TopologyStats> {
  try {
    const [categories, subcategories, assignments, features] = await Promise.all([
      getCategories(configId),
      getSubcategories(configId),
      getConversationCategories(configId),
      getConversationFeatures(configId),
    ]);

    // Calculate average confidences
    const categoryConfidences = assignments.map((a) => a.category_confidence);
    const avgCategoryConfidence =
      categoryConfidences.length > 0 ? categoryConfidences.reduce((a, b) => a + b, 0) / categoryConfidences.length : 0;

    const subcategoryConfidences = assignments
      .filter((a) => a.subcategory_confidence !== undefined)
      .map((a) => a.subcategory_confidence!);
    const avgSubcategoryConfidence =
      subcategoryConfidences.length > 0
        ? subcategoryConfidences.reduce((a, b) => a + b, 0) / subcategoryConfidences.length
        : 0;

    // Count by outcome
    const outcomeCount = features.reduce(
      (acc, f) => {
        acc[f.conversation_outcome]++;
        return acc;
      },
      { satisfied: 0, unsatisfied: 0, unclear: 0 } as Record<string, number>
    );

    return {
      total_categories: categories.length,
      total_subcategories: subcategories.length,
      total_conversations: assignments.length,
      avg_category_confidence: avgCategoryConfidence,
      avg_subcategory_confidence: avgSubcategoryConfidence,
      conversations_by_outcome: outcomeCount as any,
    };
  } catch (error) {
    console.error("Failed to calculate topology stats:", error);
    return {
      total_categories: 0,
      total_subcategories: 0,
      total_conversations: 0,
      avg_category_confidence: 0,
      avg_subcategory_confidence: 0,
      conversations_by_outcome: { satisfied: 0, unsatisfied: 0, unclear: 0 },
    };
  }
}

/**
 * Delete an insights config and all associated data
 */
export async function deleteConfig(configId: string): Promise<void> {
  try {
    // Delete in order: subcategories -> categories -> assignments -> features -> config
    await client.deleteTableRows({
      table: "SubcategoriesTable",
      filter: { config_id: configId },
    });

    await client.deleteTableRows({
      table: "CategoriesTable",
      filter: { config_id: configId },
    });

    await client.deleteTableRows({
      table: "ConversationCategoriesTable",
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
