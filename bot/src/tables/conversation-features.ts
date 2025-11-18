import { Table, z } from "@botpress/runtime";

/**
 * Stores extracted features and embeddings for each conversation.
 * Used for clustering and usage pattern analysis.
 */
export const ConversationFeaturesTable = new Table({
  name: "ConversationFeaturesTable",
  description: "Extracted semantic features and embeddings for conversations",
  columns: {
    key: z.string().describe("Conversation ID"),
    config_id: z.string().describe("ID of the config used for extraction"),
    primary_user_intent: z.string().describe("Primary intent extracted from conversation"),
    specific_features: z.record(z.array(z.string())).describe("Specific features extracted (e.g., product_mentions, feature_references)"),
    conversation_outcome: z.enum(["satisfied", "unsatisfied", "unclear"]).describe("Overall conversation outcome"),
    key_topics: z.array(z.string()).describe("Key topics discussed"),
    attributes: z.record(z.any()).describe("User-defined attributes extracted"),
    semantic_string: z.string().describe("Semantic string used for embedding generation"),
    embedding: z.array(z.number()).describe("Vector embedding (1536 dimensions) for clustering"),
    created_at: z.string().describe("ISO timestamp when features were extracted"),
  },
  factor: 10,
});
