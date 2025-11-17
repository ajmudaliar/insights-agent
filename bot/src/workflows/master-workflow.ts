import { Workflow, z } from "@botpress/runtime";
import { GenerateConversationSummaries as SampleConversationsWorkflow } from "./phase1-sample-conversations";

/**
 * Master Workflow: Orchestrates Phase 1, Phase 2, and Phase 3
 *
 * Phase 1: Sample conversations
 * Phase 2: Generate summaries for sampled conversations
 * Phase 3: Generate hierarchical categories from summaries
 */
export const MasterWorkflow = new Workflow({
  name: "master_workflow",
  description: "Orchestrates conversation sampling, summary generation, and categorization",
  timeout: "90m",
  input: z.object({
    configId: z.string().describe("Config ID from Phase 0"),
    maxConversations: z.number().min(1).max(500).default(100).describe("Maximum number of conversations to analyze"),
    maxMessagesPerConversation: z
      .number()
      .min(1)
      .max(500)
      .default(100)
      .describe("Maximum messages to fetch per conversation"),
  }),
  output: z.object({
    configId: z.string(),
    conversations_sampled: z.number(),
  }),
  handler: async ({ input, step }) => {
    // Phase 1: Sample conversations
    const phase1Id = await step("start-conversation-sampling", async () => {
      const { id } = await SampleConversationsWorkflow.getOrCreate({
        input: {
          maxConversations: input.maxConversations,
          maxMessagesPerConversation: input.maxMessagesPerConversation,
        },
      });
      return id;
    });

    // Wait for Phase 1 to complete and get results
    const { output: phase1Result } = await step.waitForWorkflow("sample_conversations", phase1Id);

    return {
      configId: input.configId,
      conversations_sampled: phase1Result.conversations_fetched,
    };
  },
});
