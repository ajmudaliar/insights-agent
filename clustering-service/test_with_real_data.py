"""
Test encoding with real data from data.txt
"""
import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.spatial.distance import squareform
from encoding import encode_outcome, encode_attributes, create_weighted_vectors


def load_real_data(filepath='data.txt'):
    """Load conversation data from data.txt (newline-delimited JSON)"""
    conversations = []
    with open(filepath, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                conversations.append(obj)
            except json.JSONDecodeError as e:
                print(f"Error parsing line {line_num}: {e}")
                continue

    return conversations


def test_real_data():
    print("=== Loading Real Data ===")
    conversations = load_real_data()
    print(f"Loaded {len(conversations)} conversations")

    print("\n=== Sample Conversation Structure ===")
    sample = conversations[0]
    print(f"ID: {sample['key']}")
    print(f"Primary Intent: {sample['primary_user_intent']}")
    print(f"Outcome: {sample['conversation_outcome']}")
    print(f"Attributes: {sample['attributes']}")
    print(f"Embedding shape: {len(sample['embedding'])} dimensions")

    print("\n=== Step 1: Encode Outcomes ===")
    outcomes = np.array([[encode_outcome(conv['conversation_outcome'])] for conv in conversations])
    print(f"Outcome encodings shape: {outcomes.shape}")
    print(f"Sample outcomes: {outcomes[:5].flatten()}")

    print("\n=== Step 2: Encode Attributes ===")
    encoded_attrs, attr_names = encode_attributes(conversations)
    print(f"Encoded attributes shape: {encoded_attrs.shape}")
    print(f"Attribute names: {attr_names}")
    print(f"Sample row (first conversation):\n{encoded_attrs[0]}")

    print("\n=== Step 3: Extract Semantic Embeddings ===")
    semantic_embeddings = np.array([conv['embedding'] for conv in conversations])
    print(f"Semantic embeddings shape: {semantic_embeddings.shape}")

    print("\n=== Step 4: Create Weighted Vectors ===")
    weights = {
        'semantic': 0.65,
        'attributes': 0.25,
        'outcome': 0.10
    }

    weighted_vectors = create_weighted_vectors(
        semantic_embeddings,
        encoded_attrs,
        outcomes,
        weights
    )

    print(f"Weighted vectors shape: {weighted_vectors.shape}")
    print(f"Expected shape: ({len(conversations)}, {semantic_embeddings.shape[1]} + {encoded_attrs.shape[1]} + 1)")
    print(f"First weighted vector (first 10 dims): {weighted_vectors[0][:10]}")
    print(f"Vector L2 norm: {np.linalg.norm(weighted_vectors[0])}")

    print("\n=== Step 5: Compute Cosine Similarity Matrix ===")
    similarity_matrix = cosine_similarity(weighted_vectors)
    print(f"Similarity matrix shape: {similarity_matrix.shape}")
    print(f"Diagonal (self-similarity): {np.diag(similarity_matrix)}")
    print(f"Should all be ~1.0 (self-similarity)")

    print(f"\nSimilarity matrix:")
    print(similarity_matrix)

    print(f"\nMin similarity: {np.min(similarity_matrix[np.triu_indices_from(similarity_matrix, k=1)]):.4f}")
    print(f"Max similarity: {np.max(similarity_matrix[np.triu_indices_from(similarity_matrix, k=1)]):.4f}")
    print(f"Mean similarity: {np.mean(similarity_matrix[np.triu_indices_from(similarity_matrix, k=1)]):.4f}")

    print("\n=== Step 6: Hierarchical Clustering ===")

    # Convert similarity to distance
    # Distance = 1 - similarity (for cosine similarity)
    distance_matrix = 1 - similarity_matrix

    # Convert to condensed distance matrix (required by linkage)
    # Only upper triangle, no diagonal
    condensed_distance = squareform(distance_matrix, checks=False)
    print(f"Condensed distance vector length: {len(condensed_distance)}")
    print(f"Expected: {len(conversations) * (len(conversations) - 1) // 2}")

    # Perform hierarchical clustering using Ward's method
    linkage_matrix = linkage(condensed_distance, method='ward')
    print(f"Linkage matrix shape: {linkage_matrix.shape}")
    print(f"Linkage matrix:\n{linkage_matrix}")

    # For our small test set (5 conversations), let's create 2 high-level clusters
    n_high_level = min(3, len(conversations) - 1)  # Can't have more clusters than conversations
    high_level_labels = fcluster(linkage_matrix, n_high_level, criterion='maxclust')
    print(f"\nHigh-level clusters (n={n_high_level}): {high_level_labels}")

    # Show which conversations are in which cluster
    for cluster_id in np.unique(high_level_labels):
        conv_ids = np.where(high_level_labels == cluster_id)[0]
        print(f"Cluster {cluster_id}: Conversations {conv_ids.tolist()}")

    print("\n=== Step 7: Create Subclusters (2-Level Taxonomy) ===")

    subclusters = {}
    for cluster_id in np.unique(high_level_labels):
        # Get conversations in this cluster
        cluster_mask = high_level_labels == cluster_id
        cluster_indices = np.where(cluster_mask)[0]

        print(f"\nProcessing Cluster {cluster_id} with {len(cluster_indices)} conversations")

        # Need at least 2 conversations to subcluster
        if len(cluster_indices) < 2:
            print(f"  → Only 1 conversation, no subclustering needed")
            subclusters[cluster_id] = {0: cluster_indices.tolist()}
            continue

        # Extract submatrix of distances for this cluster
        cluster_distance_matrix = distance_matrix[np.ix_(cluster_indices, cluster_indices)]

        # Convert to condensed form
        cluster_condensed = squareform(cluster_distance_matrix, checks=False)

        # Perform hierarchical clustering on this subset
        cluster_linkage = linkage(cluster_condensed, method='ward')

        # Determine number of subclusters (min 2, max half the size)
        n_subclusters = min(2, len(cluster_indices) - 1)
        subcluster_labels = fcluster(cluster_linkage, n_subclusters, criterion='maxclust')

        print(f"  → Created {n_subclusters} subclusters: {subcluster_labels}")

        # Store subclusters (map subcluster_id -> conversation indices)
        cluster_subclusters = {}
        for sub_id in np.unique(subcluster_labels):
            sub_mask = subcluster_labels == sub_id
            # Get original indices (not relative to cluster)
            original_indices = cluster_indices[sub_mask]
            cluster_subclusters[int(sub_id)] = original_indices.tolist()
            print(f"    Subcluster {sub_id}: Conversations {original_indices.tolist()}")

        subclusters[int(cluster_id)] = cluster_subclusters

    print("\n=== Final Taxonomy ===")
    for cluster_id, cluster_subs in subclusters.items():
        print(f"\nCluster {cluster_id}:")
        for sub_id, conv_indices in cluster_subs.items():
            print(f"  Subcluster {sub_id}: {conv_indices}")

    print("\n=== Summary ===")
    print(f"✓ Loaded {len(conversations)} conversations")
    print(f"✓ Semantic embeddings: {semantic_embeddings.shape}")
    print(f"✓ Encoded attributes: {encoded_attrs.shape} ({len(attr_names)} features)")
    print(f"✓ Outcome encodings: {outcomes.shape}")
    print(f"✓ Final weighted vectors: {weighted_vectors.shape}")
    print(f"✓ Similarity matrix: {similarity_matrix.shape}")
    print(f"\nReady for clustering!")


if __name__ == "__main__":
    test_real_data()
