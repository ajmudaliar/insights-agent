import { adk, Workflow, z } from "@botpress/runtime";
import { fetchConversationById } from "../utils/conversations/base";
import { fetchLastNMessages } from "../utils/conversations/fetching";
import { generateTranscript } from "../utils/transcript";
import { generateEmbedding } from "../utils/embedding";
import { ConversationFeaturesTable } from "../tables/conversation-features";

export const ExtractSemanticFeatures = new Workflow({
  name: "extract_semantic_features",
  description: "Extract semantic features from conversations based on the provided configuration",
  timeout: "60m",
  input: z.object({
    configId: z.string().describe("Config ID for tracking which config was used"),
    config: z.object({
      summary_prompt: z.string(),
      extract_features: z.array(z.string()),
      attributes: z.array(z.any()),
      clustering_focus: z.string(),
    }),
    conversationIds: z.array(z.string()).describe("List of conversation IDs to process"),
  }),
  output: z.object({
    total_processed: z.number().describe("Total conversations processed"),
    total_included: z.number().describe("Conversations included in results"),
    total_excluded: z.number().describe("Conversations excluded by filter_by attributes"),
    save_to_table_result: z.any(),
  }),
  handler: async ({ input, step }) => {
    const allResults = await step.map(
      "extract-features-from-conversations",
      input.conversationIds,
      async (conversationId) => {
        const messages = await fetchLastNMessages(conversationId, 100);
        const transcript = generateTranscript(messages);

        // Build the extraction schema with all required fields
        const extractionSchema = z.object({
          primary_user_intent: z
            .string()
            .describe("The primary intent or goal the user is trying to accomplish in this conversation"),
          specific_features: z
            .object(
              input.config.extract_features.reduce((schema: any, feature: string) => {
                schema[feature] = z.array(z.string()).describe(`List of ${feature} mentioned in the conversation`);
                return schema;
              }, {})
            )
            .describe(`Specific features mentioned: ${input.config.extract_features.join(", ")}`),
          conversation_outcome: z
            .enum(["satisfied", "unsatisfied", "unclear"])
            .describe("Overall outcome of the conversation based on user satisfaction"),
          key_topics: z.array(z.string()).describe("List of key topics discussed in the conversation"),
          attributes: z
            .object(
              input.config.attributes.reduce((schema: any, attr: any) => {
                if (attr.type === "categorical") {
                  schema[attr.name] = z.string().describe(attr.description);
                } else if (attr.type === "numerical") {
                  schema[attr.name] = z.number().describe(attr.description);
                } else if (attr.type === "boolean") {
                  schema[attr.name] = z.boolean().describe(attr.description);
                }
                return schema;
              }, {})
            )
            .describe(
              `User-defined attributes: ${input.config.attributes.map((a: any) => `${a.name} (${a.type})`).join(", ")}`
            ),
        });

        const extractedData = await adk.zai.with({ modelId: "best" }).extract(transcript, extractionSchema);

        // Apply filter attributes - exclude conversation if any filter_by boolean attribute is false
        const shouldExclude = input.config.attributes.some((attr: any) => {
          return attr.type === "boolean" && attr.filter_by === true && extractedData.attributes[attr.name] === false;
        });

        if (shouldExclude) {
          return null; // Exclude this conversation from results
        }

        // Generate semantic string for embedding (used later in clustering)
        const semanticString = [
          // Intent: provides the "what they're trying to accomplish" context
          extractedData.primary_user_intent,

          // Specific features: CORE of usage patterns - with labels for clarity
          ...Object.entries(extractedData.specific_features).flatMap(([featureType, mentions]) =>
            mentions.map((mention: string) => `${featureType}: ${mention}`)
          ),

          // Topics: additional context for disambiguation
          ...extractedData.key_topics,
        ]
          .filter(Boolean)
          .join(". ");

        // Generate embedding from semantic string (with rate limiting)
        const embedding = await generateEmbedding(semanticString);

        return {
          conversationId,
          primary_user_intent: extractedData.primary_user_intent,
          specific_features: extractedData.specific_features,
          conversation_outcome: extractedData.conversation_outcome,
          key_topics: extractedData.key_topics,
          attributes: extractedData.attributes,
          semantic_string: semanticString,
          embedding: embedding,
        };
      },
      { concurrency: 10, maxAttempts: 2 }
    );

    // Filter out null results (excluded conversations)
    const filteredResults = allResults.filter((result) => result !== null);

    const total_processed = input.conversationIds.length;
    const total_included = filteredResults.length;
    const total_excluded = total_processed - total_included;

    // Save results to table
    const result = await step("save-to-table", async () => {
      if (filteredResults.length === 0) {
        return true; // Nothing to save
      }

      const createdAt = new Date().toISOString();

      const result = await ConversationFeaturesTable.upsertRows({
        rows: filteredResults.map((result) => ({
          key: result.conversationId,
          config_id: input.configId,
          primary_user_intent: result.primary_user_intent,
          specific_features: result.specific_features,
          conversation_outcome: result.conversation_outcome,
          key_topics: result.key_topics,
          attributes: result.attributes,
          semantic_string: result.semantic_string,
          embedding: result.embedding,
          created_at: createdAt,
        })),
        keyColumn: "key",
      });

      return result;
    });

    return {
      total_processed,
      total_included,
      total_excluded,
      save_to_table_result: result,
    };
  },
});
