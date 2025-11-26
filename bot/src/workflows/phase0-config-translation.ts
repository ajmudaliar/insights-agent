import { adk, Workflow, z } from "@botpress/runtime";
import { InsightsConfigsTable } from "../tables/insights-configs";

/**
 * Phase 0: Configuration Generation
 *
 * Converts natural language inputs into:
 * 1. Feature extraction config (what to extract from conversations)
 * 2. Workflow params (how to sample and categorize)
 */
export const GenerateInsightsConfig = new Workflow({
  name: "config_translation",
  description: "Generate structured insights configuration from natural language inputs",
  timeout: "5m",
  input: z.object({
    agent_description: z.string().describe("Description of what the target bot does"),
    analytical_question: z.string().describe("What insights you want to discover"),
    domain_context: z.string().max(5000).optional().describe("Domain-specific context"),
    categorization_guidance: z.string().max(5000).optional().describe("How to approach category generation"),
  }),
  output: z.object({
    configId: z.string(),
    config: z.object({
      extract_features: z.array(z.string()),
      attributes: z.array(z.any()),
      clustering_focus: z.string(),
    }),
    workflow_params: z.object({
      sampling_mode: z.enum(["stratified", "date_range"]),
      sample_size: z.number().optional(),
      oversample_multiplier: z.number().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      max_messages_per_conversation: z.number(),
      max_top_level_categories: z.number(),
      min_category_size: z.number(),
      max_subcategories_per_category: z.number(),
    }),
  }),
  handler: async ({ input, step }) => {
    // Step 1: Generate feature extraction config
    const config = await step("generate-config", async () => {
      const inputText = `You are analyzing a conversational bot to generate insights. Based on the following information, create a structured configuration for analysis:

**Bot Description:** ${input.agent_description}

**Analytical Question:** ${input.analytical_question}
${input.domain_context ? `
**Domain Context:** ${input.domain_context}
` : ''}${input.categorization_guidance ? `
**Categorization Approach:** When analyzing conversations, they should be categorized using the following approach: ${input.categorization_guidance}
` : ''}
Generate a comprehensive configuration that will help answer the analytical question.${input.domain_context ? ' Consider the domain context when determining what features and attributes to extract' : ''}${input.categorization_guidance ? ' Ensure the clustering_focus aligns with the specified categorization approach, and consider whether any attributes should be generated to support this categorization strategy.' : ''}`;

      const configSchema = z.object({
        extract_features: z
          .array(z.string())
          .describe(
            "List of 3-5 specific features to extract from conversations (e.g., 'product_mentions', 'feature_references', 'question_intent_type', 'error_mentions', 'integration_requests'). These are semantic features that help identify usage patterns. If domain context is provided, consider generating domain-specific features based on that knowledge."
          ),
        attributes: z
          .array(
            z.object({
              name: z.string().describe("Name of the attribute (snake_case)"),
              type: z.enum(["categorical", "numerical", "boolean"]).describe("Data type of the attribute"),
              description: z.string().describe("What this attribute represents"),
              filter_by: z
                .boolean()
                .optional()
                .describe("If true, only analyze conversations where this is true (for boolean attributes)"),
            })
          )
          .describe(
            "List of 3-5 attributes to extract from conversations that will help answer the analytical question. If domain context is provided, consider generating attributes based on user segments, business metrics, or domain-specific categorizations mentioned in the context."
          ),
        clustering_focus: z
          .string()
          .describe(
            "In 1-2 sentences, describe what aspect of conversations should be used to group them together when answering the analytical question. If a categorization approach was provided, ensure this aligns with that approach."
          ),
      });

      return await adk.zai.with({ modelId: "best" }).extract(inputText, configSchema);
    });

    // Step 2: Generate workflow params
    const workflowParams = await step("generate-workflow-params", async () => {
      const today = new Date().toISOString().split("T")[0];

      const inputText = `Based on the user's analytical question, determine the best parameters for analyzing conversations.

**Analytical Question:** ${input.analytical_question}

**Bot Description:** ${input.agent_description}
${input.domain_context ? `\n**Domain Context:** ${input.domain_context}` : ""}

**Today's Date:** ${today}

Determine the best sampling approach and parameters:
- If the question mentions a specific time period (e.g., "last week", "yesterday", "this month", "November"), use date_range mode with appropriate dates.
- If the question is general (e.g., "what are users asking about", "common issues"), use stratified mode.
- Consider the complexity of the domain when setting category counts.`;

      const paramsSchema = z.object({
        sampling_mode: z
          .enum(["stratified", "date_range"])
          .describe("'stratified' for general analysis with weighted sampling by conversation length. 'date_range' if the question mentions a specific time period."),
        sample_size: z
          .number()
          .min(50)
          .max(500)
          .optional()
          .describe("[stratified only] Number of conversations to sample. Default 100. Use higher (200-300) for broad questions, lower (50-100) for focused questions."),
        oversample_multiplier: z
          .number()
          .min(3)
          .max(10)
          .optional()
          .describe("[stratified only] Multiplier for oversampling. Default 5."),
        start_date: z
          .string()
          .optional()
          .describe("[date_range only] Start date in ISO format (YYYY-MM-DDTHH:mm:ssZ). Infer from the question."),
        end_date: z
          .string()
          .optional()
          .describe("[date_range only] End date in ISO format (YYYY-MM-DDTHH:mm:ssZ). Infer from the question."),
        max_messages_per_conversation: z
          .number()
          .min(20)
          .max(200)
          .describe("Max messages to fetch per conversation. Default 50. Use higher for complex support bots."),
        max_top_level_categories: z
          .number()
          .min(3)
          .max(10)
          .describe("Max top-level categories. Default 5. Use more (7-10) for diverse bots, fewer (3-5) for focused bots."),
        min_category_size: z
          .number()
          .min(2)
          .max(10)
          .describe("Min conversations needed to generate subcategories. Default 3."),
        max_subcategories_per_category: z
          .number()
          .min(0)
          .max(10)
          .describe("Max subcategories per category. Default 5. Use 0 to skip subcategories."),
      });

      return await adk.zai.with({ modelId: "best" }).extract(inputText, paramsSchema);
    });

    // Step 3: Save to database
    const { configId } = await step("save-config", async () => {
      const configId = `cfg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const createdAt = new Date().toISOString();

      await InsightsConfigsTable.upsertRows({
        rows: [
          {
            key: configId,
            // Feature extraction config
            extract_features: config.extract_features,
            attributes: config.attributes,
            clustering_focus: config.clustering_focus,
            // Original inputs
            agent_description: input.agent_description,
            analytical_question: input.analytical_question,
            domain_context: input.domain_context,
            categorization_guidance: input.categorization_guidance,
            created_at: createdAt,
            // Workflow params
            sampling_mode: workflowParams.sampling_mode,
            sample_size: workflowParams.sample_size,
            oversample_multiplier: workflowParams.oversample_multiplier,
            start_date: workflowParams.start_date,
            end_date: workflowParams.end_date,
            max_messages_per_conversation: workflowParams.max_messages_per_conversation,
            max_top_level_categories: workflowParams.max_top_level_categories,
            min_category_size: workflowParams.min_category_size,
            max_subcategories_per_category: workflowParams.max_subcategories_per_category,
          },
        ],
        keyColumn: "key",
      });

      return { configId };
    });

    return {
      configId,
      config: {
        extract_features: config.extract_features,
        attributes: config.attributes,
        clustering_focus: config.clustering_focus,
      },
      workflow_params: workflowParams,
    };
  },
});
