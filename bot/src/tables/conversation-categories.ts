import { Table, z } from "@botpress/runtime";

/**
 * Maps conversations to categories and subcategories with confidence scores and reasoning.
 * Created in Phase 3.2 and updated in Phase 3.3.
 */
export const ConversationCategoriesTable = new Table({
  name: "ConversationCategoriesTable",
  description: "Maps conversations to categories with confidence and reasoning",
  columns: {
    key: z.string().describe("Composite key: ${configId}_${conversationId}"),
    config_id: z.string().describe("ID of the config used"),
    conversation_id: z.string().describe("ID of the conversation"),
    category_id: z.string().describe("Reference to CategoriesTable"),
    category_index: z.number().describe("0-based index of the category"),
    confidence: z.number().describe("LLM confidence score (0.0 to 1.0)"),
    reasoning: z.string().describe("Why this category was chosen"),
    subcategory_id: z.string().describe("Reference to SubcategoriesTable (filled in Phase 3.3)").optional(),
    subcategory_index: z.number().describe("0-based index of subcategory (filled in Phase 3.3)").optional(),
  },
  factor: 10,
});
