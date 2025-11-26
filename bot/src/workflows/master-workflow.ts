import { Workflow, z } from "@botpress/runtime";
import { SampleStratified } from "./phase1-sample-stratified";
import { SampleDateRange } from "./phase1-sample-date-range";
import { ExtractSemanticFeatures as ExtractSemanticFeaturesWorkflow } from "./phase2-extract-semantic-features";
import { DiscoverAndAssignTopology as DiscoverAndAssignTopologyWorkflow } from "./phase3-discover-and-assign-topology";
import { InsightsConfigsTable } from "../tables/insights-configs";

/**
 * Master Workflow: Orchestrates Complete Insights Pipeline
 *
 * Phase 1: Sample conversations (stratified or date range)
 * Phase 2: Extract semantic features from conversations
 * Phase 3: Discover hierarchical topology and assign conversations
 */
export const MasterWorkflow = new Workflow({
  name: "master_workflow",
  description: "Orchestrates complete insights pipeline: sampling, feature extraction, and hierarchical categorization",
  timeout: "240m",
  input: z.object({
    configId: z.string().describe("Config ID from Phase 0"),

    // Sampling mode
    samplingMode: z
      .enum(["stratified", "date_range"])
      .default("stratified")
      .describe("How to select conversations"),

    // Stratified mode options
    sampleSize: z.number().min(1).max(500).default(100).describe("[stratified] Number of conversations to sample"),
    oversampleMultiplier: z.number().min(1).max(10).default(5).describe("[stratified] Multiplier for oversampling"),

    // Date range mode options
    startDate: z.string().optional().describe("[date_range] Start date (ISO string, inclusive)"),
    endDate: z.string().optional().describe("[date_range] End date (ISO string, inclusive)"),

    // Common options
    maxNumberOfMessages: z.number().min(1).max(100).default(50).describe("Maximum messages to fetch per conversation"),
    maxTopLevelCategories: z.number().min(2).max(10).default(5).describe("Maximum number of top-level categories"),
    minCategorySize: z.number().min(3).default(3).describe("Minimum conversations to generate subcategories"),
    maxSubcategoriesPerCategory: z.number().min(0).max(10).default(5).describe("Maximum subcategories per category (0 to skip)"),
  }),
  output: z.object({
    configId: z.string(),
    sampling: z.object({
      mode: z.enum(["stratified", "date_range"]),
      total_fetched: z.number(),
      skipped_empty: z.number(),
      skipped_failed: z.number(),
      total_sampled: z.number(),
    }),
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
    let conversationIds: string[];
    let samplingStats: {
      mode: "stratified" | "date_range";
      total_fetched: number;
      skipped_empty: number;
      skipped_failed: number;
      total_sampled: number;
    };

    if (input.samplingMode === "date_range") {
      if (!input.startDate || !input.endDate) {
        throw new Error("date_range mode requires startDate and endDate");
      }

      const phase1Id = await step("sample-date-range", async () => {
        const { id } = await SampleDateRange.getOrCreate({
          input: {
            startDate: input.startDate!,
            endDate: input.endDate!,
            maxMessagesPerConversation: input.maxNumberOfMessages,
          },
        });
        return id;
      });

      const { output: result } = await step.waitForWorkflow("sample_date_range", phase1Id);
      conversationIds = result.conversationIds;
      samplingStats = {
        mode: "date_range",
        total_fetched: result.stats.total_fetched,
        skipped_empty: result.stats.skipped_empty,
        skipped_failed: result.stats.skipped_failed,
        total_sampled: result.stats.total_sampled,
      };
    } else {
      const phase1Id = await step("sample-stratified", async () => {
        const { id } = await SampleStratified.getOrCreate({
          input: {
            maxConversations: input.sampleSize,
            oversampleMultiplier: input.oversampleMultiplier,
            maxMessagesPerConversation: input.maxNumberOfMessages,
          },
        });
        return id;
      });

      const { output: result } = await step.waitForWorkflow("sample_stratified", phase1Id);
      conversationIds = result.conversationIds;
      samplingStats = {
        mode: "stratified",
        total_fetched: result.stats.total_fetched,
        skipped_empty: result.stats.skipped_empty,
        skipped_failed: result.stats.skipped_failed,
        total_sampled: result.stats.total_sampled,
      };
    }

    // Phase 2: Extract semantic features and generate embeddings
    const phase2Id = await step("extract-semantic-features", async () => {
      const { id } = await ExtractSemanticFeaturesWorkflow.getOrCreate({
        input: {
          configId: input.configId,
          config: config,
          conversationIds: conversationIds,
        },
      });
      return id;
    });

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

    const { output: phase3Result } = await step.waitForWorkflow("discover_and_assign_topology", phase3Id);

    return {
      configId: input.configId,
      sampling: samplingStats,
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
