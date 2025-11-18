import { Table, z } from "@botpress/runtime";

/**
 * Stores top-level categories discovered from conversation analysis.
 * Categories are discovered in Phase 3.1 and refined through iterative learning.
 */
export const CategoriesTable = new Table({
  name: "CategoriesTable",
  description: "Top-level categories discovered from conversations",
  columns: {
    key: z.string().describe("Category ID: ${configId}_cat_${index}"),
    config_id: z.string().describe("ID of the config used"),
    name: z.string().describe("Category name (2-4 words)"),
    summary: z.string().describe("Brief summary of what this category represents (1-2 sentences)"),
    representative_indices: z.array(z.number()).describe("Indices of representative conversations (1-based)"),
    conversation_count: z.number().describe("Number of conversations assigned to this category (filled after Phase 3.2)").default(0),
    frequency_pct: z.number().describe("Percentage of total conversations (filled after Phase 3.2)").default(0),
  },
  factor: 10,
});
