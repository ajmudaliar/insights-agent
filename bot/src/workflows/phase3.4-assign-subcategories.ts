import { adk, Workflow, z } from "@botpress/runtime";
import { ConversationFeaturesTable } from "../tables/conversation-features";
import { InsightsConfigsTable } from "../tables/insights-configs";
import { CategoriesTable } from "../tables/categories";
import { SubcategoriesTable } from "../tables/subcategories";
import { ConversationCategoriesTable } from "../tables/conversation-categories";

/**
 * Phase 3.4: Assign Conversations to Subcategories
 *
 * Takes discovered subcategories from Phase 3.3 and assigns each conversation
 * within a category to the best matching subcategory using LLM-based classification.
 *
 * Process:
 * 1. Load subcategories grouped by category
 * 2. For each category with subcategories:
 *    a. Load conversations assigned to this category
 *    b. Assign each conversation to best subcategory (parallel)
 *    c. Update ConversationCategoriesTable with subcategory assignments
 * 3. Calculate statistics per subcategory
 * 4. Update SubcategoriesTable with counts and frequencies
 */
export const AssignConversationsToSubcategories = new Workflow({
  name: "assign_conversations_to_subcategories",
  description: "Assign conversations to discovered subcategories using LLM-based classification",
  timeout: "90m",
  input: z.object({
    configId: z.string().describe("Config ID for tracking which config was used"),
  }),
  output: z.object({
    total_conversations_assigned: z.number(),
    total_subcategories: z.number(),
    subcategory_statistics: z.array(
      z.object({
        categoryId: z.string(),
        categoryName: z.string(),
        subcategories: z.array(
          z.object({
            subcategoryId: z.string(),
            name: z.string(),
            conversation_count: z.number(),
            frequency_pct: z.number(),
            avg_confidence: z.number(),
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

    // Step 2: Load all subcategories
    const allSubcategories = await step("load-subcategories", async () => {
      const { rows } = await SubcategoriesTable.findRows({
        filter: { config_id: input.configId },
        limit: 500, // Adjust based on expected subcategory count
      });

      return rows;
    });

    // Early return if no subcategories exist (likely maxSubcategoriesPerCategory was set to 0)
    if (allSubcategories.length === 0) {
      return {
        total_conversations_assigned: 0,
        total_subcategories: 0,
        subcategory_statistics: [],
        save_result: {
          warnings: [
            "No subcategories found. This is expected if maxSubcategoriesPerCategory was set to 0. Otherwise, please run Phase 3.3 (discover-subcategories) first.",
          ],
        },
      };
    }

    // Step 3: Group subcategories by category_id
    const subcategoriesByCategory = allSubcategories.reduce(
      (acc, sub) => {
        if (!acc[sub.category_id]) {
          acc[sub.category_id] = [];
        }
        acc[sub.category_id].push(sub);
        return acc;
      },
      {} as Record<string, typeof allSubcategories>
    );

    // Step 4: Load categories for context
    const categories = await step("load-categories", async () => {
      const { rows } = await CategoriesTable.findRows({
        filter: { config_id: input.configId },
        limit: 50,
      });
      return rows;
    });

    // Create category lookup
    const categoryLookup = categories.reduce(
      (acc, cat) => {
        acc[cat.key] = cat;
        return acc;
      },
      {} as Record<string, (typeof categories)[0]>
    );

    // Step 5: Process each category with subcategories
    const categoryIds = Object.keys(subcategoriesByCategory);

    const assignmentResults = await step.map(
      "assign-subcategories-per-category",
      categoryIds,
      async (categoryId) => {
        const category = categoryLookup[categoryId];
        const subcategories = subcategoriesByCategory[categoryId];

        // 5a. Load conversations assigned to this category
        const categoryAssignments = await (async () => {
          const { rows } = await ConversationCategoriesTable.findRows({
            filter: {
              config_id: input.configId,
              category_id: categoryId,
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

        // 5b. Build subcategory options string
        const subcategoryOptions = subcategories
          .map(
            (sub, idx) => `${idx + 1}. ${sub.name}
   ${sub.summary}`
          )
          .join("\n\n");

        // 5c. Assign conversations to subcategories (parallel)
        const assignments = await Promise.all(
          features.map(async (feature) => {
            // Define assignment schema
            const assignmentSchema = z.object({
              subcategory_index: z
                .number()
                .min(1)
                .max(subcategories.length)
                .describe("The index of the best matching subcategory (1-based)"),
              confidence: z.number().min(0).max(1).describe("Confidence score for this assignment (0.0 to 1.0)"),
              reasoning: z.string().max(500).describe("Brief explanation of how this conversation helps answer the analytical question via this subcategory. Focus on the specific insight it provides."),
            });

            // Use LLM to assign conversation to subcategory
            const assignment = await adk.zai
              .with({ modelId: "best" })
              .extract(feature.transcript, assignmentSchema, {
                instructions: `Your task is to determine what specific insight this conversation provides about the analytical question: "${config.analytical_question}"

Agent: ${config.agent_description}
Focus: ${config.clustering_focus}

PARENT CATEGORY: ${category.name}
What this category reveals: ${category.summary}

SUBCATEGORIES (each represents a more specific insight within this category):
${subcategoryOptions}

Quick Summary: ${feature.semantic_string}

IMPORTANT: Select the subcategory that best captures the specific insight this conversation provides about the analytical question. Think about what nuanced aspect of the question this conversation helps answer.

In your reasoning (keep it concise, around 300-400 characters), explain:
- What specific insight this conversation provides about the analytical question
- Why this subcategory best captures that insight

Provide confidence (0.0-1.0) and brief reasoning focused on the analytical question.`,
              });

            // Convert 1-based index to 0-based and get subcategory ID
            const subcategoryIndex = assignment.subcategory_index - 1;
            const subcategoryId = subcategories[subcategoryIndex].key;

            // Update ConversationCategoriesTable with subcategory assignment (partial update)
            const saveResult = await ConversationCategoriesTable.upsertRows({
              rows: [
                {
                  key: `${input.configId}_${feature.key}`,
                  subcategory_id: subcategoryId,
                  subcategory_index: subcategoryIndex,
                  subcategory_confidence: assignment.confidence,
                  subcategory_reasoning: assignment.reasoning,
                },
              ],
              keyColumn: "key",
            });

            return {
              conversationId: feature.key,
              subcategoryId,
              subcategoryIndex,
              confidence: assignment.confidence,
              reasoning: assignment.reasoning,
              errors: saveResult.errors,
              warnings: saveResult.warnings,
            };
          })
        );

        // 5d. Calculate statistics per subcategory
        const subcategoryCounts = new Map<string, { count: number; totalConfidence: number }>();

        for (const assignment of assignments) {
          const current = subcategoryCounts.get(assignment.subcategoryId) || { count: 0, totalConfidence: 0 };
          subcategoryCounts.set(assignment.subcategoryId, {
            count: current.count + 1,
            totalConfidence: current.totalConfidence + assignment.confidence,
          });
        }

        const totalConversationsInCategory = assignments.length;

        // 5e. Update subcategories with statistics (batch update)
        const subcategoryRows = subcategories.map((subcategory) => {
          const counts = subcategoryCounts.get(subcategory.key) || { count: 0, totalConfidence: 0 };
          const conversationCount = counts.count;
          const frequencyPct =
            totalConversationsInCategory > 0 ? (conversationCount / totalConversationsInCategory) * 100 : 0;

          return {
            key: subcategory.key,
            config_id: subcategory.config_id,
            category_id: subcategory.category_id,
            name: subcategory.name,
            summary: subcategory.summary,
            representative_indices: subcategory.representative_indices,
            conversation_count: conversationCount,
            frequency_pct: frequencyPct,
          };
        });

        await SubcategoriesTable.upsertRows({
          rows: subcategoryRows,
          keyColumn: "key",
        });

        // Build statistics for output
        const subcategoryStats = subcategoryRows.map((row) => {
          const counts = subcategoryCounts.get(row.key) || { count: 0, totalConfidence: 0 };
          const avgConfidence = counts.count > 0 ? counts.totalConfidence / counts.count : 0;

          return {
            subcategoryId: row.key,
            name: row.name,
            conversation_count: row.conversation_count,
            frequency_pct: row.frequency_pct,
            avg_confidence: avgConfidence,
          };
        });

        // Aggregate errors and warnings for this category
        const categoryErrors = assignments.flatMap((a) => a.errors ?? []);
        const categoryWarnings = assignments.flatMap((a) => a.warnings ?? []);

        return {
          categoryId,
          categoryName: category.name,
          subcategories: subcategoryStats,
          totalAssignments: assignments.length,
          errors: categoryErrors,
          warnings: categoryWarnings,
        };
      },
      { concurrency: 3, maxAttempts: 2 }
    );

    // Step 6: Aggregate final results
    const totalAssignments = assignmentResults.reduce((sum, result) => sum + result.totalAssignments, 0);
    const totalSubcategories = allSubcategories.length;

    // Aggregate all errors and warnings
    const allErrors = assignmentResults.flatMap((r) => r.errors ?? []);
    const allWarnings = assignmentResults.flatMap((r) => r.warnings ?? []);

    return {
      total_conversations_assigned: totalAssignments,
      total_subcategories: totalSubcategories,
      subcategory_statistics: assignmentResults.map((r) => ({
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
