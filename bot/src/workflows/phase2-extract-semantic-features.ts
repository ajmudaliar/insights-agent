import { adk, Workflow, z } from "@botpress/runtime";
import { fetchConversationById } from "../utils/conversations/base";
import { fetchLastNMessages } from "../utils/conversations/fetching";
import { generateTranscript } from "../utils/transcript";

export const ExtractSemanticFeatures = new Workflow({
  name: "extract_semantic_features",
  description: "Extract semantic features from conversations based on the provided configuration",
  timeout: "60m",
  input: z.object({
    config: z.object({
      summary_prompt: z.string(),
      extract_features: z.array(z.string()),
      attributes: z.array(z.any()),
      clustering_focus: z.string(),
    }),
    conversationIds: z.array(z.string()).describe("List of conversation IDs to process"),
  }),
  output: z.object({}),
  handler: async ({ input, step }) => {
    const result = await step.map(
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

        const extractedData = await adk.zai.extract(transcript, extractionSchema);

        return {
          conversationId,
          primary_user_intent: extractedData.primary_user_intent,
          specific_features: extractedData.specific_features,
          conversation_outcome: extractedData.conversation_outcome,
          key_topics: extractedData.key_topics,
          attributes: extractedData.attributes,
        };
      }
    );
  },
});
