import { getBotpressClient } from "@/lib/botpress-client";
import { WORKSPACE_ID, BOT_ID } from "@/config";
import type {
  InsightsConfig,
  CreateInsightInput,
  Step1Output,
  Step2Output,
  Step3Output,
  Step4Output,
  InsightProgress,
  Category,
  Subcategory,
  ConversationSummary,
  ConversationCategoryAssignment,
  ConversationWithCategory,
  InsightsReport,
} from "@/types/insights";

const client = getBotpressClient({ workspaceId: WORKSPACE_ID, botId: BOT_ID });

type WorkflowStatus =
  | "pending"
  | "in_progress"
  | "failed"
  | "completed"
  | "listening"
  | "paused"
  | "timedout"
  | "cancelled";

/**
 * Poll a workflow until it reaches a terminal state
 */
async function pollWorkflow(workflowId: string): Promise<{
  status: WorkflowStatus;
  output: unknown;
  failureReason?: string;
}> {
  const maxAttempts = 600; // 10 minutes max (600 * 1 second)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const { workflow } = await client.getWorkflow({ id: workflowId });

    // Terminal states
    if (
      workflow.status === "completed" ||
      workflow.status === "failed" ||
      workflow.status === "cancelled" ||
      workflow.status === "timedout"
    ) {
      return {
        status: workflow.status,
        output: workflow.output,
        failureReason: workflow.failureReason,
      };
    }

    // Still running (pending, in_progress, listening, paused) - wait and retry
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error("Workflow polling timeout after 10 minutes");
}

/**
 * List all insights configs from the database
 */
export async function listConfigs(): Promise<InsightsConfig[]> {
  try {
    const result = await client.findTableRows({
      table: "InsightsConfigsTable",
      limit: 1000,
    });

    return result.rows as unknown as InsightsConfig[];
  } catch (error) {
    console.error("Failed to list configs:", error);
    throw new Error("Failed to fetch insights configs");
  }
}

/**
 * Get a single config by key (configId)
 */
export async function getConfig(configId: string): Promise<InsightsConfig | null> {
  try {
    const result = await client.findTableRows({
      table: "InsightsConfigsTable",
      filter: { key: configId },
      limit: 1,
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as unknown as InsightsConfig;
  } catch (error) {
    console.error("Failed to get config:", error);
    return null;
  }
}

/**
 * Extract category index from key like "cfg_XXX_cat_0"
 */
function extractCategoryIndex(key: string): number {
  const match = key.match(/cat_(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract subcategory index from key like "cfg_XXX_cat_0_sub_1"
 */
function extractSubcategoryIndex(key: string): number {
  const match = key.match(/sub_(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Get all categories for a given config
 */
export async function getCategories(configId: string): Promise<Category[]> {
  try {
    const result = await client.findTableRows({
      table: "CategoriesTable",
      filter: { configId },
      limit: 1000,
    });

    // Map API response to include both snake_case and camelCase fields
    return (result.rows as unknown as Category[]).map((cat) => ({
      ...cat,
      categoryIndex: extractCategoryIndex(cat.key),
      conversationCount: cat.conversation_count,
      percentage: cat.frequency_pct,
    }));
  } catch (error) {
    console.error("Failed to get categories:", error);
    throw new Error("Failed to fetch categories");
  }
}

/**
 * Get all subcategories for a given config
 */
export async function getSubcategories(configId: string): Promise<Subcategory[]> {
  try {
    const result = await client.findTableRows({
      table: "SubcategoriesTable",
      filter: { configId },
      limit: 1000,
    });

    // Map API response to include both snake_case and camelCase fields
    return (result.rows as unknown as Subcategory[]).map((sub) => ({
      ...sub,
      categoryIndex: extractCategoryIndex(sub.key),
      subcategoryIndex: extractSubcategoryIndex(sub.key),
      conversationCount: sub.conversation_count,
      percentage: sub.frequency_pct,
    }));
  } catch (error) {
    console.error("Failed to get subcategories:", error);
    throw new Error("Failed to fetch subcategories");
  }
}

/**
 * Phase 1: Generate config
 */
export async function step1GenerateConfig(input: {
  agent_description: string;
  analytical_question: string;
  trace_structure: string;
}): Promise<Step1Output> {
  try {
    // Trigger the workflow
    const { workflow } = await client.getOrCreateWorkflow({
      name: "step1_generate_config",
      status: "pending",
      tags: { configType: "insights" },
      input,
    });

    // Poll until completion
    const result = await pollWorkflow(workflow.id);

    if (result.status === "failed" || result.status === "timedout" || result.status === "cancelled") {
      const errorMessage = result.failureReason || "Unknown error";
      throw new Error(`Phase 1 failed: ${errorMessage}`);
    }

    return result.output as Step1Output;
  } catch (error) {
    console.error("Phase 1 failed:", error);
    throw error;
  }
}

/**
 * Phase 2: Generate summaries
 */
export async function step2GenerateSummaries(input: {
  configId: string;
  maxConversations: number;
  maxMessagesPerConversation: number;
}): Promise<Step2Output> {
  try {
    const { workflow } = await client.getOrCreateWorkflow({
      name: "step2_generate_summaries",
      status: "pending",
      tags: { configId: input.configId },
      input,
    });

    const result = await pollWorkflow(workflow.id);

    if (result.status === "failed" || result.status === "timedout" || result.status === "cancelled") {
      const errorMessage = result.failureReason || "Unknown error";
      throw new Error(`Phase 2 failed: ${errorMessage}`);
    }

    return result.output as Step2Output;
  } catch (error) {
    console.error("Phase 2 failed:", error);
    throw error;
  }
}

/**
 * Phase 3: Generate categories
 */
export async function step3GenerateCategories(input: {
  configId: string;
  minCategorySize: number;
  maxTopLevelCategories: number;
  maxSubcategoriesPerCategory: number;
}): Promise<Step3Output> {
  try {
    const { workflow } = await client.getOrCreateWorkflow({
      name: "step3_generate_categories",
      status: "pending",
      tags: { configId: input.configId },
      input,
    });

    const result = await pollWorkflow(workflow.id);

    if (result.status === "failed" || result.status === "timedout" || result.status === "cancelled") {
      const errorMessage = result.failureReason || "Unknown error";
      throw new Error(`Phase 3 failed: ${errorMessage}`);
    }

    return result.output as Step3Output;
  } catch (error) {
    console.error("Phase 3 failed:", error);
    throw error;
  }
}

/**
 * Phase 4: Generate report
 */
export async function step4GenerateReport(input: {
  configId: string;
}): Promise<Step4Output> {
  try {
    const { workflow } = await client.getOrCreateWorkflow({
      name: "step4_generate_report",
      status: "pending",
      tags: { configId: input.configId },
      input,
    });

    const result = await pollWorkflow(workflow.id);

    if (result.status === "failed" || result.status === "timedout" || result.status === "cancelled") {
      const errorMessage = result.failureReason || "Unknown error";
      throw new Error(`Phase 4 failed: ${errorMessage}`);
    }

    return result.output as Step4Output;
  } catch (error) {
    console.error("Phase 4 failed:", error);
    throw error;
  }
}

/**
 * Master function: Create insight and run all 4 phases sequentially
 *
 * This function orchestrates the entire pipeline from config creation to final report.
 * It calls each workflow in sequence, polls for completion, and provides progress callbacks.
 *
 * @param input - The complete insight configuration and parameters
 * @param onProgress - Optional callback to track progress through each phase
 * @returns The final insight progress with all phase results
 */
export async function createAndRunInsight(
  input: CreateInsightInput,
  onProgress?: (progress: Partial<InsightProgress>) => void
): Promise<InsightProgress> {
  try {
    // Phase 1: Generate Config
    onProgress?.({
      phases: {
        config: "running",
        summaries: "pending",
        categories: "pending",
        report: "pending",
      },
    });

    const step1Result = await step1GenerateConfig({
      agent_description: input.agent_description,
      analytical_question: input.analytical_question,
      trace_structure: input.trace_structure,
    });

    const configId = step1Result.configId;

    // Fetch the created config
    const config = await getConfig(configId);
    if (!config) {
      throw new Error("Failed to fetch created config");
    }

    onProgress?.({
      configId,
      config,
      phases: {
        config: "completed",
        summaries: "running",
        categories: "pending",
        report: "pending",
      },
    });

    // Phase 2: Generate Summaries
    const step2Result = await step2GenerateSummaries({
      configId,
      maxConversations: input.maxConversations,
      maxMessagesPerConversation: input.maxMessagesPerConversation,
    });

    onProgress?.({
      configId,
      config,
      summaryCount: step2Result.summaryCount,
      phases: {
        config: "completed",
        summaries: "completed",
        categories: "running",
        report: "pending",
      },
    });

    // Phase 3: Generate Categories
    const step3Result = await step3GenerateCategories({
      configId,
      minCategorySize: input.minCategorySize,
      maxTopLevelCategories: input.maxTopLevelCategories,
      maxSubcategoriesPerCategory: input.maxSubcategoriesPerCategory,
    });

    onProgress?.({
      configId,
      config,
      summaryCount: step2Result.summaryCount,
      categoryCount: step3Result.topLevelCategoryCount,
      phases: {
        config: "completed",
        summaries: "completed",
        categories: "completed",
        report: "running",
      },
    });

    // Phase 4: Generate Report
    const step4Result = await step4GenerateReport({ configId });

    const finalProgress: InsightProgress = {
      configId,
      config,
      summaryCount: step2Result.summaryCount,
      categoryCount: step3Result.topLevelCategoryCount,
      reportId: step4Result.reportId,
      phases: {
        config: "completed",
        summaries: "completed",
        categories: "completed",
        report: "completed",
      },
    };

    onProgress?.(finalProgress);

    return finalProgress;
  } catch (error) {
    console.error("Failed to create and run insight:", error);
    throw error;
  }
}

/**
 * Delete an insights config and all associated data
 */
export async function deleteConfig(configId: string): Promise<void> {
  try {
    // Delete in reverse dependency order
    await client.deleteTableRows({
      table: "InsightsReportsTable",
      filter: { configId },
    });

    await client.deleteTableRows({
      table: "ConversationCategoriesTable",
      filter: { configId },
    });

    await client.deleteTableRows({
      table: "SubcategoriesTable",
      filter: { configId },
    });

    await client.deleteTableRows({
      table: "CategoriesTable",
      filter: { configId },
    });

    await client.deleteTableRows({
      table: "ConversationSummariesTable",
      filter: { configId },
    });

    await client.deleteTableRows({
      table: "InsightsConfigsTable",
      filter: { key: configId },
    });
  } catch (error) {
    console.error("Failed to delete config:", error);
    throw new Error("Failed to delete insight config");
  }
}

/**
 * Get all conversation summaries for a given config
 */
export async function getConversationSummaries(
  configId: string
): Promise<ConversationSummary[]> {
  try {
    const result = await client.findTableRows({
      table: "ConversationSummariesTable",
      filter: { configId },
      limit: 1000,
    });

    return result.rows as unknown as ConversationSummary[];
  } catch (error) {
    console.error("Failed to get conversation summaries:", error);
    throw new Error("Failed to fetch conversation summaries");
  }
}

/**
 * Get all conversation category assignments for a given config
 */
export async function getConversationCategoryAssignments(
  configId: string
): Promise<ConversationCategoryAssignment[]> {
  try {
    const result = await client.findTableRows({
      table: "ConversationCategoriesTable",
      filter: { configId },
      limit: 1000,
    });

    return result.rows as unknown as ConversationCategoryAssignment[];
  } catch (error) {
    console.error("Failed to get conversation categories:", error);
    throw new Error("Failed to fetch conversation category assignments");
  }
}

/**
 * Get the insights report for a given config
 */
export async function getInsightsReport(
  configId: string
): Promise<InsightsReport | null> {
  try {
    const result = await client.findTableRows({
      table: "InsightsReportsTable",
      filter: { configId },
      limit: 1,
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as unknown as InsightsReport;
  } catch (error) {
    console.error("Failed to get insights report:", error);
    return null;
  }
}

/**
 * Get conversations for a specific category or subcategory with merged data
 */
export async function getConversationsForCategory(
  configId: string,
  categoryId: string,
  subcategoryId?: string
): Promise<ConversationWithCategory[]> {
  try {
    // Fetch summaries and category assignments in parallel
    const [summaries, assignments] = await Promise.all([
      getConversationSummaries(configId),
      getConversationCategoryAssignments(configId),
    ]);

    // Create a map of conversationId -> category assignment
    const assignmentMap = new Map<string, ConversationCategoryAssignment>();
    assignments.forEach((assignment) => {
      assignmentMap.set(assignment.conversationId, assignment);
    });

    // Filter and merge data
    const conversations: ConversationWithCategory[] = summaries
      .filter((summary) => {
        const assignment = assignmentMap.get(summary.conversationId);
        
        // Skip if no assignment for this conversation
        if (!assignment) return false;
        
        // Check if this conversation belongs to the requested category/subcategory
        const matchesCategory = assignment.categoryId === categoryId;
        const matchesSubcategory = subcategoryId
          ? assignment.subcategoryId === subcategoryId
          : true;
        
        return matchesCategory && matchesSubcategory;
      })
      .map((summary) => ({
        ...summary,
        categoryAssignment: assignmentMap.get(summary.conversationId),
      }));

    // Sort by conversation creation date (most recent first)
    conversations.sort((a, b) => {
      const dateA = new Date(a.conversation_created_at).getTime();
      const dateB = new Date(b.conversation_created_at).getTime();
      return dateB - dateA;
    });

    return conversations;
  } catch (error) {
    console.error("Failed to get conversations for category:", error);
    throw new Error("Failed to fetch conversations for category");
  }
}

/**
 * Get pipeline status for a given config
 * Checks which phases have been completed
 */
export async function getPipelineStatus(configId: string): Promise<{
  analyzedConversations: boolean;
  discoveredPatterns: boolean;
  generatedReport: boolean;
  summariesCount?: number;
  categoriesCount?: number;
}> {
  try {
    const [summariesResult, categoriesResult, reportResult] = await Promise.all([
      client.findTableRows({
        table: "ConversationSummariesTable",
        filter: { configId },
        limit: 1000,
      }),
      client.findTableRows({
        table: "CategoriesTable",
        filter: { configId },
        limit: 1000,
      }),
      client.findTableRows({
        table: "InsightsReportsTable",
        filter: { configId },
        limit: 1,
      }),
    ]);

    return {
      analyzedConversations: summariesResult.rows.length > 0,
      discoveredPatterns: categoriesResult.rows.length > 0,
      generatedReport: reportResult.rows.length > 0,
      summariesCount: summariesResult.rows.length,
      categoriesCount: categoriesResult.rows.length,
    };
  } catch (error) {
    console.error("Failed to get pipeline status:", error);
    return {
      analyzedConversations: false,
      discoveredPatterns: false,
      generatedReport: false,
    };
  }
}
