import { adk, Workflow, z } from "@botpress/runtime";
import { ConversationFeaturesTable } from "../tables/conversation-features";
import { InsightsConfigsTable } from "../tables/insights-configs";
import { CategoriesTable } from "../tables/categories";
import { ConversationCategoriesTable } from "../tables/conversation-categories";
import { SubcategoriesTable } from "../tables/subcategories";

/**
 * Phase 3.3: Discover Subcategories
 *
 * For each category with sufficient conversations, discover 2-N subcategories
 * that break down the category into more specific patterns.
 *
 * Process:
 * 1. Load categories with conversation counts
 * 2. Filter by minimum category size
 * 3. For each qualifying category (parallel):
 *    a. Load conversations assigned to this category
 *    b. Build context from semantic strings
 *    c. Use LLM to discover subcategories
 *    d. Save subcategories to database (batch)
 * 4. Return all discovered subcategories
 */
export const DiscoverSubcategories = new Workflow({
  name: "discover_subcategories",
  description: "Discover subcategories within each top-level category using LLM-based pattern recognition",
  timeout: "60m",
  input: z.object({
    configId: z.string().describe("Config ID for tracking which config was used"),
    minCategorySize: z
      .number()
      .min(3)
      .default(3)
      .describe("Minimum number of conversations required to generate subcategories"),
    maxSubcategoriesPerCategory: z
      .number()
      .min(2)
      .max(10)
      .default(5)
      .describe("Maximum number of subcategories to discover per category"),
  }),
  output: z.object({
    categories_processed: z.number(),
    total_subcategories_created: z.number(),
    subcategories_by_category: z.array(
      z.object({
        categoryId: z.string(),
        categoryName: z.string(),
        subcategories: z.array(
          z.object({
            subcategoryId: z.string(),
            name: z.string(),
            summary: z.string(),
            representative_indices: z.array(z.number()),
          })
        ),
      })
    ),
    save_result: z.object({
      errors: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    }),
  }),
  handler: async ({ input, step }) => {
    // Step 1: Load config for context
    const config = await step("load-config", async () => {
      const { rows } = await InsightsConfigsTable.findRows({
        filter: { key: input.configId },
        limit: 1,
      });

      if (rows.length === 0) {
        throw new Error(`Config not found: ${input.configId}`);
      }

      return rows[0];
    });

    // Step 2: Load categories with statistics
    const allCategories = await step("load-categories", async () => {
      const { rows } = await CategoriesTable.findRows({
        filter: { config_id: input.configId },
        limit: 50,
      });

      if (rows.length === 0) {
        throw new Error(
          `No categories found for config ${input.configId}. Please run Phase 3.1 (discover-categories) first.`
        );
      }

      return rows;
    });

    // Step 3: Filter categories by minimum size
    const qualifyingCategories = allCategories.filter((cat) => cat.conversation_count >= input.minCategorySize);

    if (qualifyingCategories.length === 0) {
      return {
        categories_processed: 0,
        total_subcategories_created: 0,
        subcategories_by_category: [],
        save_result: {
          warnings: [
            `No categories have at least ${input.minCategorySize} conversations. Cannot generate subcategories.`,
          ],
        },
      };
    }

    // Step 4: Discover subcategories for each qualifying category (parallel)
    const subcategoryResults = await step.map(
      "discover-subcategories-per-category",
      qualifyingCategories,
      async (category) => {
        // 4a. Load conversations assigned to this category
        const categoryAssignments = await (async () => {
          const { rows } = await ConversationCategoriesTable.findRows({
            filter: {
              config_id: input.configId,
              category_id: category.key,
            },
            limit: 1000,
          });
          return rows;
        })();

        // Get conversation IDs
        const conversationIds = categoryAssignments.map((a) => a.conversation_id);

        // Load features for these conversations
        const features = await (async () => {
          const { rows } = await ConversationFeaturesTable.findRows({
            filter: { config_id: input.configId },
            limit: 1000,
          });
          // Filter to only conversations in this category
          return rows.filter((f) => conversationIds.includes(f.key));
        })();

        // 4b. Build context string with semantic strings
        const semanticStringsText = features.map((f, idx) => `[${idx + 1}] ${f.semantic_string}`).join("\n\n");

        // 4c. LLM subcategory discovery
        const discovered = await (async () => {
          const subcategoriesSchema = z.object({
            subcategories: z
              .array(
                z.object({
                  name: z.string().describe("Subcategory name (2-4 words)"),
                  summary: z
                    .string()
                    .describe("Brief summary of what this subcategory represents (1-2 sentences)")
                    .max(200),
                  representative_indices: z
                    .array(z.number())
                    .describe("Indices of 2-5 most representative conversations from the list (1-based indexing)")
                    .min(2)
                    .max(5),
                })
              )
              .min(2)
              .max(input.maxSubcategoriesPerCategory),
          });

          const result = await adk.zai.with({ modelId: "best" }).extract(semanticStringsText, subcategoriesSchema, {
            instructions: `You are analyzing conversations within a specific category to discover subcategories.

ANALYSIS CONTEXT:
- Agent: ${config.agent_description}
- Analytical Question: ${config.analytical_question}
- Clustering Focus: ${config.clustering_focus}

PARENT CATEGORY: ${category.name}
Description: ${category.summary}

CONVERSATIONS IN THIS CATEGORY (${features.length} conversations):
${semanticStringsText}

---

TASK: Identify ${input.maxSubcategoriesPerCategory} distinct subcategories within "${category.name}" that:
1. Break down this category into more specific, actionable patterns
2. Stay aligned with: ${config.clustering_focus}
3. Help answer: ${config.analytical_question}
4. Each subcategory should represent a meaningfully different variation within this category

For each subcategory:
- Provide a clear, concise name (2-4 words)
- Write a brief summary explaining what distinguishes this subcategory
- Select 2-5 representative conversation indices (1-based) that best exemplify this subcategory

Make sure subcategories are:
- More specific than the parent category
- Mutually distinct within this category
- Relevant to the clustering focus`,
          });

          return result;
        })();

        // 4d. Save all subcategories for this category in one batch
        // Extract category index from category key
        const categoryKeyParts = category.key.split("_cat_");
        const categoryIndex = categoryKeyParts[1];

        const subcategoryRows = discovered.subcategories.map((sub, subIdx) => {
          const subcategoryId = `${input.configId}_cat_${categoryIndex}_sub_${subIdx}`;
          return {
            key: subcategoryId,
            config_id: input.configId,
            category_id: category.key,
            name: sub.name,
            summary: sub.summary,
            representative_indices: sub.representative_indices,
            conversation_count: 0, // Will be filled in Phase 3.4
            frequency_pct: 0, // Will be calculated in Phase 3.4
          };
        });

        const saveResult = await SubcategoriesTable.upsertRows({
          rows: subcategoryRows,
          keyColumn: "key",
        });

        return {
          categoryId: category.key,
          categoryName: category.name,
          subcategories: subcategoryRows.map((row) => ({
            subcategoryId: row.key,
            name: row.name,
            summary: row.summary,
            representative_indices: row.representative_indices,
          })),
          errors: saveResult.errors,
          warnings: saveResult.warnings,
        };
      },
      { concurrency: 5, maxAttempts: 2 }
    );

    // Step 5: Aggregate results
    const totalSubcategories = subcategoryResults.reduce((sum, result) => sum + result.subcategories.length, 0);

    // Aggregate all errors and warnings
    const allErrors = subcategoryResults.flatMap((r) => r.errors ?? []);
    const allWarnings = subcategoryResults.flatMap((r) => r.warnings ?? []);

    return {
      categories_processed: qualifyingCategories.length,
      total_subcategories_created: totalSubcategories,
      subcategories_by_category: subcategoryResults.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        subcategories: r.subcategories,
      })),
      save_result: {
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      },
    };
  },
});
