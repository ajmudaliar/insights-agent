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
      .min(0)
      .max(10)
      .default(5)
      .describe("Maximum number of subcategories to discover per category (0 to skip subcategories)"),
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
    // Early return if subcategories are disabled
    if (input.maxSubcategoriesPerCategory === 0) {
      return {
        categories_processed: 0,
        total_subcategories_created: 0,
        subcategories_by_category: [],
        save_result: {
          warnings: ["Subcategory discovery skipped: maxSubcategoriesPerCategory is set to 0"],
        },
      };
    }

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
                    .describe("Brief summary explaining how conversations in this subcategory help answer the analytical question. Frame the summary in terms of the specific insight this subcategory reveals within the parent category context.")
                    .max(500),
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
            instructions: `You are analyzing conversations within a specific category to discover more specific patterns that answer the analytical question.

ANALYSIS CONTEXT:
- Agent: ${config.agent_description}
- Analytical Question: ${config.analytical_question}
- Clustering Focus: ${config.clustering_focus}

PARENT CATEGORY: ${category.name}
What this category reveals about the analytical question: ${category.summary}

CONVERSATIONS IN THIS CATEGORY (${features.length} conversations):
${semanticStringsText}

---

TASK: Within the "${category.name}" category, identify ${input.maxSubcategoriesPerCategory} distinct subcategories that provide more specific insights about the analytical question: "${config.analytical_question}"

Your subcategories should:
1. Break down the parent category's insight into more specific, actionable patterns
2. Each reveal a different facet of how these conversations answer the analytical question
3. Focus on: ${config.clustering_focus}
4. Be meaningfully distinct from each other

For each subcategory:
- Provide a clear, concise name (2-4 words)
- Write a brief summary that explains what specific insight about the analytical question this subcategory reveals (within the context of the parent category). Don't just describe the subcategory - explain how it helps answer the question.
- Select 2-5 representative conversation indices (1-based) that best exemplify this subcategory

Example: If parent category is "Users seeking content about advanced integrations" and analytical question is "What topics are users asking about that we don't have content for?"
- BAD subcategory summary: "Questions about database integrations"
- GOOD subcategory summary: "Users requesting documentation on connecting external SQL databases and NoSQL stores, which is not covered in our current integration guides"

Make sure subcategories are:
- More specific than the parent category
- Mutually distinct within this category
- Framed as specific answers to the analytical question`,
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
