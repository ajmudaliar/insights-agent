"""
Clustering module for hierarchical clustering of conversations.
"""
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.spatial.distance import squareform
from typing import Dict, List, Tuple
from encoding import encode_outcome, encode_attributes, create_weighted_vectors


def perform_clustering(
    conversations: List[Dict],
    weights: Dict[str, float],
    num_high_level_clusters: int = 5,
    num_subclusters_per_cluster: int = 3
) -> Tuple[Dict[str, List[str]], Dict[str, Dict[str, List[str]]], np.ndarray]:
    """
    Perform hierarchical clustering on conversations.

    Args:
        conversations: List of conversation dicts with 'id', 'embedding', 'attributes', 'outcome'
        weights: Dict with 'semantic', 'attributes', 'outcome' weights
        num_high_level_clusters: Number of top-level clusters
        num_subclusters_per_cluster: Number of subclusters per high-level cluster

    Returns:
        Tuple of (high_level_clusters, subclusters, similarity_matrix)
        - high_level_clusters: {cluster_id: [conversation_ids]}
        - subclusters: {cluster_id: {subcluster_id: [conversation_ids]}}
        - similarity_matrix: Cosine similarity matrix
    """
    if len(conversations) < 2:
        raise ValueError("Need at least 2 conversations to cluster")

    # Step 1: Extract components
    conversation_ids = [conv['id'] for conv in conversations]
    semantic_embeddings = np.array([conv['semantic_embedding'] for conv in conversations])

    # Step 2: Encode attributes and outcomes
    outcomes = np.array([[encode_outcome(conv['outcome'])] for conv in conversations])
    encoded_attrs, attr_names = encode_attributes(conversations)

    # Step 3: Create weighted vectors
    weighted_vectors = create_weighted_vectors(
        semantic_embeddings,
        encoded_attrs,
        outcomes,
        weights
    )

    # Step 4: Compute similarity matrix
    similarity_matrix = cosine_similarity(weighted_vectors)

    # Step 5: Convert to distance and perform hierarchical clustering
    distance_matrix = 1 - similarity_matrix
    condensed_distance = squareform(distance_matrix, checks=False)
    linkage_matrix = linkage(condensed_distance, method='ward')

    # Step 6: Create high-level clusters
    n_high_level = min(num_high_level_clusters, len(conversations) - 1)
    high_level_labels = fcluster(linkage_matrix, n_high_level, criterion='maxclust')

    # Build high-level clusters dict
    high_level_clusters = {}
    for cluster_id in np.unique(high_level_labels):
        cluster_indices = np.where(high_level_labels == cluster_id)[0]
        high_level_clusters[str(cluster_id)] = [conversation_ids[i] for i in cluster_indices]

    # Step 7: Create subclusters for each high-level cluster
    subclusters = {}
    for cluster_id in np.unique(high_level_labels):
        cluster_mask = high_level_labels == cluster_id
        cluster_indices = np.where(cluster_mask)[0]

        # Need at least 2 conversations to subcluster
        if len(cluster_indices) < 2:
            subclusters[str(cluster_id)] = {
                "0": [conversation_ids[i] for i in cluster_indices]
            }
            continue

        # Extract submatrix of distances for this cluster
        cluster_distance_matrix = distance_matrix[np.ix_(cluster_indices, cluster_indices)]
        cluster_condensed = squareform(cluster_distance_matrix, checks=False)

        # Perform hierarchical clustering on this subset
        cluster_linkage = linkage(cluster_condensed, method='ward')

        # Determine number of subclusters
        n_subclusters = min(num_subclusters_per_cluster, len(cluster_indices) - 1)
        subcluster_labels = fcluster(cluster_linkage, n_subclusters, criterion='maxclust')

        # Store subclusters
        cluster_subclusters = {}
        for sub_id in np.unique(subcluster_labels):
            sub_mask = subcluster_labels == sub_id
            original_indices = cluster_indices[sub_mask]
            cluster_subclusters[str(sub_id)] = [conversation_ids[i] for i in original_indices]

        subclusters[str(cluster_id)] = cluster_subclusters

    return high_level_clusters, subclusters, similarity_matrix.tolist()
