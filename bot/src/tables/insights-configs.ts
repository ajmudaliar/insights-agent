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
    analysis_mode: z.string().describe("Type of analysis: 'usage_patterns' or 'failure_modes'"),
    summary_prompt: z.string().describe("Template for generating conversation summaries"),
    attributes: z.array(z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
      filter_by: z.boolean().optional(),
    })).describe("Array of attributes to extract (categorical, numerical, boolean)"),
    feature_weights: z.object({
      semantic: z.number(),
      behavioral: z.number(),
    }).describe("Weights for semantic vs behavioral features"),
    clustering_focus: z.string().describe("Natural language description of what to cluster on"),
    agent_description: z.string().describe("Original input: description of what the bot does"),
    analytical_question: z.string().describe("Original input: what insights are being sought"),
    trace_structure: z.string().describe("Original input: how conversations are structured"),
    created_at: z.string().describe("ISO timestamp when config was created"),
  },
});
