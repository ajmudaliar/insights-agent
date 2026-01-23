import { Workflow, z } from "@botpress/runtime";
import { SampleStratified } from "./phase1-sample-stratified";
import { SampleDateRange } from "./phase1-sample-date-range";
import { ExtractSemanticFeatures as ExtractSemanticFeaturesWorkflow } from "./phase2-extract-semantic-features";
import { DiscoverAndAssignTopology as DiscoverAndAssignTopologyWorkflow } from "./phase3-discover-and-assign-topology";
import { InsightsConfigsTable } from "../tables/insights-configs";

/**
 * Master Workflow: Orchestrates Complete Insights Pipeline
 *
 * Reads workflow params from config (generated in Phase 0) but allows overrides.
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
  }),
  output: z.object({
    configId: z.string(),
    sampling: z.object({
      mode: z.enum(["stratified", "date_range"]),
      total_fetched: z.number(),
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

    // Use params from config
    const params = {
      samplingMode: config.sampling_mode,
      sampleSize: config.sample_size ?? 100,
      oversampleMultiplier: config.oversample_multiplier ?? 5,
      startDate: config.start_date,
      endDate: config.end_date,
      maxNumberOfMessages: config.max_messages_per_conversation,
      maxTopLevelCategories: config.max_top_level_categories,
      minCategorySize: config.min_category_size,
      maxSubcategoriesPerCategory: config.max_subcategories_per_category,
    };

    // Phase 1: Sample conversations
    let conversationIds: string[];
    let samplingStats: {
      mode: "stratified" | "date_range";
      total_fetched: number;
      skipped_failed: number;
      total_sampled: number;
    };

    if (params.samplingMode === "date_range") {
      if (!params.startDate || !params.endDate) {
        throw new Error("date_range mode requires startDate and endDate (from config or input)");
      }

      const phase1Id = await step("sample-date-range", async () => {
        const { id } = await SampleDateRange.getOrCreate({
          input: {
            startDate: params.startDate!,
            endDate: params.endDate!,
            maxMessagesPerConversation: params.maxNumberOfMessages,
          },
        });
        return id;
      });

      const { output: result } = await step.waitForWorkflow("sample_date_range", phase1Id);
      conversationIds = result.conversationIds;
      samplingStats = {
        mode: "date_range",
        total_fetched: result.stats.total_fetched,
        skipped_failed: result.stats.skipped_failed,
        total_sampled: result.stats.total_sampled,
      };
    } else {
      const phase1Id = await step("sample-stratified", async () => {
        const { id } = await SampleStratified.getOrCreate({
          input: {
            maxConversations: params.sampleSize,
            oversampleMultiplier: params.oversampleMultiplier,
            maxMessagesPerConversation: params.maxNumberOfMessages,
          },
        });
        return id;
      });

      const { output: result } = await step.waitForWorkflow("sample_stratified", phase1Id);
      conversationIds = result.conversationIds;
      samplingStats = {
        mode: "stratified",
        total_fetched: result.stats.total_fetched,
        skipped_failed: result.stats.skipped_failed,
        total_sampled: result.stats.total_sampled,
      };
    }

    // Phase 2: Extract semantic features
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
          maxTopLevelCategories: params.maxTopLevelCategories,
          minCategorySize: params.minCategorySize,
          maxSubcategoriesPerCategory: params.maxSubcategoriesPerCategory,
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
