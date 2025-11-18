import { Table, z } from "@botpress/runtime";

/**
 * Stores subcategories within each top-level category.
 * Subcategories provide more granular insights by breaking down categories into specific patterns.
 * Created in Phase 3.3 and statistics filled in Phase 3.4.
 */
export const SubcategoriesTable = new Table({
  name: "SubcategoriesTable",
  description: "Subcategories within top-level categories",
  columns: {
    key: z.string().describe("Subcategory ID: ${configId}_cat_${catIdx}_sub_${subIdx}"),
    config_id: z.string().describe("ID of the config used"),
    category_id: z.string().describe("Parent category ID (reference to CategoriesTable)"),
    name: z.string().describe("Subcategory name (2-4 words)"),
    summary: z.string().describe("Brief summary of what this subcategory represents (1-2 sentences)"),
    representative_indices: z.array(z.number()).describe("Indices of representative conversations within parent category (1-based)"),
    conversation_count: z.number().describe("Number of conversations assigned to this subcategory (filled in Phase 3.4)").default(0),
    frequency_pct: z.number().describe("Percentage of conversations within parent category (filled in Phase 3.4)").default(0),
  },
  factor: 10,
});
