import type { Message, Conversation, ConversationWithMessages } from "./conversations";
import { fetchLastNConversations, fetchLastNMessages } from "./conversation-fetching";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for stratified sampling
 */
export type StratificationOptions = {
  /** How many extra conversations to fetch before stratification (default: 5) */
  oversampleMultiplier?: number;
};

/**
 * Result of stratified sampling with statistics
 */
export type StratificationResult = {
  /** The sampled conversations */
  conversations: ConversationWithMessages[];
  /** Statistics about the stratification process */
  stratification: {
    /** Total conversations fetched (before sampling) */
    total_fetched: number;
    /** Total conversations sampled (after stratification) */
    total_sampled: number;
    /** The oversample multiplier used */
    oversample_multiplier: number;
    /** Per-bucket statistics */
    buckets: Array<{
      /** Bucket name (e.g., "single-turn", "short", "medium", "long") */
      name: string;
      /** Turn count range (e.g., "1", "2-5", "6-10", "11+") */
      turn_range: string;
      /** Weight multiplier for this bucket */
      weight: number;
      /** Number of conversations available in this bucket */
      available: number;
      /** Number of conversations sampled from this bucket */
      sampled: number;
      /** Percentage of final sample from this bucket */
      percentage: number;
    }>;
  };
};

/**
 * Internal type for conversation buckets during stratification
 */
type ConversationBucket = {
  name: string;
  minTurns: number;
  maxTurns: number;
  weight: number;
  conversations: ConversationWithMessages[];
};

// ============================================================================
// Sampling Utilities
// ============================================================================

/**
 * Randomly samples n items from an array without replacement
 *
 * This function implements random sampling using a Set-based approach for
 * duplicate prevention. Unlike Fisher-Yates which modifies the array,
 * this approach is read-only and suitable for sampling from immutable data.
 *
 * ## Algorithm
 * 1. Generate random indices from [0, array.length)
 * 2. If index not already sampled (O(1) Set lookup), add it
 * 3. Continue until we have n unique items
 *
 * ## Time Complexity
 * - Best case: O(n) when no collisions
 * - Average case: O(n) for n << array.length
 * - Worst case: O(n × k) where k is average collision count
 *   (extremely unlikely for reasonable sample sizes)
 *
 * ## Space Complexity
 * O(n) for storing sampled indices and results
 *
 * ## Example
 * ```typescript
 * const conversations = [conv1, conv2, conv3, conv4, conv5];
 * const sample = sampleFromArray(conversations, 3);
 * // Returns: [conv2, conv5, conv1] (random 3 items)
 * ```
 *
 * @param array - Array to sample from (not modified)
 * @param n - Number of items to sample
 * @returns Array of n randomly sampled items (or all items if n >= array.length)
 */
function sampleFromArray<T>(array: T[], n: number): T[] {
  // Edge case: If requesting all or more, return copy of entire array
  if (n >= array.length) return [...array];

  const sampled: T[] = [];
  const indices = new Set<number>(); // Track sampled indices to prevent duplicates

  // Sample until we have n items
  // Double condition is safety net: sampled.length < array.length prevents
  // infinite loops if random number generator has pathological behavior
  while (sampled.length < n && sampled.length < array.length) {
    const idx = Math.floor(Math.random() * array.length);

    // Only add if we haven't sampled this index yet (O(1) lookup)
    if (!indices.has(idx)) {
      indices.add(idx);
      sampled.push(array[idx]);
    }
  }

  return sampled;
}

// ============================================================================
// Bucketing Logic
// ============================================================================

/**
 * Defines the stratification buckets for conversation length
 *
 * Creates 4 mutually exclusive buckets based on turn count (message count).
 * Buckets are weighted to prioritize longer, more informative conversations
 * during sampling.
 *
 * ## Bucket Definitions
 *
 * **Single-turn (1 message) - Weight 0.5×**
 * - Quick Q&A, minimal context
 * - Example: "What's your return policy?" → "30 days"
 * - Deprioritized because limited information value
 *
 * **Short (2-5 messages) - Weight 1.0× (baseline)**
 * - Basic back-and-forth, simple clarifications
 * - Example: User asks → Bot answers → User follows up
 * - Standard priority
 *
 * **Medium (6-10 messages) - Weight 1.5×**
 * - Meaningful conversation with context
 * - Example: Multi-step troubleshooting, detailed inquiry
 * - Prioritized for richer insights
 *
 * **Long (11+ messages) - Weight 2.0×**
 * - Complex, multi-turn dialogue
 * - Example: Extended support session, complex planning
 * - Highly prioritized for maximum information value
 *
 * ## Why These Weights?
 *
 * The weights reflect the information density and insight value:
 * - Longer conversations provide more behavioral patterns
 * - More context for understanding user intent
 * - Better representation of complex use cases
 *
 * Without weighting, you might get 80% single-turn conversations in your
 * sample, which wouldn't be representative of meaningful user interactions.
 *
 * ## Bucket Properties
 * - **Mutually exclusive**: Each conversation belongs to exactly one bucket
 * - **Exhaustive**: Covers all possible turn counts from 1 to infinity
 * - **Non-overlapping**: Clear boundaries prevent ambiguity
 *
 * @returns Array of 4 empty bucket definitions ready for population
 */
function createLengthBuckets(): ConversationBucket[] {
  return [
    {
      name: 'single-turn',
      minTurns: 1,
      maxTurns: 1,
      weight: 0.5,
      conversations: []
    },
    {
      name: 'short',
      minTurns: 2,
      maxTurns: 5,
      weight: 1.0,
      conversations: []
    },
    {
      name: 'medium',
      minTurns: 6,
      maxTurns: 10,
      weight: 1.5,
      conversations: []
    },
    {
      name: 'long',
      minTurns: 11,
      maxTurns: Infinity,
      weight: 2.0,
      conversations: []
    },
  ];
}

/**
 * Assigns conversations to buckets based on their turn count (message count)
 *
 * Each conversation is placed in exactly ONE bucket based on its number of
 * messages. Buckets are mutually exclusive and exhaustive (cover all possible
 * turn counts from 1 to infinity).
 *
 * ## Bucket Assignment Rules
 * ```
 * Turn Count | Bucket       | Weight
 * -----------|--------------|--------
 * 1          | single-turn  | 0.5×
 * 2-5        | short        | 1.0×
 * 6-10       | medium       | 1.5×
 * 11+        | long         | 2.0×
 * ```
 *
 * ## Example
 * ```typescript
 * const conversations = [
 *   { conversation: c1, messages: [m1] },              // 1 message  → single-turn
 *   { conversation: c2, messages: [m1, m2, m3] },     // 3 messages → short
 *   { conversation: c3, messages: [m1...m8] },        // 8 messages → medium
 *   { conversation: c4, messages: [m1...m15] },       // 15 messages → long
 * ];
 * const buckets = assignToBuckets(conversations);
 * // single-turn: [c1], short: [c2], medium: [c3], long: [c4]
 * ```
 *
 * ## Edge Cases
 * - Conversations with 0 messages: Will not match any bucket (all require minTurns ≥ 1).
 *   However, these should be filtered upstream in the workflow.
 * - Empty input: Returns 4 empty buckets
 *
 * @param conversationsWithMessages - Conversations with their messages to bucket
 * @returns Array of 4 buckets with conversations assigned
 */
function assignToBuckets(
  conversationsWithMessages: ConversationWithMessages[]
): ConversationBucket[] {
  const buckets = createLengthBuckets();

  for (const item of conversationsWithMessages) {
    const turnCount = item.messages.length;

    // Find the bucket this conversation belongs to
    // Buckets are mutually exclusive, so .find() returns exactly one match
    const bucket = buckets.find(
      b => turnCount >= b.minTurns && turnCount <= b.maxTurns
    );

    if (bucket) {
      bucket.conversations.push(item);
    }
    // Note: Conversations with 0 messages won't match any bucket,
    // but these should be filtered out in the workflow before reaching here
  }

  return buckets;
}

// ============================================================================
// Main Stratified Sampling Function
// ============================================================================

/**
 * Performs stratified sampling of conversations based on conversation length
 *
 * This function implements the complete stratified sampling pipeline:
 * 1. Oversamples to ensure bucket coverage
 * 2. Buckets conversations by length
 * 3. Applies intelligent weighting
 * 4. Samples proportionally from each bucket
 * 5. Returns sample with detailed statistics
 *
 * ## Parameters
 *
 * @param targetSampleSize - How many conversations you want in the final sample
 * @param maxMessagesPerConversation - Max messages to fetch per conversation
 * @param options - Optional: { oversampleMultiplier }
 *
 * ## Returns
 *
 * Object containing:
 * - `conversations`: The stratified sample
 * - `stratification`: Detailed statistics about the sampling process
 *
 * ## Example Usage
 *
 * ```typescript
 * // Sample 100 conversations
 * const result = await stratifiedSampleConversations(100, 500, {
 *   oversampleMultiplier: 3
 * });
 *
 * console.log(`Sampled ${result.conversations.length} conversations`);
 * console.log(`From ${result.stratification.total_fetched} total`);
 *
 * // View bucket distribution
 * result.stratification.buckets.forEach(bucket => {
 *   console.log(`${bucket.name}: ${bucket.sampled}/${bucket.available} (${bucket.percentage}%)`);
 * });
 * ```
 */
export async function stratifiedSampleConversations(
  targetSampleSize: number,
  maxMessagesPerConversation: number,
  options: StratificationOptions = {}
): Promise<StratificationResult> {
  const { oversampleMultiplier = 3 } = options;

  // ============================================================================
  // PHASE 1: OVERSAMPLING
  // ============================================================================
  // Fetch more conversations than needed to ensure bucket coverage.
  // Why? If we only fetch 100 and 90 are single-turn, we won't have enough
  // medium/long conversations for meaningful stratification.
  //
  // Example: target=100, multiplier=5 → fetch 500 (capped at 1000)
  const oversampleSize = Math.min(targetSampleSize * oversampleMultiplier, 1000);

  // Fetch conversations and their messages
  const conversations = await fetchLastNConversations(oversampleSize);
  const allConversations: ConversationWithMessages[] = [];

  for (const conversation of conversations) {
    try {
      const messages = await fetchLastNMessages(
        conversation.id,
        maxMessagesPerConversation
      );
      allConversations.push({ conversation, messages });
    } catch (error) {
      // Skip conversations that fail to fetch (network errors, permissions, etc.)
      continue;
    }
  }

  // EARLY EXIT: If we got fewer conversations than target, return all
  // No stratification needed if we can't even meet the target
  if (allConversations.length <= targetSampleSize) {
    const buckets = assignToBuckets(allConversations);
    return {
      conversations: allConversations,
      stratification: {
        total_fetched: allConversations.length,
        total_sampled: allConversations.length,
        oversample_multiplier: oversampleMultiplier,
        buckets: buckets.map(b => ({
          name: b.name,
          turn_range: b.maxTurns === Infinity ? `${b.minTurns}+` : `${b.minTurns}-${b.maxTurns}`,
          weight: b.weight,
          available: b.conversations.length,
          sampled: b.conversations.length,
          percentage: b.conversations.length > 0 ? 100 : 0,
        })),
      },
    };
  }

  // ============================================================================
  // PHASE 2: BUCKET ASSIGNMENT
  // ============================================================================
  // Assign each conversation to exactly ONE bucket based on message count:
  //   - single-turn (1 msg)    → weight 0.5×
  //   - short (2-5 msgs)       → weight 1.0×
  //   - medium (6-10 msgs)     → weight 1.5×
  //   - long (11+ msgs)        → weight 2.0×
  const buckets = assignToBuckets(allConversations);

  // ============================================================================
  // PHASE 3: WEIGHT CALCULATION
  // ============================================================================
  // Calculate total weight across ALL buckets to determine proportions.
  //
  // Formula: Total Weight = Σ (conversations_in_bucket × bucket_weight)
  //
  // Example:
  //   Single-turn: 200 × 0.5 = 100
  //   Short:       150 × 1.0 = 150
  //   Medium:      100 × 1.5 = 150
  //   Long:         50 × 2.0 = 100
  //   Total Weight = 500
  const totalWeight = buckets.reduce((sum, bucket) => {
    return sum + (bucket.conversations.length * bucket.weight);
  }, 0);

  // ============================================================================
  // PHASE 4: PROPORTIONAL SAMPLING
  // ============================================================================
  // For each bucket, calculate how many conversations to sample based on its
  // weighted proportion of the total.
  //
  // Formula: bucket_target = round((bucket_weight / total_weight) × target)
  //
  // Example (continuing above, target=100):
  //   Single: (100/500) × 100 = 20
  //   Short:  (150/500) × 100 = 30
  //   Medium: (150/500) × 100 = 30
  //   Long:   (100/500) × 100 = 20
  const sampledConversations: ConversationWithMessages[] = [];
  const sampledIds = new Set<string>(); // O(1) duplicate detection
  let remainingQuota = targetSampleSize;

  // First pass: sample from each bucket proportionally
  for (const bucket of buckets) {
    if (bucket.conversations.length === 0) continue;

    // Calculate this bucket's weighted proportion
    const bucketWeight = bucket.conversations.length * bucket.weight;
    const weightedProportion = bucketWeight / totalWeight;

    // Determine target for this bucket (rounded)
    let bucketTarget = Math.round(weightedProportion * targetSampleSize);

    // Can't sample more than what's available
    bucketTarget = Math.min(bucketTarget, bucket.conversations.length);

    // Sample randomly from this bucket
    const sampled = sampleFromArray(bucket.conversations, bucketTarget);
    sampledConversations.push(...sampled);

    // Track sampled IDs to prevent duplicates
    sampled.forEach(conv => sampledIds.add(conv.conversation.id));

    // Track how many slots remain (may be negative if rounding caused oversample)
    remainingQuota -= sampled.length;
  }

  // ============================================================================
  // PHASE 5: QUOTA REDISTRIBUTION
  // ============================================================================
  // Rounding may cause us to under-sample (remainingQuota > 0).
  // Distribute remaining slots to high-weight buckets first.
  //
  // Why prioritize high-weight? To maximize information value when we have
  // remaining quota (prefer adding long conversations over single-turn).

  // Sort buckets by weight once (highest first) - O(b log b) where b=4
  const sortedBuckets = [...buckets].sort((a, b) => b.weight - a.weight);

  while (remainingQuota > 0) {
    let addedAny = false;

    for (const bucket of sortedBuckets) {
      if (remainingQuota <= 0) break;

      // Find conversations not yet sampled from this bucket - O(1) lookup
      const unsampledInBucket = bucket.conversations.filter(
        conv => !sampledIds.has(conv.conversation.id)
      );

      if (unsampledInBucket.length > 0) {
        // Add one more conversation from this bucket
        const additional = sampleFromArray(unsampledInBucket, 1);
        sampledConversations.push(...additional);

        // Track the newly sampled ID
        additional.forEach(conv => sampledIds.add(conv.conversation.id));

        remainingQuota--;
        addedAny = true;
      }
    }

    // Exit if all buckets exhausted (no more unsampled conversations)
    if (!addedAny) break;
  }

  // ============================================================================
  // PHASE 6: FINALIZATION
  // ============================================================================
  // Ensure we don't exceed target (handles rounding oversample)
  const finalSample = sampledConversations.slice(0, targetSampleSize);

  // Generate detailed statistics for each bucket
  const bucketStats = buckets.map(bucket => {
    // Create Set for O(1) bucket membership testing
    const bucketConvIds = new Set(bucket.conversations.map(c => c.conversation.id));

    // Count how many from this bucket ended up in final sample
    const sampledFromBucket = finalSample.filter(conv =>
      bucketConvIds.has(conv.conversation.id)
    ).length;

    return {
      name: bucket.name,
      turn_range: bucket.maxTurns === Infinity
        ? `${bucket.minTurns}+`
        : `${bucket.minTurns}-${bucket.maxTurns}`,
      weight: bucket.weight,
      available: bucket.conversations.length,
      sampled: sampledFromBucket,
      percentage: finalSample.length > 0
        ? Math.round((sampledFromBucket / finalSample.length) * 100)
        : 0, // Prevent division by zero
    };
  });

  return {
    conversations: finalSample,
    stratification: {
      total_fetched: allConversations.length,
      total_sampled: finalSample.length,
      oversample_multiplier: oversampleMultiplier,
      buckets: bucketStats,
    },
  };
}
