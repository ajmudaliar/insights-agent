import { Workflow, z } from "@botpress/runtime";
import { GenerateConversationSummaries as SampleConversationsWorkflow } from "./phase1-sample-conversations";
import { ExtractSemanticFeatures as ExtractSemanticFeaturesWorkflow } from "./phase2-extract-semantic-features";
import { InsightsConfigsTable } from "../tables/insights-configs";

/**
 * Master Workflow: Orchestrates Phase 1 and Phase 2
 *
 * Phase 1: Sample conversations using stratified sampling
 * Phase 2: Extract semantic features and generate embeddings for clustering
 */
export const MasterWorkflow = new Workflow({
  name: "master_workflow",
  description: "Orchestrates conversation sampling, summary generation, and categorization",
  timeout: "90m",
  input: z.object({
    configId: z.string().describe("Config ID from Phase 0"),
    sampleSize: z.number().min(1).max(500).default(100).describe("Number of conversations to sample"),
    maxNumberOfMessages: z.number().min(1).max(100).default(50).describe("Maximum messages to fetch per conversation"),
  }),
  output: z.object({
    configId: z.string(),
    conversations_sampled: z.number(),
    features_extracted: z.object({
      total_processed: z.number(),
      total_included: z.number(),
      total_excluded: z.number(),
    }),
  }),
  handler: async ({ input, step }) => {
    // Load config from database
    const config = await step("load-config", async () => {
      const { rows } = await InsightsConfigsTable.findRows({
        filter: { key: input.configId },
        limit: 1,
      });

      if (rows.length === 0) {
        throw new Error(`Config not found: ${input.configId}`);
      }

      return rows[0];
    });

    // Phase 1: Sample conversations
    const phase1Id = await step("sample-conversations", async () => {
      const { id } = await SampleConversationsWorkflow.getOrCreate({
        input: {
          maxConversations: input.sampleSize,
          maxMessagesPerConversation: input.maxNumberOfMessages,
        },
      });
      return id;
    });

    // Wait for Phase 1 to complete and get results
    const { output: phase1Result } = await step.waitForWorkflow("sample_conversations", phase1Id);

    // Phase 2: Extract semantic features and generate embeddings
    const phase2Id = await step("extract-semantic-features", async () => {
      const { id } = await ExtractSemanticFeaturesWorkflow.getOrCreate({
        input: {
          configId: input.configId,
          config: config,
          conversationIds: phase1Result.conversationIds,
        },
      });
      return id;
    });

    // Wait for Phase 2 to complete and get results
    const { output: phase2Result } = await step.waitForWorkflow("extract_semantic_features", phase2Id);

    return {
      configId: input.configId,
      conversations_sampled: phase1Result.stratification.total_sampled,
      features_extracted: {
        total_processed: phase2Result.total_processed,
        total_included: phase2Result.total_included,
        total_excluded: phase2Result.total_excluded,
      },
    };
  },
});
