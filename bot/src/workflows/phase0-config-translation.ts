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
    trace_structure: z
      .string()
      .describe("How conversations are structured (e.g., 'User asks question, bot responds with answer')"),
  }),
  output: z.object({
    success: z.boolean(),
    configId: z.string(),
    config: z.object({
      analysis_mode: z.string(),
      summary_prompt: z.string(),
      attributes: z.array(z.any()),
      feature_weights: z.object({
        semantic: z.number(),
        behavioral: z.number(),
      }),
      clustering_focus: z.string(),
    }),
    execution_time_ms: z.number(),
  }),
  handler: async ({ input, step }) => {
    const startTime = Date.now();

    const config = await step("generate-config", async () => {
      // Prepare the input text for extraction
      const inputText = `You are analyzing a conversational bot to generate insights. Based on the following information, create a structured configuration for analysis:

**Bot Description:** ${input.agent_description}

**Analytical Question:** ${input.analytical_question}

**Conversation Structure:** ${input.trace_structure}

Generate a comprehensive configuration that will help answer the analytical question.`;

      // Define the schema for extraction
      const configSchema = z.object({
        analysis_mode: z
          .enum(["usage_patterns", "failure_modes"])
          .describe(
            "If the question focuses on how users interact, behavior patterns, or feature usage, choose 'usage_patterns'. If it focuses on errors, failures, or problems, choose 'failure_modes'"
          ),
        summary_prompt: z
          .string()
          .describe(
            "A prompt template for summarizing individual conversations. Include what information to extract from the conversation transcript that relates to the analytical question. Keep it concise (2-3 sentences)."
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
        feature_weights: z
          .object({
            semantic: z
              .number()
              .min(0)
              .max(1)
              .describe(
                "Weight for semantic/content features (0-1). Use higher values (0.7-0.8) for usage patterns, lower (0.2-0.3) for failure modes"
              ),
            behavioral: z
              .number()
              .min(0)
              .max(1)
              .describe(
                "Weight for behavioral/metric features (0-1). Use lower values (0.2-0.3) for usage patterns, higher (0.7-0.8) for failure modes"
              ),
          })
          .describe("Weights should sum to approximately 1.0"),
        clustering_focus: z
          .string()
          .describe(
            "In 1-2 sentences, describe what aspect of conversations should be used to group them together when answering the analytical question"
          ),
      });

      // Use adk.zai.extract with correct signature: extract(input, schema, options?)
      const output = await adk.zai.with({modelId: 'best'}).extract(inputText, configSchema);

      return output;
    });

    const configId = await step("save-config", async () => {
      const configId = `cfg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const createdAt = new Date().toISOString();

      await InsightsConfigsTable.upsertRows({
        rows: [
          {
            key: configId,
            analysis_mode: config.analysis_mode,
            summary_prompt: config.summary_prompt,
            attributes: config.attributes,
            feature_weights: config.feature_weights,
            clustering_focus: config.clustering_focus,
            agent_description: input.agent_description,
            analytical_question: input.analytical_question,
            trace_structure: input.trace_structure,
            created_at: createdAt,
          },
        ],
        keyColumn: "key",
      });

      return configId;
    });

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      configId,
      config: {
        analysis_mode: config.analysis_mode,
        summary_prompt: config.summary_prompt,
        attributes: config.attributes,
        feature_weights: config.feature_weights,
        clustering_focus: config.clustering_focus,
      },
      execution_time_ms: executionTime,
    };
  },
});
