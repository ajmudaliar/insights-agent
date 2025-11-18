import { Table, z } from "@botpress/runtime";

/**
 * Stores clustering results from phase3.
 * Maps conversations to their cluster and subcluster assignments with LLM-generated labels.
 */
export const ClusteringResultsTable = new Table({
  name: "ClusteringResultsTable",
  description: "Clustering results and taxonomy with labels",
  columns: {
    key: z.string().describe("Unique identifier for this clustering run"),
    config_id: z.string().describe("Config ID used for clustering"),
    high_level_clusters: z.record(z.array(z.string())).describe("Map of cluster_id -> conversation_ids"),
    subclusters: z.record(z.record(z.array(z.string()))).describe("Map of cluster_id -> subcluster_id -> conversation_ids"),
    taxonomy: z.record(z.object({
      category: z.object({
        name: z.string(),
        description: z.string(),
      }),
      subcategories: z.array(z.object({
        name: z.string(),
        description: z.string(),
      })),
      member_count: z.number(),
    })).describe("LLM-generated labels and descriptions for clusters"),
    cluster_stats: z.object({
      total_conversations: z.number(),
      total_clusters: z.number(),
      avg_cluster_size: z.number(),
    }).describe("Summary statistics"),
    similarity_matrix: z.array(z.array(z.number())).describe("Pairwise similarity matrix between conversations"),
    created_at: z.string().describe("ISO timestamp when clustering was performed"),
  },
  factor: 10,
});
