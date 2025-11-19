import { adk, Workflow, z } from "@botpress/runtime";
import { ConversationFeaturesTable } from "../tables/conversation-features";
import { InsightsConfigsTable } from "../tables/insights-configs";
import { CategoriesTable } from "../tables/categories";

/**
 * Phase 3.1: Discover Top-Level Categories
 *
 * Two-Stage Approach:
 * - Stage 1: Discover categories from ALL semantic strings (implemented)
 * - Stage 2: Iterative refinement through active learning (placeholder)
 *
 * Stage 2 Strategy (Future):
 * - Randomly sample conversations not used in discovery
 * - Test if they fit existing categories
 * - If yes: reinforce category (do nothing)
 * - If no: adjust categories or create new ones
 * - Repeat n times or until target coverage is reached
 * - This is like reinforcement learning / active learning for taxonomy
 */
export const DiscoverCategories = new Workflow({
  name: "discover_categories",
  description: "Discover top-level categories from conversation features using LLM-based pattern recognition",
  timeout: "30m",
  input: z.object({
    configId: z.string().describe("Config ID for tracking which config was used"),
    maxTopLevelCategories: z.number().min(2).max(10).default(5).describe("Maximum number of top-level categories to discover"),
  }),
  output: z.object({
    categories: z.array(
      z.object({
        categoryId: z.string(),
        name: z.string(),
        summary: z.string(),
        representative_indices: z.array(z.number()),
      })
    ),
    total_conversations_analyzed: z.number(),
    save_result: z.object({
      errors: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    }),
  }),
  handler: async ({ input, step }) => {
    // ============================================================================
    // STAGE 1: DISCOVER CATEGORIES FROM SEMANTIC STRINGS
    // ============================================================================

    // Step 1: Load config
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

    // Step 2: Load all conversation features for this config
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

    // Step 3: Build context string with all semantic strings
    const semanticStringsText = features.map((f, idx) => `[${idx + 1}] ${f.semantic_string}`).join("\n\n");

    // Step 4: LLM-based category discovery
    const discovered = await step("discover-categories-from-semantic-strings", async () => {
      const categoriesSchema = z.object({
        categories: z
          .array(
            z.object({
              name: z.string().describe("Category name (2-4 words)"),
              summary: z
                .string()
                .describe("Brief summary explaining how conversations in this category help answer the analytical question (1-2 sentences). Frame the summary in terms of the question being asked.")
                .max(500),
              representative_indices: z
                .array(z.number())
                .describe("Indices of 5-10 most representative conversations from the list (1-based indexing)")
                .min(5)
                .max(10),
            })
          )
          .min(input.maxTopLevelCategories)
          .max(input.maxTopLevelCategories),
      });

      const result = await adk.zai.with({ modelId: "best" }).extract(semanticStringsText, categoriesSchema, {
        instructions: `You are analyzing ${features.length} conversations from a conversational AI agent.

CONTEXT:
- Agent Description: ${config.agent_description}
- Analytical Question: ${config.analytical_question}
- Analysis Focus: ${config.clustering_focus}
${config.domain_context ? `
DOMAIN KNOWLEDGE:
${config.domain_context}

Use this domain knowledge to better understand the conversations and identify patterns that are meaningful in this specific business context. This will help you recognize domain-specific entities, terminology, and user segments when forming categories.
` : ''}${config.categorization_guidance ? `
CATEGORIZATION APPROACH:
The user has provided specific guidance on how to approach categorization:
${config.categorization_guidance}

Follow this guidance when discovering and framing categories. Your categories should align with this approach.
` : ''}
CONVERSATIONS (structured features):
${semanticStringsText}

---

TASK: Identify ${input.maxTopLevelCategories} distinct categories that directly answer the analytical question: "${config.analytical_question}"

Your categories should:
1. Be framed entirely around answering the analytical question
2. Focus specifically on: ${config.clustering_focus}
3. Reveal actionable insights and clear patterns
4. Group conversations with similar intents, features, topics, outcomes, and attributes
5. Be specific enough to be actionable, but broad enough to group multiple conversations${config.categorization_guidance ? '\n6. Follow the categorization approach specified above' : ''}

For each category:
- Provide a clear, concise name (2-4 words)
- Write a brief summary that explicitly connects this category to the analytical question. The summary should explain what insight about the analytical question this category reveals, NOT just describe what's in the category.
- Select 5-10 representative conversation indices (using 1-based indexing) that best exemplify this category

Example: If the analytical question is "What topics are users asking about that we don't have content for?"
- BAD summary: "Questions about integrations and data sources"
- GOOD summary: "Users seeking content about advanced integration features (external databases, ADK) that our documentation doesn't adequately cover"

Make sure categories are:
- Mutually distinct (minimal overlap)
- Comprehensive (cover major patterns in the data)
- Framed as answers to the analytical question, not just descriptive labels`,
      });

      return result;
    });

    // Step 5: Save categories to table
    const saveResults = await step("save-categories", async () => {
      const results = await Promise.all(
        discovered.categories.map(async (cat, idx) => {
          const categoryId = `${input.configId}_cat_${idx}`;

          const result = await CategoriesTable.upsertRows({
            rows: [
              {
                key: categoryId,
                config_id: input.configId,
                name: cat.name,
                summary: cat.summary,
                representative_indices: cat.representative_indices,
                conversation_count: 0, // Will be filled after Phase 3.2 (assignment)
                frequency_pct: 0, // Will be calculated after Phase 3.2
              },
            ],
            keyColumn: "key",
          });

          return {
            categoryId,
            name: cat.name,
            summary: cat.summary,
            representative_indices: cat.representative_indices,
            saveResult: result,
          };
        })
      );

      // Aggregate errors and warnings
      const allErrors = results.filter((r) => r.saveResult.errors).flatMap((r) => r.saveResult.errors!);
      const allWarnings = results.filter((r) => r.saveResult.warnings).flatMap((r) => r.saveResult.warnings!);

      return {
        categories: results.map((r) => ({
          categoryId: r.categoryId,
          name: r.name,
          summary: r.summary,
          representative_indices: r.representative_indices,
        })),
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      };
    });

    // ============================================================================
    // STAGE 2: ITERATIVE REFINEMENT (PLACEHOLDER)
    // ============================================================================
    //
    // Future implementation: Active learning / reinforcement learning approach
    //
    // Algorithm:
    // 1. Sample N random conversations not used in discovery
    // 2. For each sampled conversation:
    //    a. Ask LLM: "Does this fit any existing category?"
    //    b. If YES: Reinforce (track confidence, do nothing to categories)
    //    c. If NO: Ask LLM to either:
    //       - Adjust existing category definitions to include it
    //       - Suggest a new category
    // 3. Track coverage: % of sampled conversations that fit
    // 4. Repeat until:
    //    - Coverage threshold reached (e.g., 90% fit existing categories)
    //    - Max iterations reached (e.g., n=50 samples)
    //    - Diminishing returns (few adjustments in last k iterations)
    //
    // Benefits:
    // - Discovers edge cases and boundary issues
    // - Improves category definitions organically
    // - Ensures categories are comprehensive
    // - Adaptive to dataset characteristics
    //
    // Implementation notes:
    // - Use transcripts for richer context during refinement
    // - Track which conversations triggered adjustments
    // - Store refinement history for transparency
    // - Consider confidence scores for category assignments
    //
    // await step("iterative-refinement", async () => {
    //   // TODO: Implement active learning refinement
    //   return { refined: false, iterations: 0, coverage: 0 };
    // });

    return {
      categories: saveResults.categories,
      total_conversations_analyzed: features.length,
      save_result: {
        errors: saveResults.errors,
        warnings: saveResults.warnings,
      },
    };
  },
});
