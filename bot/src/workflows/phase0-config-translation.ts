import { adk, Workflow, z } from "@botpress/runtime";
import { InsightsConfigsTable } from "../tables/insights-configs";

/**
 * Phase 1: Configuration Generation
 *
 * Converts natural language inputs (the "3 prompts") into a structured
 * configuration for insights analysis using adk.zai.extract().
 */
export const GenerateInsightsConfig = new Workflow({
  name: "config_translation",
  description: "Generate structured insights configuration from natural language inputs",
  timeout: "5m",
  input: z.object({
    agent_description: z.string().describe("Description of what the target bot does"),
    analytical_question: z.string().describe("What insights you want to discover (e.g., 'Why are users frustrated?')"),
  }),
  output: z.object({
    configId: z.string(),
    config: z.object({
      summary_prompt: z.string(),
      extract_features: z.array(z.string()),
      attributes: z.array(z.any()),
      clustering_focus: z.string(),
    }),
    result: z.any(),
  }),
  handler: async ({ input, step }) => {
    const config = await step("generate-config", async () => {
      // Prepare the input text for extraction
      const inputText = `You are analyzing a conversational bot to generate insights. Based on the following information, create a structured configuration for analysis:

**Bot Description:** ${input.agent_description}

**Analytical Question:** ${input.analytical_question}

Generate a comprehensive configuration that will help answer the analytical question.`;

      // Define the schema for extraction
      const configSchema = z.object({
        summary_prompt: z
          .string()
          .describe(
            "A prompt template for summarizing individual conversations. Include what information to extract from the conversation transcript that relates to the analytical question. Keep it concise (2-3 sentences)."
          ),
        extract_features: z
          .array(z.string())
          .describe(
            "List of 3-5 specific features to extract from conversations (e.g., 'product_mentions', 'feature_references', 'question_intent_type', 'error_mentions', 'integration_requests'). These are semantic features that help identify usage patterns."
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
            "List of 3-5 attributes to extract from conversations that will help answer the analytical question"
          ),
        clustering_focus: z
          .string()
          .describe(
            "In 1-2 sentences, describe what aspect of conversations should be used to group them together when answering the analytical question"
          ),
      });

      // Use adk.zai.extract with correct signature: extract(input, schema, options?)
      const output = await adk.zai.with({ modelId: "best" }).extract(inputText, configSchema);

      return output;
    });

    const { configId, result } = await step("save-config", async () => {
      const configId = `cfg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const createdAt = new Date().toISOString();

      const result = await InsightsConfigsTable.upsertRows({
        rows: [
          {
            key: configId,
            summary_prompt: config.summary_prompt,
            extract_features: config.extract_features,
            attributes: config.attributes,
            clustering_focus: config.clustering_focus,
            agent_description: input.agent_description,
            analytical_question: input.analytical_question,
            created_at: createdAt,
          },
        ],
        keyColumn: "key",
      });

      return { configId, result };
    });

    return {
      configId,
      config: {
        summary_prompt: config.summary_prompt,
        extract_features: config.extract_features,
        attributes: config.attributes,
        clustering_focus: config.clustering_focus,
      },
      result
    };
  },
});
