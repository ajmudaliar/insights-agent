# Clustering Service

Python FastAPI service for clustering conversations using hierarchical clustering and weighted feature vectors.

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the service:
```bash
python main.py
```

The service will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

### `GET /`
Health check

### `POST /cluster`
Cluster conversations using weighted feature vectors.

**Request:**
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "semantic_embedding": [0.1, 0.2, ...],
      "attributes": {"user_type": "premium"},
      "outcome": "satisfied"
    }
  ],
  "weights": {
    "semantic": 0.65,
    "attributes": 0.25,
    "outcome": 0.10
  },
  "clustering_params": {
    "min_clusters": 5,
    "max_clusters": 8,
    "method": "ward"
  }
}
```

**Response:**
```json
{
  "high_level_clusters": {
    "0": ["conv_123", "conv_456"]
  },
  "subclusters": {
    "0": {
      "0": ["conv_123"],
      "1": ["conv_456"]
    }
  },
  "similarity_matrix": [[1.0, 0.8], [0.8, 1.0]],
  "cluster_stats": {
    "total_conversations": 100,
    "total_clusters": 6,
    "avg_cluster_size": 16.7
  }
}
```
