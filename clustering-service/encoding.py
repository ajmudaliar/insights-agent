"""
Encoding utilities for converting attributes and outcomes to numeric vectors.
"""
import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.preprocessing import StandardScaler


def encode_outcome(outcome: str) -> float:
    """
    Encode conversation outcome as a numeric value.

    Args:
        outcome: "satisfied", "unsatisfied", or "unclear"

    Returns:
        float: 1.0 (satisfied), 0.0 (unsatisfied), 0.5 (unclear)
    """
    outcome_map = {
        "satisfied": 1.0,
        "unsatisfied": 0.0,
        "unclear": 0.5
    }
    return outcome_map.get(outcome.lower(), 0.5)


def encode_attributes(
    conversations: List[Dict[str, Any]]
) -> Tuple[np.ndarray, List[str]]:
    """
    Encode attributes from all conversations into numeric vectors.

    Handles:
    - Categorical: One-hot encoding across all conversations
    - Numerical: Direct use with standardization
    - Boolean: Convert to 0.0/1.0

    Args:
        conversations: List of conversation dicts with 'attributes' field

    Returns:
        Tuple of (encoded_matrix, attribute_names)
        - encoded_matrix: (n_conversations, n_features) numpy array
        - attribute_names: List of feature names for debugging
    """
    if not conversations:
        return np.array([]), []

    # Collect all unique attribute keys across conversations
    all_keys = set()
    for conv in conversations:
        all_keys.update(conv.get('attributes', {}).keys())

    if not all_keys:
        # No attributes, return zero vectors
        return np.zeros((len(conversations), 1)), []

    all_keys = sorted(list(all_keys))

    # Determine attribute types by inspecting first non-None value
    attribute_types = {}
    categorical_values = {}  # Track unique values for categorical attributes

    for key in all_keys:
        for conv in conversations:
            val = conv.get('attributes', {}).get(key)
            if val is not None:
                if isinstance(val, bool):
                    attribute_types[key] = 'boolean'
                elif isinstance(val, (int, float)):
                    attribute_types[key] = 'numerical'
                elif isinstance(val, str):
                    attribute_types[key] = 'categorical'
                    if key not in categorical_values:
                        categorical_values[key] = set()
                    categorical_values[key].add(val)
                break

    # Build feature matrix
    feature_vectors = []
    feature_names = []

    for key in all_keys:
        attr_type = attribute_types.get(key, 'categorical')

        if attr_type == 'boolean':
            # Boolean: convert to 0.0/1.0
            col = []
            for conv in conversations:
                val = conv.get('attributes', {}).get(key)
                col.append(1.0 if val else 0.0)
            feature_vectors.append(col)
            feature_names.append(key)

        elif attr_type == 'numerical':
            # Numerical: use directly (will be standardized later)
            col = []
            for conv in conversations:
                val = conv.get('attributes', {}).get(key)
                col.append(float(val) if val is not None else 0.0)
            feature_vectors.append(col)
            feature_names.append(key)

        elif attr_type == 'categorical':
            # Categorical: one-hot encode
            unique_values = sorted(list(categorical_values[key]))
            for unique_val in unique_values:
                col = []
                for conv in conversations:
                    val = conv.get('attributes', {}).get(key)
                    col.append(1.0 if val == unique_val else 0.0)
                feature_vectors.append(col)
                feature_names.append(f"{key}={unique_val}")

    if not feature_vectors:
        return np.zeros((len(conversations), 1)), []

    # Transpose to get (n_conversations, n_features)
    encoded_matrix = np.array(feature_vectors).T

    # Standardize numerical features
    scaler = StandardScaler()
    encoded_matrix = scaler.fit_transform(encoded_matrix)

    return encoded_matrix, feature_names


def test_encoding():
    """Test encoding functions"""
    # Test outcome encoding
    assert encode_outcome("satisfied") == 1.0
    assert encode_outcome("unsatisfied") == 0.0
    assert encode_outcome("unclear") == 0.5

    # Test attribute encoding
    conversations = [
        {
            "attributes": {
                "user_type": "premium",
                "issue_resolved": True,
                "satisfaction_score": 8
            }
        },
        {
            "attributes": {
                "user_type": "free",
                "issue_resolved": False,
                "satisfaction_score": 3
            }
        },
        {
            "attributes": {
                "user_type": "premium",
                "issue_resolved": True,
                "satisfaction_score": 9
            }
        }
    ]

    encoded, names = encode_attributes(conversations)
    print("Encoded shape:", encoded.shape)
    print("Feature names:", names)
    print("Encoded matrix:\n", encoded)


def create_weighted_vectors(
    semantic_embeddings: np.ndarray,
    encoded_attributes: np.ndarray,
    outcome_encodings: np.ndarray,
    weights: Dict[str, float]
) -> np.ndarray:
    """
    Create weighted feature vectors by combining semantic embeddings,
    encoded attributes, and outcome encodings.

    Formula:
        weighted_vector = (
            weights['semantic'] × semantic_embedding +
            weights['attributes'] × encoded_attributes +
            weights['outcome'] × outcome_encoding
        )

    Args:
        semantic_embeddings: (n_conversations, embedding_dim) - e.g., (100, 1536)
        encoded_attributes: (n_conversations, n_attr_features) - e.g., (100, 5)
        outcome_encodings: (n_conversations, 1) - e.g., (100, 1)
        weights: Dict with keys 'semantic', 'attributes', 'outcome'

    Returns:
        weighted_vectors: (n_conversations, total_dim) numpy array
    """
    n_conversations = semantic_embeddings.shape[0]

    # Normalize each component by its L2 norm to put them on same scale
    # This ensures weighting works correctly regardless of dimensionality

    # Normalize semantic embeddings (per row)
    semantic_norm = semantic_embeddings / (np.linalg.norm(semantic_embeddings, axis=1, keepdims=True) + 1e-8)

    # Normalize attributes (per row)
    if encoded_attributes.shape[1] > 0:
        attr_norm = encoded_attributes / (np.linalg.norm(encoded_attributes, axis=1, keepdims=True) + 1e-8)
    else:
        attr_norm = np.zeros((n_conversations, 1))

    # Normalize outcomes (already single values, but normalize for consistency)
    outcome_norm = outcome_encodings / (np.linalg.norm(outcome_encodings, axis=1, keepdims=True) + 1e-8)

    # Apply weights
    weighted_semantic = weights['semantic'] * semantic_norm
    weighted_attributes = weights['attributes'] * attr_norm
    weighted_outcome = weights['outcome'] * outcome_norm

    # Concatenate all weighted components
    weighted_vectors = np.concatenate([
        weighted_semantic,
        weighted_attributes,
        weighted_outcome
    ], axis=1)

    return weighted_vectors


def test_weighted_vectors():
    """Test weighted vector creation"""
    # Mock data
    n_conversations = 3
    embedding_dim = 4  # Simplified from 1536 for testing

    semantic_embeddings = np.random.randn(n_conversations, embedding_dim)
    encoded_attributes = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 0.0]])
    outcome_encodings = np.array([[1.0], [0.0], [0.5]])

    weights = {
        'semantic': 0.65,
        'attributes': 0.25,
        'outcome': 0.10
    }

    weighted = create_weighted_vectors(
        semantic_embeddings,
        encoded_attributes,
        outcome_encodings,
        weights
    )

    print("Semantic shape:", semantic_embeddings.shape)
    print("Attributes shape:", encoded_attributes.shape)
    print("Outcomes shape:", outcome_encodings.shape)
    print("Weighted vectors shape:", weighted.shape)
    print("Expected shape:", (n_conversations, embedding_dim + 2 + 1))
    print("\nFirst weighted vector:", weighted[0])
    print("Vector L2 norm:", np.linalg.norm(weighted[0]))


if __name__ == "__main__":
    print("=== Testing Encoding ===")
    test_encoding()
    print("\n=== Testing Weighted Vectors ===")
    test_weighted_vectors()
