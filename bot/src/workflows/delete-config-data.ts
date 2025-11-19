import { Workflow, z } from "@botpress/runtime";
import { InsightsConfigsTable } from "../tables/insights-configs";
import { ConversationFeaturesTable } from "../tables/conversation-features";
import { CategoriesTable } from "../tables/categories";
import { SubcategoriesTable } from "../tables/subcategories";
import { ConversationCategoriesTable } from "../tables/conversation-categories";

/**
 * Delete Config Data Workflow
 *
 * Deletes all data associated with a specific configId across all tables.
 * This includes:
 * - Conversation features
 * - Categories and subcategories
 * - Conversation-to-category mappings
 * - The config itself
 *
 * Use this to clean up after testing or to reset an analysis.
 */
export const DeleteConfigData = new Workflow({
  name: "delete_config_data",
  description: "Delete all data associated with a specific configId",
  timeout: "30m",
  input: z.object({
    configId: z.string().describe("Config ID to delete all data for"),
    deleteConfig: z
      .boolean()
      .default(false)
      .describe("Whether to also delete the config itself (default: false, only deletes derived data)"),
  }),
  output: z.object({
    configId: z.string(),
    deleted: z.object({
      conversation_features: z.number(),
      categories: z.number(),
      subcategories: z.number(),
      conversation_categories: z.number(),
      config: z.boolean(),
    }),
    errors: z.array(z.string()).optional(),
  }),
  handler: async ({ input, step }) => {
    const deletionResults = {
      conversation_features: 0,
      categories: 0,
      subcategories: 0,
      conversation_categories: 0,
      config: false,
    };
    const errors: string[] = [];

    // Step 1: Verify config exists
    await step("verify-config-exists", async () => {
      const { rows } = await InsightsConfigsTable.findRows({
        filter: { key: input.configId },
        limit: 1,
      });

      if (rows.length === 0) {
        throw new Error(`Config not found: ${input.configId}`);
      }

      return rows[0];
    });

    // Step 2: Delete conversation-to-category mappings
    await step("delete-conversation-categories", async () => {
      try {
        const result = await ConversationCategoriesTable.deleteRows({
          config_id: input.configId,
        });
        deletionResults.conversation_categories = result.deletedRows;
      } catch (error) {
        errors.push(`Error deleting conversation categories: ${error}`);
      }
    });

    // Step 3: Delete subcategories
    await step("delete-subcategories", async () => {
      try {
        const result = await SubcategoriesTable.deleteRows({
          config_id: input.configId,
        });
        deletionResults.subcategories = result.deletedRows;
      } catch (error) {
        errors.push(`Error deleting subcategories: ${error}`);
      }
    });

    // Step 4: Delete categories
    await step("delete-categories", async () => {
      try {
        const result = await CategoriesTable.deleteRows({
          config_id: input.configId,
        });
        deletionResults.categories = result.deletedRows;
      } catch (error) {
        errors.push(`Error deleting categories: ${error}`);
      }
    });

    // Step 5: Delete conversation features
    await step("delete-conversation-features", async () => {
      try {
        const result = await ConversationFeaturesTable.deleteRows({
          config_id: input.configId,
        });
        deletionResults.conversation_features = result.deletedRows;
      } catch (error) {
        errors.push(`Error deleting conversation features: ${error}`);
      }
    });

    // Step 6: Optionally delete the config itself
    if (input.deleteConfig) {
      await step("delete-config", async () => {
        try {
          const result = await InsightsConfigsTable.deleteRows({
            key: input.configId,
          });
          deletionResults.config = result.deletedRows > 0;
        } catch (error) {
          errors.push(`Error deleting config: ${error}`);
        }
      });
    }

    return {
      configId: input.configId,
      deleted: deletionResults,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
