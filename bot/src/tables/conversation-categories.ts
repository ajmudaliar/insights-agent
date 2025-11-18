import { Table, z } from "@botpress/runtime";

/**
 * Maps conversations to categories and subcategories with confidence scores and reasoning.
 * Tracks both high-level (category) and low-level (subcategory) classifications.
 * Created in Phase 3.2 and updated in Phase 3.4.
 */
export const ConversationCategoriesTable = new Table({
  name: "ConversationCategoriesTable",
  description: "Maps conversations to categories and subcategories with hierarchical confidence and reasoning",
  columns: {
    key: z.string().describe("Composite key: ${configId}_${conversationId}"),
    config_id: z.string().describe("ID of the config used"),
    conversation_id: z.string().describe("ID of the conversation"),

    // Category-level assignment (Phase 3.2)
    category_id: z.string().describe("Reference to CategoriesTable"),
    category_index: z.number().describe("0-based index of the category"),
    category_confidence: z.number().describe("LLM confidence score for category assignment (0.0 to 1.0)"),
    category_reasoning: z.string().describe("Why this category was chosen"),

    // Subcategory-level assignment (Phase 3.4)
    subcategory_id: z.string().describe("Reference to SubcategoriesTable (filled in Phase 3.4)").optional(),
    subcategory_index: z.number().describe("0-based index of subcategory (filled in Phase 3.4)").optional(),
    subcategory_confidence: z
      .number()
      .describe("LLM confidence score for subcategory assignment (0.0 to 1.0, filled in Phase 3.4)")
      .optional(),
    subcategory_reasoning: z.string().describe("Why this subcategory was chosen (filled in Phase 3.4)").optional(),
  },
  factor: 10,
});
