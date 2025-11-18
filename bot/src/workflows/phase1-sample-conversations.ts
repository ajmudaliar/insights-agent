import { Workflow, z } from "@botpress/runtime";
import { stratifiedSampleConversations } from "../utils/conversations";

/**
 * Phase 2: Sampling
 */
export const GenerateConversationSummaries = new Workflow({
  name: "sample_conversations",
  description: "Fetch conversations using stratified sampling",
  timeout: "30m",
  input: z.object({
    maxConversations: z
      .number()
      .min(1)
      .max(500)
      .default(100)
      .describe("Maximum number of conversations to analyze (≤1000)"),
    maxMessagesPerConversation: z
      .number()
      .min(1)
      .max(500)
      .default(100)
      .describe("Maximum messages to fetch per conversation"),
  }),
  output: z.object({
    stratification: z.object({
      total_fetched: z.number(),
      total_sampled: z.number(),
      oversample_multiplier: z.number(),
      buckets: z.array(
        z.object({
          name: z.string(),
          turn_range: z.string(),
          weight: z.number(),
          available: z.number(),
          sampled: z.number(),
          percentage: z.number(),
        })
      ),
    }),
    conversationIds: z.array(z.string()),
    conversations_fetched: z.number(),
  }),
  handler: async ({ input, step }) => {
    // Step 2: Fetch conversations with messages using stratified sampling
    const samplingResult = await step("stratified-sample-conversations", async () => {
      const result = await stratifiedSampleConversations(
        input.maxConversations,
        input.maxMessagesPerConversation,
        { oversampleMultiplier: 3 } // Fetch 3× conversations for better stratification
      );
      return result;
    });

    const conversationsWithMessages = samplingResult.conversations;
    const stratificationInfo = samplingResult.stratification;

    return {
      stratification: stratificationInfo,
      conversationIds: conversationsWithMessages.map((c) => c.conversation.id),
      conversations_fetched: conversationsWithMessages.length,
    };
  },
});
