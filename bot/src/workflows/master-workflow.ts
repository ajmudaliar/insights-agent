import { Workflow, z } from "@botpress/runtime";
import { GenerateConversationSummaries as SampleConversationsWorkflow } from "./phase1-sample-conversations";
import { ExtractSemanticFeatures as ExtractSemanticFeaturesWorkflow } from "./phase2-extract-semantic-features";
import { DiscoverAndAssignTopology as DiscoverAndAssignTopologyWorkflow } from "./phase3-discover-and-assign-topology";
import { InsightsConfigsTable } from "../tables/insights-configs";

/**
 * Master Workflow: Orchestrates Complete Insights Pipeline
 *
 * Phase 1: Sample conversations using stratified sampling
 * Phase 2: Extract semantic features from conversations
 * Phase 3: Discover hierarchical topology and assign conversations
 */
export const MasterWorkflow = new Workflow({
  name: "master_workflow",
  description: "Orchestrates complete insights pipeline: sampling, feature extraction, and hierarchical categorization",
  timeout: "240m",
  input: z.object({
    configId: z.string().describe("Config ID from Phase 0"),
    sampleSize: z.number().min(1).max(500).default(100).describe("Number of conversations to sample"),
    maxNumberOfMessages: z.number().min(1).max(100).default(50).describe("Maximum messages to fetch per conversation"),
    maxTopLevelCategories: z.number().min(2).max(10).default(5).describe("Maximum number of top-level categories"),
    minCategorySize: z.number().min(3).default(3).describe("Minimum conversations to generate subcategories"),
    maxSubcategoriesPerCategory: z.number().min(0).max(10).default(5).describe("Maximum subcategories per category (0 to skip subcategories)"),
  }),
  output: z.object({
    configId: z.string(),
    conversations_sampled: z.number(),
    features_extracted: z.object({
      total_processed: z.number(),
      total_included: z.number(),
      total_excluded: z.number(),
    }),
    topology: z.object({
      categories_discovered: z.number(),
      subcategories_discovered: z.number(),
      conversations_categorized: z.number(),
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

    // Phase 3: Discover topology and assign conversations
    const phase3Id = await step("discover-and-assign-topology", async () => {
      const { id } = await DiscoverAndAssignTopologyWorkflow.getOrCreate({
        input: {
          configId: input.configId,
          maxTopLevelCategories: input.maxTopLevelCategories,
          minCategorySize: input.minCategorySize,
          maxSubcategoriesPerCategory: input.maxSubcategoriesPerCategory,
        },
      });
      return id;
    });

    // Wait for Phase 3 to complete and get results
    const { output: phase3Result } = await step.waitForWorkflow("discover_and_assign_topology", phase3Id);

    return {
      configId: input.configId,
      conversations_sampled: phase1Result.stratification.total_sampled,
      features_extracted: {
        total_processed: phase2Result.total_processed,
        total_included: phase2Result.total_included,
        total_excluded: phase2Result.total_excluded,
      },
      topology: {
        categories_discovered: phase3Result.categories.total_discovered,
        subcategories_discovered: phase3Result.subcategories.total_discovered,
        conversations_categorized: phase3Result.categories.total_conversations_assigned,
      },
    };
  },
});
