import { Workflow, z } from "@botpress/runtime";
import { DiscoverCategories as DiscoverCategoriesWorkflow } from "./phase3.1-discover-categories";
import { AssignConversationsToCategories as AssignCategoriesToConversationsWorkflow } from "./phase3.2-assign-categories";
import { DiscoverSubcategories as DiscoverSubcategoriesWorkflow } from "./phase3.3-discover-subcategories";
import { AssignConversationsToSubcategories as AssignSubcategoriesToConversationsWorkflow } from "./phase3.4-assign-subcategories";

/**
 * Discover and Assign Topology Workflow
 *
 * Orchestrates LLM-based hierarchical categorization of conversations.
 * Discovers a two-level taxonomy (categories → subcategories) and assigns
 * all conversations to the topology with confidence and reasoning at each level.
 *
 * Runs all 4 sub-phases of Phase 3:
 * - Phase 3.1: Discover top-level categories from semantic strings
 * - Phase 3.2: Assign conversations to categories
 * - Phase 3.3: Discover subcategories within each category
 * - Phase 3.4: Assign conversations to subcategories
 */
export const DiscoverAndAssignTopology = new Workflow({
  name: "discover_and_assign_topology",
  description: "Discover hierarchical taxonomy and assign all conversations to categories and subcategories",
  timeout: "180m",
  input: z.object({
    configId: z.string().describe("Config ID from Phase 0"),
    maxTopLevelCategories: z.number().min(3).max(10).default(5).describe("Maximum number of top-level categories"),
    minCategorySize: z.number().min(3).default(3).describe("Minimum conversations to generate subcategories"),
    maxSubcategoriesPerCategory: z.number().min(2).max(10).default(5).describe("Maximum subcategories per category"),
  }),
  output: z.object({
    configId: z.string(),
    categories: z.object({
      total_discovered: z.number(),
      total_conversations_assigned: z.number(),
      statistics: z.array(
        z.object({
          categoryId: z.string(),
          name: z.string(),
          conversation_count: z.number(),
          frequency_pct: z.number(),
          avg_confidence: z.number(),
        })
      ),
    }),
    subcategories: z.object({
      total_discovered: z.number(),
      total_conversations_assigned: z.number(),
      categories_with_subcategories: z.number(),
    }),
  }),
  handler: async ({ input, step }) => {
    // Phase 3.1: Discover top-level categories
    const phase31Id = await step("discover-categories", async () => {
      const { id } = await DiscoverCategoriesWorkflow.getOrCreate({
        input: {
          configId: input.configId,
          maxTopLevelCategories: input.maxTopLevelCategories,
        },
      });
      return id;
    });

    // Wait for Phase 3.1 to complete and get results
    const { output: phase31Result } = await step.waitForWorkflow("discover_categories", phase31Id);

    // Phase 3.2: Assign conversations to categories
    const phase32Id = await step("assign-to-categories", async () => {
      const { id } = await AssignCategoriesToConversationsWorkflow.getOrCreate({
        input: {
          configId: input.configId,
        },
      });
      return id;
    });

    // Wait for Phase 3.2 to complete and get results
    const { output: phase32Result } = await step.waitForWorkflow("assign_conversations_to_categories", phase32Id);

    // Phase 3.3: Discover subcategories within each category
    const phase33Id = await step("discover-subcategories", async () => {
      const { id } = await DiscoverSubcategoriesWorkflow.getOrCreate({
        input: {
          configId: input.configId,
          minCategorySize: input.minCategorySize,
          maxSubcategoriesPerCategory: input.maxSubcategoriesPerCategory,
        },
      });
      return id;
    });

    // Wait for Phase 3.3 to complete and get results
    const { output: phase33Result } = await step.waitForWorkflow("discover_subcategories", phase33Id);

    // Phase 3.4: Assign conversations to subcategories
    const phase34Id = await step("assign-to-subcategories", async () => {
      const { id } = await AssignSubcategoriesToConversationsWorkflow.getOrCreate({
        input: {
          configId: input.configId,
        },
      });
      return id;
    });

    // Wait for Phase 3.4 to complete and get results
    const { output: phase34Result } = await step.waitForWorkflow("assign_conversations_to_subcategories", phase34Id);

    return {
      configId: input.configId,
      categories: {
        total_discovered: phase31Result.categories.length,
        total_conversations_assigned: phase32Result.total_conversations,
        statistics: phase32Result.category_statistics,
      },
      subcategories: {
        total_discovered: phase33Result.total_subcategories_created,
        total_conversations_assigned: phase34Result.total_conversations_assigned,
        categories_with_subcategories: phase33Result.categories_processed,
      },
    };
  },
});
