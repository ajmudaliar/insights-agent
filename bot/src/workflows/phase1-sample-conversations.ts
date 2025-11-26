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
    oversampleMultiplier: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe("Multiplier to oversample conversations for better stratification"),
  }),
  output: z.object({
    stratification: z.object({
      total_fetched: z.number(),
      skipped_empty: z.number(),
      skipped_failed: z.number(),
      total_sampled: z.number(),
      buckets: z.record(z.tuple([z.number(), z.number()])), // { bucket_name: [available, sampled] }
    }),
    conversationIds: z.array(z.string()),
  }),
  handler: async ({ input, step }) => {
    // Step 2: Fetch conversations with messages using stratified sampling
    const samplingResult = await step("stratified-sample-conversations", async () => {
      const result = await stratifiedSampleConversations(
        input.maxConversations,
        input.maxMessagesPerConversation,
        { oversampleMultiplier: input.oversampleMultiplier } // Fetch oversampled conversations for better stratification
      );
      return result;
    });

    const conversationsWithMessages = samplingResult.conversations;
    const stratificationInfo = samplingResult.stratification;

    return {
      stratification: stratificationInfo,
      conversationIds: conversationsWithMessages.map((c) => c.conversation.id),
    };
  },
});
