import { adk, Workflow, z } from "@botpress/runtime";
import { ConversationFeaturesTable } from "../tables/conversation-features";
import { CategoriesTable } from "../tables/categories";
import { ConversationCategoriesTable } from "../tables/conversation-categories";
import { InsightsConfigsTable } from "../tables/insights-configs";

/**
 * Phase 3.2: Assign Conversations to Categories
 *
 * Takes discovered categories from Phase 3.1 and assigns each conversation
 * to the best matching category using LLM-based classification.
 *
 * For each conversation:
 * - LLM evaluates fit against all categories
 * - Returns category choice, confidence (0-1), and reasoning
 * - Saves assignment incrementally to database
 *
 * After all assignments:
 * - Calculates statistics per category
 * - Updates CategoriesTable with conversation counts and frequencies
 */
export const AssignConversationsToCategories = new Workflow({
  name: "assign_conversations_to_categories",
  description: "Assign conversations to discovered categories using LLM-based classification",
  timeout: "60m",
  input: z.object({
    configId: z.string().describe("Config ID for tracking which config was used"),
  }),
  output: z.object({
    total_conversations: z.number(),
    total_assigned: z.number(),
    category_statistics: z.array(
      z.object({
        categoryId: z.string(),
        name: z.string(),
        conversation_count: z.number(),
        frequency_pct: z.number(),
        avg_confidence: z.number(),
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

    // Step 2: Load categories discovered in Phase 3.1
    const categories = await step("load-categories", async () => {
      const { rows } = await CategoriesTable.findRows({
        filter: { config_id: input.configId },
        limit: 50, // Should be plenty for top-level categories
      });

      if (rows.length === 0) {
        throw new Error(
          `No categories found for config ${input.configId}. Please run Phase 3.1 (discover-categories) first.`
        );
      }

      return rows;
    });

    // Step 3: Load all conversation features
    const features = await step("load-features", async () => {
      const { rows } = await ConversationFeaturesTable.findRows({
        filter: { config_id: input.configId },
        limit: 1000, // Adjust based on expected conversation count
      });

      if (rows.length === 0) {
        throw new Error(`No conversation features found for config: ${input.configId}`);
      }

      return rows;
    });

    // Step 4: Build category options string for LLM prompt
    const categoryOptions = categories
      .map(
        (cat, idx) => `${idx + 1}. ${cat.name}
   ${cat.summary}`
      )
      .join("\n\n");

    // Step 5: Assign conversations to categories in parallel
    const assignments = await step.map(
      "assign-conversations-to-categories",
      features,
      async (feature) => {
        // Define assignment schema
        const assignmentSchema = z.object({
          category_index: z
            .number()
            .min(1)
            .max(categories.length)
            .describe("The index of the best matching category (1-based)"),
          confidence: z.number().min(0).max(1).describe("Confidence score for this assignment (0.0 to 1.0)"),
          reasoning: z.string().max(200).describe("Brief explanation for why this category was chosen"),
        });

        // Use LLM to assign conversation to category based on full transcript
        const assignment = await adk.zai.with({ modelId: "best" }).extract(feature.transcript, assignmentSchema, {
          instructions: `Categorize this conversation to answer: "${config.analytical_question}"

Agent: ${config.agent_description}
Focus: ${config.clustering_focus}

CATEGORIES:
${categoryOptions}

Quick Summary: ${feature.semantic_string}

Select the best matching category based on user intent, conversation outcome, and alignment with the focus area above.

Provide confidence (0.0-1.0) and brief reasoning.`,
        });

        // Convert 1-based index to 0-based and get category ID
        const categoryIndex = assignment.category_index - 1;
        const categoryId = categories[categoryIndex].key;

        // Save assignment to table immediately
        const saveResult = await ConversationCategoriesTable.upsertRows({
          rows: [
            {
              key: `${input.configId}_${feature.key}`,
              config_id: input.configId,
              conversation_id: feature.key,
              category_id: categoryId,
              category_index: categoryIndex,
              confidence: assignment.confidence,
              reasoning: assignment.reasoning,
            },
          ],
          keyColumn: "key",
        });

        return {
          conversationId: feature.key,
          categoryId,
          categoryIndex,
          confidence: assignment.confidence,
          reasoning: assignment.reasoning,
          errors: saveResult.errors,
          warnings: saveResult.warnings,
        };
      },
      { concurrency: 10, maxAttempts: 2 }
    );

    // Step 6: Calculate statistics per category
    const categoryStatistics = await step("calculate-category-statistics", async () => {
      // Count assignments per category
      const categoryCounts = new Map<string, { count: number; totalConfidence: number }>();

      for (const assignment of assignments) {
        const current = categoryCounts.get(assignment.categoryId) || { count: 0, totalConfidence: 0 };
        categoryCounts.set(assignment.categoryId, {
          count: current.count + 1,
          totalConfidence: current.totalConfidence + assignment.confidence,
        });
      }

      const totalConversations = assignments.length;

      // Build statistics and update categories table
      const stats = await Promise.all(
        categories.map(async (category) => {
          const counts = categoryCounts.get(category.key) || { count: 0, totalConfidence: 0 };
          const conversationCount = counts.count;
          const frequencyPct = totalConversations > 0 ? (conversationCount / totalConversations) * 100 : 0;
          const avgConfidence = conversationCount > 0 ? counts.totalConfidence / conversationCount : 0;

          // Update category with statistics
          await CategoriesTable.upsertRows({
            rows: [
              {
                key: category.key,
                config_id: category.config_id,
                name: category.name,
                summary: category.summary,
                representative_indices: category.representative_indices,
                conversation_count: conversationCount,
                frequency_pct: frequencyPct,
              },
            ],
            keyColumn: "key",
          });

          return {
            categoryId: category.key,
            name: category.name,
            conversation_count: conversationCount,
            frequency_pct: frequencyPct,
            avg_confidence: avgConfidence,
          };
        })
      );

      return stats;
    });

    // Aggregate errors and warnings from all assignments
    const allErrors = assignments.filter((a) => a.errors).flatMap((a) => a.errors!);
    const allWarnings = assignments.filter((a) => a.warnings).flatMap((a) => a.warnings!);

    return {
      total_conversations: features.length,
      total_assigned: assignments.length,
      category_statistics: categoryStatistics,
      save_result: {
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      },
    };
  },
});
