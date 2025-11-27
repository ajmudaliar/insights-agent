import { Autonomous } from "@botpress/runtime";
import { z } from "@botpress/sdk";
import { InsightsConfigsTable } from "../../tables/insights-configs";
import { CategoriesTable } from "../../tables/categories";
import { SubcategoriesTable } from "../../tables/subcategories";
import { ConversationFeaturesTable } from "../../tables/conversation-features";
import { ConversationCategoriesTable } from "../../tables/conversation-categories";

/**
 * Tool: listAvailableInsights
 * Lists all available insight configurations the user can explore.
 */
export const listAvailableInsights = new Autonomous.Tool({
  name: "listAvailableInsights",
  description:
    "List all available insight analyses. Use this first if you don't know which configId to use. Returns all insight configurations with their IDs and descriptions.",
  input: z.object({}),
  output: z.object({
    success: z.boolean(),
    list: z.string().describe("Formatted list of available insights"),
  }),
  handler: async () => {
    const { rows: configs } = await InsightsConfigsTable.findRows({
      limit: 20,
    });

    if (configs.length === 0) {
      return {
        success: true,
        list: "No insight analyses have been created yet.",
      };
    }

    let list = `## Available Insight Analyses\n\n`;

    for (const config of configs) {
      list += `### ${config.key}\n`;
      list += `**Question:** ${config.analytical_question}\n`;
      list += `**Agent:** ${config.agent_description.slice(0, 100)}${config.agent_description.length > 100 ? "..." : ""}\n`;
      list += `**Created:** ${config.created_at}\n`;
      list += `**Sampling:** ${config.sampling_mode}\n\n`;
    }

    return { success: true, list };
  },
});

/**
 * Tool: getInsightOverview
 * Returns a high-level summary of the insight analysis including all categories with their stats.
 */
export const getInsightOverview = new Autonomous.Tool({
  name: "getInsightOverview",
  description:
    "Get a high-level overview of the conversation insights analysis. Returns the analytical question, total conversations analyzed, and all discovered categories with their percentages and summaries. Use this first to understand what insights are available.",
  input: z.object({
    configId: z.string().describe("The insight configuration ID to get overview for"),
  }),
  output: z.object({
    success: z.boolean(),
    overview: z.string().describe("Formatted overview of the insights"),
  }),
  handler: async ({ configId }) => {
    // Fetch the config
    const { rows: configRows } = await InsightsConfigsTable.findRows({
      filter: { key: configId },
      limit: 1,
    });

    if (configRows.length === 0) {
      return {
        success: false,
        overview: `No insight analysis found with ID "${configId}". Please check the config ID.`,
      };
    }
    const config = configRows[0];

    // Fetch all categories for this config
    const { rows: categories } = await CategoriesTable.findRows({
      filter: { config_id: configId },
    });

    // Sort by frequency descending
    categories.sort((a, b) => b.frequency_pct - a.frequency_pct);

    // Build formatted overview
    let overview = `## Insight Analysis Overview\n\n`;
    overview += `**Question:** ${config.analytical_question}\n\n`;
    overview += `**Agent Description:** ${config.agent_description}\n\n`;

    if (config.domain_context) {
      overview += `**Domain Context:** ${config.domain_context}\n\n`;
    }

    overview += `**Sampling:** ${config.sampling_mode === "date_range" ? `Date range (${config.start_date} to ${config.end_date})` : `Stratified sample of ${config.sample_size} conversations`}\n\n`;

    overview += `---\n\n`;
    overview += `## Categories Discovered (${categories.length})\n\n`;

    if (categories.length === 0) {
      overview += `_No categories have been discovered yet. The analysis may still be in progress._\n`;
    } else {
      for (const cat of categories) {
        overview += `### ${cat.name} (${cat.frequency_pct.toFixed(1)}%)\n`;
        overview += `- **Conversations:** ${cat.conversation_count}\n`;
        overview += `- **Summary:** ${cat.summary}\n\n`;
      }
    }

    return { success: true, overview };
  },
});

/**
 * Tool: exploreCategory
 * Drills into a specific category to show subcategories and sample conversations.
 */
export const exploreCategory = new Autonomous.Tool({
  name: "exploreCategory",
  description:
    "Explore a specific category in detail. Returns subcategories (if any), their statistics, and sample conversations. Use after getInsightOverview to drill down into interesting categories.",
  input: z.object({
    configId: z.string().describe("The insight configuration ID"),
    categoryName: z
      .string()
      .describe("The name of the category to explore (case-insensitive partial match supported)"),
  }),
  output: z.object({
    success: z.boolean(),
    details: z.string().describe("Formatted category details"),
  }),
  handler: async ({ configId, categoryName }) => {
    // Find the category by name (case-insensitive partial match)
    const { rows: allCategories } = await CategoriesTable.findRows({
      filter: { config_id: configId },
    });

    const searchLower = categoryName.toLowerCase();
    const category = allCategories.find(
      (c) => c.name.toLowerCase().includes(searchLower) || searchLower.includes(c.name.toLowerCase())
    );

    if (!category) {
      const available = allCategories.map((c) => c.name).join(", ");
      return {
        success: false,
        details: `Category "${categoryName}" not found. Available categories: ${available}`,
      };
    }

    // Fetch subcategories for this category
    const { rows: subcategories } = await SubcategoriesTable.findRows({
      filter: { category_id: category.key },
    });

    // Sort subcategories by frequency
    subcategories.sort((a, b) => b.frequency_pct - a.frequency_pct);

    // Fetch sample conversations in this category (limit to 5)
    const { rows: categoryConversations } = await ConversationCategoriesTable.findRows({
      filter: { config_id: configId, category_id: category.key },
      limit: 5,
    });

    // Get conversation features for the samples
    const sampleConversations: Array<{
      id: string;
      intent: string;
      outcome: string;
      confidence: number;
      reasoning: string;
    }> = [];

    for (const conv of categoryConversations) {
      const { rows: featureRows } = await ConversationFeaturesTable.findRows({
        filter: { key: conv.conversation_id, config_id: configId },
        limit: 1,
      });
      if (featureRows.length > 0) {
        const features = featureRows[0];
        sampleConversations.push({
          id: conv.conversation_id,
          intent: features.primary_user_intent,
          outcome: features.conversation_outcome,
          confidence: conv.category_confidence,
          reasoning: conv.category_reasoning,
        });
      }
    }

    // Build formatted details
    let details = `## Category: ${category.name}\n\n`;
    details += `**Summary:** ${category.summary}\n\n`;
    details += `**Statistics:**\n`;
    details += `- Conversations: ${category.conversation_count}\n`;
    details += `- Percentage of total: ${category.frequency_pct.toFixed(1)}%\n\n`;

    if (subcategories.length > 0) {
      details += `---\n\n`;
      details += `### Subcategories (${subcategories.length})\n\n`;
      for (const sub of subcategories) {
        details += `**${sub.name}** (${sub.frequency_pct.toFixed(1)}% of category)\n`;
        details += `- Conversations: ${sub.conversation_count}\n`;
        details += `- ${sub.summary}\n\n`;
      }
    }

    if (sampleConversations.length > 0) {
      details += `---\n\n`;
      details += `### Sample Conversations\n\n`;
      for (const sample of sampleConversations) {
        details += `**Conversation ${sample.id.slice(0, 8)}...**\n`;
        details += `- Intent: ${sample.intent}\n`;
        details += `- Outcome: ${sample.outcome}\n`;
        details += `- Confidence: ${(sample.confidence * 100).toFixed(0)}%\n`;
        details += `- Why categorized here: ${sample.reasoning}\n\n`;
      }
    }

    return { success: true, details };
  },
});

/**
 * Tool: searchConversations
 * Searches conversations by intent, topic, outcome, or attributes.
 */
export const searchConversations = new Autonomous.Tool({
  name: "searchConversations",
  description:
    "Search for conversations matching specific criteria. Can search by user intent, topics, conversation outcome, or extracted attributes. Returns matching conversations with their key features.",
  input: z.object({
    configId: z.string().describe("The insight configuration ID"),
    query: z
      .string()
      .describe(
        "Search query - matches against user intent, topics, and semantic features. Use natural language."
      ),
    outcome: z
      .enum(["satisfied", "unsatisfied", "unclear", "any"])
      .default("any")
      .describe("Filter by conversation outcome"),
    limit: z.number().min(1).max(20).default(10).describe("Maximum results to return"),
  }),
  output: z.object({
    success: z.boolean(),
    results: z.string().describe("Formatted search results"),
    matchCount: z.number().describe("Number of matches found"),
  }),
  handler: async ({ configId, query, outcome, limit }) => {
    // Fetch all conversation features for this config
    const { rows: allFeatures } = await ConversationFeaturesTable.findRows({
      filter: { config_id: configId },
      limit: 500, // Fetch more to search through
    });

    const queryLower = query.toLowerCase();

    // Filter conversations by query and outcome
    const matches = allFeatures.filter((conv) => {
      // Outcome filter
      if (outcome !== "any" && conv.conversation_outcome !== outcome) {
        return false;
      }

      // Text search across intent, topics, and semantic string
      const searchableText = [
        conv.primary_user_intent,
        conv.key_topics.join(" "),
        conv.semantic_string,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(queryLower);
    });

    // Limit results
    const limitedMatches = matches.slice(0, limit);

    // Get category assignments for context
    const results: Array<{
      id: string;
      intent: string;
      outcome: string;
      topics: string[];
      category?: string;
    }> = [];

    for (const match of limitedMatches) {
      const { rows: assignmentRows } = await ConversationCategoriesTable.findRows({
        filter: { config_id: configId, conversation_id: match.key },
        limit: 1,
      });

      let categoryName: string | undefined;
      if (assignmentRows.length > 0) {
        const { rows: catRows } = await CategoriesTable.findRows({
          filter: { key: assignmentRows[0].category_id },
          limit: 1,
        });
        categoryName = catRows[0]?.name;
      }

      results.push({
        id: match.key,
        intent: match.primary_user_intent,
        outcome: match.conversation_outcome,
        topics: match.key_topics,
        category: categoryName,
      });
    }

    // Build formatted results
    let resultsText = `## Search Results for "${query}"\n\n`;
    resultsText += `Found ${matches.length} conversations`;
    if (outcome !== "any") {
      resultsText += ` with outcome "${outcome}"`;
    }
    resultsText += `.\n\n`;

    if (results.length === 0) {
      resultsText += `_No conversations matched your search criteria._\n`;
    } else {
      resultsText += `Showing top ${results.length}:\n\n`;
      for (const result of results) {
        resultsText += `---\n`;
        resultsText += `**Conversation ${result.id.slice(0, 8)}...**\n`;
        resultsText += `- Intent: ${result.intent}\n`;
        resultsText += `- Outcome: ${result.outcome}\n`;
        resultsText += `- Topics: ${result.topics.join(", ")}\n`;
        if (result.category) {
          resultsText += `- Category: ${result.category}\n`;
        }
        resultsText += `\n`;
      }
    }

    return {
      success: true,
      results: resultsText,
      matchCount: matches.length,
    };
  },
});

/**
 * Tool: getConversationDetail
 * Gets the full transcript and all extracted features for a specific conversation.
 */
export const getConversationDetail = new Autonomous.Tool({
  name: "getConversationDetail",
  description:
    "Get complete details for a specific conversation including the full transcript, extracted features, and category assignment. Use when you need to see the actual conversation content.",
  input: z.object({
    configId: z.string().describe("The insight configuration ID"),
    conversationId: z
      .string()
      .describe("The conversation ID (can be partial - will match if ID starts with this value)"),
  }),
  output: z.object({
    success: z.boolean(),
    detail: z.string().describe("Formatted conversation details"),
  }),
  handler: async ({ configId, conversationId }) => {
    // Find conversation features (support partial ID match)
    const { rows: allFeatures } = await ConversationFeaturesTable.findRows({
      filter: { config_id: configId },
      limit: 200,
    });

    const conversation = allFeatures.find((c) => c.key.startsWith(conversationId));

    if (!conversation) {
      return {
        success: false,
        detail: `Conversation "${conversationId}" not found. Please check the conversation ID.`,
      };
    }

    // Get category assignment
    const { rows: assignmentRows } = await ConversationCategoriesTable.findRows({
      filter: { config_id: configId, conversation_id: conversation.key },
      limit: 1,
    });

    let categoryInfo = "";
    let subcategoryInfo = "";

    if (assignmentRows.length > 0) {
      const assignment = assignmentRows[0];

      const { rows: catRows } = await CategoriesTable.findRows({
        filter: { key: assignment.category_id },
        limit: 1,
      });

      if (catRows.length > 0) {
        categoryInfo = `**Category:** ${catRows[0].name} (${(assignment.category_confidence * 100).toFixed(0)}% confidence)\n`;
        categoryInfo += `- Reasoning: ${assignment.category_reasoning}\n`;
      }

      if (assignment.subcategory_id) {
        const { rows: subRows } = await SubcategoriesTable.findRows({
          filter: { key: assignment.subcategory_id },
          limit: 1,
        });

        if (subRows.length > 0) {
          subcategoryInfo = `**Subcategory:** ${subRows[0].name} (${((assignment.subcategory_confidence || 0) * 100).toFixed(0)}% confidence)\n`;
          subcategoryInfo += `- Reasoning: ${assignment.subcategory_reasoning || "N/A"}\n`;
        }
      }
    }

    // Build formatted detail
    let detail = `## Conversation Details\n\n`;
    detail += `**ID:** ${conversation.key}\n\n`;

    detail += `### Classification\n`;
    detail += categoryInfo || "_Not yet categorized_\n";
    detail += subcategoryInfo;
    detail += `\n`;

    detail += `### Extracted Features\n`;
    detail += `**Primary Intent:** ${conversation.primary_user_intent}\n`;
    detail += `**Outcome:** ${conversation.conversation_outcome}\n`;
    detail += `**Key Topics:** ${conversation.key_topics.join(", ")}\n\n`;

    // Show specific features
    if (Object.keys(conversation.specific_features).length > 0) {
      detail += `**Specific Features:**\n`;
      for (const [key, values] of Object.entries(conversation.specific_features)) {
        const valuesArray = values as string[];
        if (valuesArray.length > 0) {
          detail += `- ${key}: ${valuesArray.join(", ")}\n`;
        }
      }
      detail += `\n`;
    }

    // Show custom attributes
    if (Object.keys(conversation.attributes).length > 0) {
      detail += `**Attributes:**\n`;
      for (const [key, value] of Object.entries(conversation.attributes)) {
        detail += `- ${key}: ${value}\n`;
      }
      detail += `\n`;
    }

    detail += `---\n\n`;
    detail += `### Full Transcript\n\n`;
    detail += "```\n";
    detail += conversation.transcript;
    detail += "\n```\n";

    return { success: true, detail };
  },
});

// Export all tools as an array for easy import
export const insightTools = [
  listAvailableInsights,
  getInsightOverview,
  exploreCategory,
  searchConversations,
  getConversationDetail,
];