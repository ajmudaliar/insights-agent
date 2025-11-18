/**
 * Type definitions for Insights Agent data structures
 */

// Phase 1: Insights Config
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

// Clustering Results (matches ClusteringResultsTable schema)
export type ClusteringResult = {
  id: number;
  key: string;
  config_id: string;
  high_level_clusters: Record<string, string[]>; // cluster_id -> conversation_ids
  subclusters: Record<string, Record<string, string[]>>; // cluster_id -> subcluster_id -> conversation_ids
  taxonomy: Record<string, {
    category: {
      name: string;
      description: string;
    };
    subcategories: Array<{
      name: string;
      description: string;
    }>;
    member_count: number;
  }>;
  cluster_stats: {
    total_conversations: number;
    total_clusters: number;
    avg_cluster_size: number;
  };
  created_at: string;
  createdAt: string;
  updatedAt: string;
};

// Topic (high-level cluster) - extracted from ClusteringResult
export type Topic = {
  id: string; // cluster id from taxonomy keys (e.g., "1", "2", "3")
  key: string; // same as id
  configId: string;
  topicIndex: number; // numeric index for ordering
  name: string; // from taxonomy[id].category.name
  description: string; // from taxonomy[id].category.description
  conversationCount: number; // from taxonomy[id].member_count
  percentage: number; // calculated from cluster_stats.total_conversations
  conversationIds: string[]; // from high_level_clusters[id]
  created_at: string;
};

// Subtopic (subcluster) - extracted from ClusteringResult
export type Subtopic = {
  id: string; // combination like "1-1", "1-2", "1-3"
  key: string; // same as id
  topicId: string; // parent cluster id (e.g., "1")
  configId: string;
  topicIndex: number; // parent topic's numeric index
  subtopicIndex: number; // index within subcategories array
  name: string; // from taxonomy[topicId].subcategories[subtopicIndex].name
  description: string; // from taxonomy[topicId].subcategories[subtopicIndex].description
  conversationCount: number; // count of conversations in subclusters[topicId][subclusterId]
  percentage: number; // calculated percentage
  conversationIds: string[]; // from subclusters[topicId][subclusterId]
  created_at: string;
};

// Legacy type aliases for backward compatibility with existing components
export type Category = Topic;
export type Subcategory = Subtopic;

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
