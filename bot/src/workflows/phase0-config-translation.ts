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
    domain_context: z.string().max(5000).optional().describe("Domain-specific context about business, products, users, terminology. Max 5000 characters."),
    categorization_guidance: z.string().max(5000).optional().describe("How to approach category generation. Max 5000 characters."),
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
${input.domain_context ? `
**Domain Context:** ${input.domain_context}
` : ''}${input.categorization_guidance ? `
**Categorization Approach:** When analyzing conversations, they should be categorized using the following approach: ${input.categorization_guidance}
` : ''}
Generate a comprehensive configuration that will help answer the analytical question.${input.domain_context ? ' Consider the domain context when determining what features and attributes to extract' : ''}${input.categorization_guidance ? ' Ensure the clustering_focus aligns with the specified categorization approach, and consider whether any attributes should be generated to support this categorization strategy.' : ''}`;

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
            domain_context: input.domain_context,
            categorization_guidance: input.categorization_guidance,
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
