from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import numpy as np
from clustering import perform_clustering

app = FastAPI(title="Clustering Service", version="1.0.0")


class Conversation(BaseModel):
    """Individual conversation with features"""
    id: str
    semantic_embedding: List[float] = Field(..., description="1536-dimensional embedding")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="User-defined attributes")
    outcome: str = Field(..., description="satisfied/unsatisfied/unclear")


class ClusterRequest(BaseModel):
    """Request payload for clustering"""
    conversations: List[Conversation]
    weights: Dict[str, float] = Field(
        default={"semantic": 0.65, "attributes": 0.25, "outcome": 0.10},
        description="Feature weights"
    )
    clustering_params: Dict[str, Any] = Field(
        default={
            "num_high_level_clusters": 5,
            "num_subclusters_per_cluster": 3,
        },
        description="Clustering parameters"
    )


class ClusterResponse(BaseModel):
    """Response with clustering results"""
    high_level_clusters: Dict[str, List[str]]
    subclusters: Dict[str, Dict[str, List[str]]]
    similarity_matrix: List[List[float]]
    cluster_stats: Dict[str, Any]


@app.get("/")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "clustering-service"}


@app.post("/cluster", response_model=ClusterResponse)
def cluster_conversations(request: ClusterRequest):
    """
    Cluster conversations using weighted feature vectors.

    Steps:
    1. Encode attributes and outcomes
    2. Create weighted vectors (semantic + attributes + outcome)
    3. Compute cosine similarity matrix
    4. Perform hierarchical clustering
    5. Create 2-level taxonomy
    """
    try:
        if len(request.conversations) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 conversations to cluster")

        # Prepare conversation data
        conv_data = []
        for conv in request.conversations:
            conv_data.append({
                'id': conv.id,
                'semantic_embedding': conv.semantic_embedding,
                'attributes': conv.attributes,
                'outcome': conv.outcome
            })

        # Get clustering parameters
        num_high_level = request.clustering_params.get('num_high_level_clusters', 5)
        num_subclusters = request.clustering_params.get('num_subclusters_per_cluster', 3)

        # Perform clustering
        high_level_clusters, subclusters, similarity_matrix = perform_clustering(
            conversations=conv_data,
            weights=request.weights,
            num_high_level_clusters=num_high_level,
            num_subclusters_per_cluster=num_subclusters
        )

        # Calculate stats
        total_clusters = len(high_level_clusters)
        total_convs = len(request.conversations)
        avg_size = total_convs / total_clusters if total_clusters > 0 else 0

        return ClusterResponse(
            high_level_clusters=high_level_clusters,
            subclusters=subclusters,
            similarity_matrix=similarity_matrix,
            cluster_stats={
                "total_conversations": total_convs,
                "total_clusters": total_clusters,
                "avg_cluster_size": round(avg_size, 2)
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
