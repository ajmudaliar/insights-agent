import type { ConversationWithMessages } from "./base";
import { fetchLastNConversations, fetchLastNMessages } from "./fetching";

// Types

export type StratificationOptions = {
  oversampleMultiplier?: number;
};

export type StratificationResult = {
  conversations: ConversationWithMessages[];
  stratification: {
    total_fetched: number;
    skipped_failed: number;
    total_sampled: number;
    buckets: Record<string, [number, number]>; // { bucket_name: [available, sampled] }
  };
};

type ConversationBucket = {
  name: string;
  minTurns: number;
  maxTurns: number;
  weight: number;
  conversations: ConversationWithMessages[];
};

// Utilities

/** Randomly sample n items from array without replacement */
function sampleFromArray<T>(array: T[], n: number): T[] {
  if (n >= array.length) return [...array];

  const sampled: T[] = [];
  const indices = new Set<number>();

  while (sampled.length < n && sampled.length < array.length) {
    const idx = Math.floor(Math.random() * array.length);
    if (!indices.has(idx)) {
      indices.add(idx);
      sampled.push(array[idx]);
    }
  }

  return sampled;
}

/**
 * Bucket definitions by message count:
 * - single-turn (1): 0.5x weight - minimal context
 * - short (2-5): 1.0x weight - basic exchanges
 * - medium (6-10): 1.5x weight - meaningful conversations
 * - long (11+): 2.0x weight - complex dialogues
 */
function createLengthBuckets(): ConversationBucket[] {
  return [
    { name: "single-turn", minTurns: 1, maxTurns: 1, weight: 0.5, conversations: [] },
    { name: "short", minTurns: 2, maxTurns: 5, weight: 1.0, conversations: [] },
    { name: "medium", minTurns: 6, maxTurns: 10, weight: 1.5, conversations: [] },
    { name: "long", minTurns: 11, maxTurns: Infinity, weight: 2.0, conversations: [] },
  ];
}

function assignToBuckets(conversations: ConversationWithMessages[]): ConversationBucket[] {
  const buckets = createLengthBuckets();

  for (const item of conversations) {
    const turnCount = item.messages.length;
    const bucket = buckets.find((b) => turnCount >= b.minTurns && turnCount <= b.maxTurns);
    if (bucket) {
      bucket.conversations.push(item);
    }
  }

  return buckets;
}

// Main Function

/**
 * Stratified sampling of conversations by length.
 * Oversamples, buckets by message count, then samples proportionally with weights
 * favoring longer conversations for richer insights.
 */
export async function stratifiedSampleConversations(
  targetSampleSize: number,
  maxMessagesPerConversation: number,
  options: StratificationOptions = {}
): Promise<StratificationResult> {
  const { oversampleMultiplier = 3 } = options;

  // Phase 1: Fetch oversampled conversations (with hasMessages filter to skip empty ones)
  const oversampleSize = Math.min(targetSampleSize * oversampleMultiplier, 1000);
  const conversations = await fetchLastNConversations(oversampleSize, { hasMessages: true });
  const allConversations: ConversationWithMessages[] = [];
  let skippedFailed = 0;

  for (const conversation of conversations) {
    try {
      const messages = await fetchLastNMessages(conversation.id, maxMessagesPerConversation);
      allConversations.push({ conversation, messages });
    } catch {
      skippedFailed++;
    }
  }

  // Early exit: return all if under target
  if (allConversations.length <= targetSampleSize) {
    const buckets = assignToBuckets(allConversations);
    return {
      conversations: allConversations,
      stratification: {
        total_fetched: conversations.length,
        skipped_failed: skippedFailed,
        total_sampled: allConversations.length,
        buckets: Object.fromEntries(
          buckets.map((b) => [b.name, [b.conversations.length, b.conversations.length]])
        ),
      },
    };
  }

  // Phase 2: Assign to buckets
  const buckets = assignToBuckets(allConversations);

  // Phase 3: Calculate weights
  const totalWeight = buckets.reduce((sum, b) => sum + b.conversations.length * b.weight, 0);

  // Phase 4: Sample proportionally from each bucket
  const sampledConversations: ConversationWithMessages[] = [];
  const sampledIds = new Set<string>();
  let remainingQuota = targetSampleSize;

  for (const bucket of buckets) {
    if (bucket.conversations.length === 0) continue;

    const bucketWeight = bucket.conversations.length * bucket.weight;
    const bucketTarget = Math.min(
      Math.round((bucketWeight / totalWeight) * targetSampleSize),
      bucket.conversations.length
    );

    const sampled = sampleFromArray(bucket.conversations, bucketTarget);
    sampledConversations.push(...sampled);
    sampled.forEach((c) => sampledIds.add(c.conversation.id));
    remainingQuota -= sampled.length;
  }

  // Phase 5: Redistribute remaining quota to high-weight buckets
  const sortedBuckets = [...buckets].sort((a, b) => b.weight - a.weight);

  while (remainingQuota > 0) {
    let addedAny = false;

    for (const bucket of sortedBuckets) {
      if (remainingQuota <= 0) break;

      const unsampled = bucket.conversations.filter((c) => !sampledIds.has(c.conversation.id));
      if (unsampled.length > 0) {
        const additional = sampleFromArray(unsampled, 1);
        sampledConversations.push(...additional);
        additional.forEach((c) => sampledIds.add(c.conversation.id));
        remainingQuota--;
        addedAny = true;
      }
    }

    if (!addedAny) break;
  }

  // Phase 6: Finalize
  const finalSample = sampledConversations.slice(0, targetSampleSize);

  const bucketStats: Record<string, [number, number]> = {};
  for (const bucket of buckets) {
    const bucketConvIds = new Set(bucket.conversations.map((c) => c.conversation.id));
    const sampledFromBucket = finalSample.filter((c) => bucketConvIds.has(c.conversation.id)).length;
    bucketStats[bucket.name] = [bucket.conversations.length, sampledFromBucket];
  }

  return {
    conversations: finalSample,
    stratification: {
      total_fetched: conversations.length,
      skipped_failed: skippedFailed,
      total_sampled: finalSample.length,
      buckets: bucketStats,
    },
  };
}
