import { adk, Workflow, z } from "@botpress/runtime";
import { ConversationFeaturesTable } from "../tables/conversation-features";
import { ClusteringResultsTable } from "../tables/clustering-results";
import { InsightsConfigsTable } from "../tables/insights-configs";
import { fetchLastNMessages } from "../utils/conversations/fetching";
import { generateTranscript } from "../utils/transcript";

// Clustering service URL (Python FastAPI service)
const CLUSTERING_SERVICE_URL = process.env.CLUSTERING_SERVICE_URL || "https://248db72d3b4f.ngrok.app";

// Type definitions for clustering service response
interface ClusteringResult {
  high_level_clusters: Record<string, string[]>;
  subclusters: Record<string, Record<string, string[]>>;
  similarity_matrix: number[][];
  cluster_stats: {
    total_conversations: number;
    total_clusters: number;
    avg_cluster_size: number;
  };
}

/**
 * Phase 3: Clustering
 *
 * Takes extracted features from phase2 and performs weighted clustering
 * based on semantic embeddings, encoded attributes, and outcomes.
 *
 * Weighting strategy for usage patterns:
 * - Semantic (65%): intent + specific_features + topics (already embedded)
 * - Attributes (25%): user-defined categorical/numerical attributes
 * - Outcome (10%): conversation outcome (satisfied/unsatisfied/unclear)
 */

// Hardcoded weights for usage pattern analysis
const EMBEDDING_WEIGHTS = {
  semantic: 0.65,    // intent + specific_features + topics
  attributes: 0.25,  // user-defined attributes
  outcome: 0.10      // conversation outcome
};

export const ClusterConversations = new Workflow({
  name: "cluster_conversations",
  description: "Cluster conversations using weighted feature vectors",
  timeout: "30m",
  input: z.object({
    configId: z.string().describe("Config ID to cluster conversations for"),
    numHighLevelClusters: z.number().optional().default(5).describe("Number of high-level clusters"),
    numSubclustersPerCluster: z.number().optional().default(3).describe("Number of subclusters per high-level cluster"),
    maxMessagesForLabeling: z.number().optional().default(50).describe("Max messages to fetch per conversation for labeling"),
  }),
  output: z.object({
    total_conversations: z.number(),
    total_clusters: z.number(),
    clustering_id: z.string().describe("ID of saved clustering result"),
  }),
  handler: async ({ input, step }) => {
    // Step 1: Load all conversation features for this config from the table
    const features = await step("load-features", async () => {
      const { rows } = await ConversationFeaturesTable.findRows({
        filter: { config_id: input.configId },
        limit: 1000, // Adjust as needed
      });

      if (rows.length === 0) {
        throw new Error(`No conversation features found for config ${input.configId}`);
      }

      return rows;
    });

    // Step 2: Call Python clustering service
    const clusteringResult = await step("call-clustering-service", async (): Promise<ClusteringResult> => {
      // Prepare payload for clustering service
      const conversations = features.map((feature) => ({
        id: feature.key,
        semantic_embedding: feature.embedding,
        attributes: feature.attributes,
        outcome: feature.conversation_outcome,
      }));

      const payload = {
        conversations,
        weights: EMBEDDING_WEIGHTS,
        clustering_params: {
          num_high_level_clusters: input.numHighLevelClusters,
          num_subclusters_per_cluster: input.numSubclustersPerCluster,
        },
      };

      // Call Python clustering service
      const response = await fetch(`${CLUSTERING_SERVICE_URL}/cluster`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Clustering service failed: ${error}`);
      }

      return await response.json() as ClusteringResult;
    });

    // Step 3: Load config for labeling context
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

    // Step 4: Label clusters using LLM
    const taxonomy = await step.map(
      "label-clusters",
      Object.keys(clusteringResult.high_level_clusters),
      async (clusterId) => {
        const conversationIds = clusteringResult.high_level_clusters[clusterId];

        // Sample representatives (max 10 for high-level, 5 for subclusters)
        const sampleSize = Math.min(10, conversationIds.length);
        const sampleIndices = Array.from({ length: sampleSize }, (_, i) =>
          Math.floor((i * conversationIds.length) / sampleSize)
        );
        const representativeIds = sampleIndices.map(i => conversationIds[i]);

        // Get representative conversations
        const representatives = features.filter(f => representativeIds.includes(f.key));

        // Fetch messages and generate transcripts for representative conversations
        const transcripts = await Promise.all(
          representatives.map(async (conv, idx) => {
            const messages = await fetchLastNMessages(conv.key, input.maxMessagesForLabeling);
            const transcript = generateTranscript(messages);
            return `Conversation ${idx + 1} (${conv.key}):\n${transcript}\n\nIntent: ${conv.primary_user_intent}\nOutcome: ${conv.conversation_outcome}`;
          })
        );

        const formattedConvs = transcripts.join("\n\n---\n\n");

        // Generate cluster label
        const categorySchema = z.object({
          name: z.string().describe("Concise category name (2-4 words)"),
          description: z.string().describe("Description of what these conversations have in common"),
        });

        const category = await adk.zai.with({ modelId: "best" }).extract(
          `You are analyzing a cluster of similar agent conversations.

Domain: ${config.agent_description}
Analysis Goal: ${config.clustering_focus}

Here are representative conversations from this cluster:
${formattedConvs}

Generate a category for this cluster.`,
          categorySchema
        );

        // Label subclusters
        const subclusterIds = Object.keys(clusteringResult.subclusters[clusterId] || {});
        const subcategories = [];

        for (const subclusterId of subclusterIds) {
          const subConvIds = clusteringResult.subclusters[clusterId][subclusterId];
          const subSampleSize = Math.min(5, subConvIds.length);
          const subSampleIndices = Array.from({ length: subSampleSize }, (_, i) =>
            Math.floor((i * subConvIds.length) / subSampleSize)
          );
          const subRepIds = subSampleIndices.map(i => subConvIds[i]);
          const subReps = features.filter(f => subRepIds.includes(f.key));

          // Fetch messages and generate transcripts for subcluster representatives
          const subTranscripts = await Promise.all(
            subReps.map(async (conv, idx) => {
              const messages = await fetchLastNMessages(conv.key, input.maxMessagesForLabeling);
              const transcript = generateTranscript(messages);
              return `Conversation ${idx + 1} (${conv.key}):\n${transcript}\n\nIntent: ${conv.primary_user_intent}`;
            })
          );

          const subFormatted = subTranscripts.join("\n\n---\n\n");

          const subcategorySchema = z.object({
            name: z.string().describe("Specific subcategory name"),
            description: z.string().describe("What distinguishes this subgroup"),
          });

          const subcategory = await adk.zai.with({ modelId: "best" }).extract(
            `This is a subset of conversations within the "${category.name}" category.

Conversations:
${subFormatted}

Generate a more specific subcategory name and description.`,
            subcategorySchema
          );

          subcategories.push(subcategory);
        }

        return {
          clusterId,
          taxonomy: {
            category,
            subcategories,
            member_count: conversationIds.length,
          },
        };
      }
    );

    // Build taxonomy object
    const taxonomyObject = taxonomy.reduce((acc, { clusterId, taxonomy: tax }) => {
      acc[clusterId] = tax;
      return acc;
    }, {} as Record<string, any>);

    // Step 5: Save clustering results with labels
    const clusteringId = await step("save-results", async () => {
      const id = `clustering_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const createdAt = new Date().toISOString();

      await ClusteringResultsTable.upsertRows({
        rows: [
          {
            key: id,
            config_id: input.configId,
            high_level_clusters: clusteringResult.high_level_clusters,
            subclusters: clusteringResult.subclusters,
            taxonomy: taxonomyObject,
            cluster_stats: clusteringResult.cluster_stats,
            created_at: createdAt,
          },
        ],
        keyColumn: "key",
      });

      return id;
    });

    return {
      total_conversations: features.length,
      total_clusters: clusteringResult.cluster_stats.total_clusters,
      clustering_id: clusteringId,
    };
  },
});
