import { Workflow, z } from "@botpress/runtime";
import { stratifiedSampleConversations } from "../utils/conversations";

/**
 * Phase 1: Sample Conversations (Stratified)
 * Weighted sampling by conversation length - favors longer conversations
 */
export const SampleStratified = new Workflow({
  name: "sample_stratified",
  description: "Sample conversations using stratified sampling by length",
  timeout: "30m",
  input: z.object({
    maxConversations: z.number().min(1).max(500).default(100).describe("Maximum conversations to sample"),
    oversampleMultiplier: z.number().min(1).max(10).default(5).describe("Multiplier for oversampling"),
    maxMessagesPerConversation: z.number().min(1).max(500).default(100).describe("Max messages per conversation"),
  }),
  output: z.object({
    stats: z.object({
      total_fetched: z.number(),
      skipped_failed: z.number(),
      total_sampled: z.number(),
      buckets: z.record(z.tuple([z.number(), z.number()])),
    }),
    conversationIds: z.array(z.string()),
  }),
  handler: async ({ input, step }) => {
    const result = await step("stratified-sample", async () => {
      return await stratifiedSampleConversations(
        input.maxConversations,
        input.maxMessagesPerConversation,
        { oversampleMultiplier: input.oversampleMultiplier }
      );
    });

    return {
      stats: {
        total_fetched: result.stratification.total_fetched,
        skipped_failed: result.stratification.skipped_failed,
        total_sampled: result.stratification.total_sampled,
        buckets: result.stratification.buckets,
      },
      conversationIds: result.conversations.map((c) => c.conversation.id),
    };
  },
});
