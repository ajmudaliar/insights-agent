/**
 * Type definitions for Insights Agent data structures
 */

// Phase 1: Insights Config
export type InsightsConfig = {
  id: number;
  key: string; // This is the configId (e.g., "cfg_1763068133453_kf7c7")
  agent_description: string;
  analytical_question: string;
  trace_structure: string;
  created_at: string;
  createdAt: string;
  updatedAt: string;
  // Generated config fields
  analysis_mode?: string;
  summary_prompt?: string;
  attributes?: Array<{
    name: string;
    type: string;
    description: string;
    filter_by?: boolean;
  }>;
  feature_weights?: Record<string, number>;
  clustering_focus?: string;
  computed?: Record<string, unknown>;
  stale?: unknown[];
};

// Phase 2: Conversation Summary (matches ConversationSummariesTable schema)
export type ConversationSummary = {
  id: number;
  key: string; // Composite key: configId_conversationId
  configId: string;
  conversationId: string;
  summary: string;
  extracted_attributes: Record<string, any>;
  behavioral_metrics: {
    turn_count: number;
    bot_message_count: number;
    user_message_count: number;
  };
  transcript: string;
  conversation_created_at: string;
  conversation_updated_at: string;
  analyzed_at: string;
  createdAt: string;
  updatedAt: string;
};

// Phase 3: Category
export type Category = {
  id: string;
  key: string;
  configId: string;
  categoryIndex: number;
  name: string;
  description: string;
  category_type?: string;
  conversation_count: number;
  frequency_pct?: number;
  created_at: string;
  // Mapped fields for convenience
  conversationCount: number;
  percentage?: number;
};

// Phase 3: Subcategory
export type Subcategory = {
  id: string;
  key: string;
  categoryId: string;
  configId: string;
  categoryIndex: number;
  subcategoryIndex: number;
  name: string;
  description: string;
  category_type?: string;
  conversation_count: number;
  frequency_pct?: number;
  created_at: string;
  // Mapped fields for convenience
  conversationCount: number;
  percentage?: number;
};

// Phase 3: Conversation Category Assignment (matches ConversationCategoriesTable schema)
export type ConversationCategoryAssignment = {
  id: number;
  key: string; // Composite key: configId_conversationId
  configId: string;
  conversationId: string;
  summaryId: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  confidence?: number;
  reasoning?: string;
  categorized_at: string;
  createdAt: string;
  updatedAt: string;
};

// Legacy type alias for backward compatibility
export type ConversationCategory = ConversationCategoryAssignment;

// Merged type for displaying conversation details with categorization
export type ConversationWithCategory = ConversationSummary & {
  categoryAssignment?: ConversationCategoryAssignment;
};

// Phase 4: Insights Report (matches InsightsReportsTable schema)
export type InsightsReport = {
  id: number;
  key: string;
  configId: string;
  executive_summary: string;
  total_conversations: number;
  categories_count: number;
  subcategories_count: number;
  category_insights: CategoryInsight[];
  key_patterns: string[];
  recommendations: string[];
  metadata: {
    analysis_mode: string;
    analytical_question: string;
    generation_duration_ms: number;
  };
  generated_at: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInsight = {
  categoryId: string;
  categoryName: string;
  narrative: string;
  key_findings: string[];
  avg_turn_count: number;
  top_attributes: Record<string, any>;
};

// Workflow status tracking
export type WorkflowPhase = "config" | "summaries" | "categories" | "report";

export type PhaseStatus = "pending" | "running" | "completed" | "failed";

export type InsightProgress = {
  configId: string; // This is the key value (e.g., "cfg_123...")
  config: InsightsConfig;
  phases: {
    config: PhaseStatus;
    summaries: PhaseStatus;
    categories: PhaseStatus;
    report: PhaseStatus;
  };
  summaryCount?: number;
  categoryCount?: number;
  reportId?: string;
  error?: string;
};

// Form inputs for creating new insights
export type CreateInsightInput = {
  // Phase 1 inputs
  agent_description: string;
  analytical_question: string;
  trace_structure: string;
  // Phase 2 params
  maxConversations: number;
  maxMessagesPerConversation: number;
  // Phase 3 params
  minCategorySize: number;
  maxTopLevelCategories: number;
  maxSubcategoriesPerCategory: number;
};

// Workflow outputs
export type Step1Output = {
  configId: string;
};

export type Step2Output = {
  summaryCount: number;
};

export type Step3Output = {
  topLevelCategoryCount: number;
  totalSubcategoryCount: number;
};

export type Step4Output = {
  reportId: string;
};
