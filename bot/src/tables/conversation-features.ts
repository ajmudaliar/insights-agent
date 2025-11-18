import { Table, z } from "@botpress/runtime";

/**
 * Stores extracted features and embeddings for each conversation.
 * Used for clustering and usage pattern analysis.
 */
export const ConversationFeaturesTable = new Table({
  name: "ConversationFeaturesTable",
  description: "Extracted semantic features for conversations",
  columns: {
    key: z.string().describe("Conversation ID"),
    config_id: z.string().describe("ID of the config used for extraction"),
    primary_user_intent: z.string().describe("Primary intent extracted from conversation"),
    specific_features: z.record(z.array(z.string())).describe("Specific features extracted (e.g., product_mentions, feature_references)"),
    conversation_outcome: z.enum(["satisfied", "unsatisfied", "unclear"]).describe("Overall conversation outcome"),
    key_topics: z.array(z.string()).describe("Key topics discussed"),
    attributes: z.record(z.any()).describe("User-defined attributes extracted"),
    semantic_string: z.string().describe("Structured representation of conversation features for LLM-based categorization"),
    transcript: z.string().describe("Full conversation transcript"),
  },
  factor: 20,
});
