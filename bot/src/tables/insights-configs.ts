import { Table, z } from "@botpress/runtime";

/**
 * Stores configuration for insights analysis generated from natural language inputs.
 * Each config defines how conversations should be analyzed, summarized, and categorized.
 */
export const InsightsConfigsTable = new Table({
  name: "InsightsConfigsTable",
  description: "Configuration for insights analysis",
  columns: {
    key: z.string().describe("Unique identifier for the config"),
    extract_features: z.array(z.string()).describe("List of specific features to extract from conversations (e.g., 'product_mentions', 'feature_references', 'question_intent_type')"),
    attributes: z.array(z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
      filter_by: z.boolean().optional(),
    })).describe("Array of user-defined attributes to extract (categorical, numerical, boolean)"),
    clustering_focus: z.string().describe("Natural language description of what to cluster on"),
    agent_description: z.string().describe("Original input: description of what the bot does"),
    analytical_question: z.string().describe("Original input: what insights are being sought"),
    domain_context: z.string().optional().describe("Domain-specific context about business, products, users, terminology.'"),
    categorization_guidance: z.string().optional().describe("User guidance on how to approach category generation.'"),
    created_at: z.string().describe("ISO timestamp when config was created"),
  },
  factor: 10,
});