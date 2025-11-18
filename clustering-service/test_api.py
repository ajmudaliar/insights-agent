"""
Test the /cluster API endpoint with real data
"""
import json
import requests


def load_real_data(filepath='data.txt'):
    """Load conversation data from data.txt"""
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


def test_cluster_api():
    """Test the /cluster endpoint"""
    print("=== Loading Data ===")
    conversations = load_real_data()
    print(f"Loaded {len(conversations)} conversations")

    # Prepare request payload
    payload = {
        "conversations": [
            {
                "id": conv['key'],
                "semantic_embedding": conv['embedding'],
                "attributes": conv['attributes'],
                "outcome": conv['conversation_outcome']
            }
            for conv in conversations
        ],
        "weights": {
            "semantic": 0.65,
            "attributes": 0.25,
            "outcome": 0.10
        },
        "clustering_params": {
            "num_high_level_clusters": 3,
            "num_subclusters_per_cluster": 2
        }
    }

    print(f"\n=== Calling /cluster API ===")
    print(f"Payload size: {len(json.dumps(payload))} bytes")
    print(f"Conversations: {len(payload['conversations'])}")

    response = requests.post(
        "https://248db72d3b4f.ngrok.app/cluster",
        json=payload,
        timeout=60
    )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"\n=== Clustering Results ===")
        print(f"Total conversations: {result['cluster_stats']['total_conversations']}")
        print(f"Total clusters: {result['cluster_stats']['total_clusters']}")
        print(f"Avg cluster size: {result['cluster_stats']['avg_cluster_size']}")

        print(f"\n=== High-Level Clusters ===")
        for cluster_id, conv_ids in result['high_level_clusters'].items():
            print(f"Cluster {cluster_id}: {len(conv_ids)} conversations")

        print(f"\n=== Subclusters ===")
        for cluster_id, subs in result['subclusters'].items():
            print(f"\nCluster {cluster_id}:")
            for sub_id, conv_ids in subs.items():
                print(f"  Subcluster {sub_id}: {len(conv_ids)} conversations")

        print(f"\n=== Similarity Matrix ===")
        sim_matrix = result['similarity_matrix']
        print(f"Shape: {len(sim_matrix)}x{len(sim_matrix[0])}")
        print(f"Sample (first 3x3):")
        for row in sim_matrix[:3]:
            print([f"{val:.3f}" for val in row[:3]])

        print("\n✅ Test completed successfully!")
    else:
        print(f"Error: {response.text}")


if __name__ == "__main__":
    test_cluster_api()
