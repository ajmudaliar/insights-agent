/**
 * Type definitions for Insights Agent data structures
 * Updated for new table schema with hierarchical categorization
 */

// Phase 0: Insights Config
export type InsightsConfig = {
  id: number;
  key: string; // This is the configId (e.g., "cfg_1763068133453_kf7c7")
  agent_description: string;
  analytical_question: string;
  summary_prompt: string;
  extract_features: string[];
  attributes: Array<{
    name: string;
    type: string;
    description: string;
    filter_by?: boolean;
  }>;
  clustering_focus: string;
  created_at: string;
  createdAt: string;
  updatedAt: string;
};

// Category from CategoriesTable
export type Category = {
  id: number;
  key: string; // ${configId}_cat_${index}
  config_id: string;
  name: string;
  summary: string;
  representative_indices: number[];
  conversation_count: number;
  frequency_pct: number;
  createdAt: string;
  updatedAt: string;
};

// Subcategory from SubcategoriesTable
export type Subcategory = {
  id: number;
  key: string; // ${configId}_cat_${catIdx}_sub_${subIdx}
  config_id: string;
  category_id: string;
  name: string;
  summary: string;
  representative_indices: number[];
  conversation_count: number;
  frequency_pct: number;
  createdAt: string;
  updatedAt: string;
};

// Conversation assignment from ConversationCategoriesTable
export type ConversationCategory = {
  id: number;
  key: string; // ${configId}_${conversationId}
  config_id: string;
  conversation_id: string;
  // Category-level assignment
  category_id: string;
  category_index: number;
  category_confidence: number;
  category_reasoning: string;
  // Subcategory-level assignment (optional)
  subcategory_id?: string;
  subcategory_index?: number;
  subcategory_confidence?: number;
  subcategory_reasoning?: string;
  createdAt: string;
  updatedAt: string;
};

// Conversation features from ConversationFeaturesTable
export type ConversationFeatures = {
  id: number;
  key: string; // conversationId
  config_id: string;
  primary_user_intent: string;
  specific_features: Record<string, string[]>;
  conversation_outcome: "satisfied" | "unsatisfied" | "unclear";
  key_topics: string[];
  attributes: Record<string, any>;
  semantic_string: string;
  transcript: string;
  createdAt: string;
  updatedAt: string;
};

// Composed type for category with nested subcategories
export type CategoryWithSubcategories = {
  category: Category;
  subcategories: Subcategory[];
};

// Composed type for full conversation data (assignment + features)
export type ConversationWithCategoryAndFeatures = {
  assignment: ConversationCategory;
  features: ConversationFeatures;
};

// Stats type for overview displays
export type TopologyStats = {
  total_categories: number;
  total_subcategories: number;
  total_conversations: number;
  avg_category_confidence: number;
  avg_subcategory_confidence: number;
  conversations_by_outcome: {
    satisfied: number;
    unsatisfied: number;
    unclear: number;
  };
};

// Conversation and Message types (from target bot)
export type Conversation = {
  id: string;
  currentTaskId?: string;
  currentWorkflowId?: string;
  createdAt: string;
  updatedAt: string;
  channel: string;
  integration: string;
  tags: {
    [k: string]: string;
  };
};

export type Message = {
  id: string;
  content?: string;
  payload?: { [k: string]: any };
  createdAt: string;
  updatedAt?: string;
  type?: string;
  direction?: "incoming" | "outgoing";
  userId?: string;
  author?: {
    id: string;
    type?: "admin" | "user" | "bot";
    name?: string;
    email?: string;
  };
};

export type ConversationWithMessages = {
  conversation: Conversation;
  messages: Message[];
};
