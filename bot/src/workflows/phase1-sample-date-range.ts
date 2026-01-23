import { Workflow, z } from "@botpress/runtime";
import { fetchConversationsInDateRange } from "../utils/conversations";

/**
 * Phase 1: Sample Conversations (Date Range)
 * Fetch all conversations within a date range
 */
export const SampleDateRange = new Workflow({
  name: "sample_date_range",
  description: "Fetch all conversations within a date range",
  timeout: "30m",
  input: z.object({
    startDate: z.string().describe("Start date (ISO string, inclusive)"),
    endDate: z.string().describe("End date (ISO string, inclusive)"),
    maxMessagesPerConversation: z.number().min(1).max(500).default(100).describe("Max messages per conversation"),
  }),
  output: z.object({
    stats: z.object({
      total_fetched: z.number(),
      skipped_failed: z.number(),
      total_sampled: z.number(),
    }),
    conversationIds: z.array(z.string()),
  }),
  handler: async ({ input, step }) => {
    const result = await step("fetch-date-range", async () => {
      return await fetchConversationsInDateRange(
        new Date(input.startDate),
        new Date(input.endDate),
        { maxMessagesPerConversation: input.maxMessagesPerConversation }
      );
    });

    return {
      stats: {
        total_fetched: result.stats.total_fetched,
        skipped_failed: result.stats.skipped_failed,
        total_sampled: result.stats.total_included,
      },
      conversationIds: result.conversations.map((c) => c.conversation.id),
    };
  },
});
