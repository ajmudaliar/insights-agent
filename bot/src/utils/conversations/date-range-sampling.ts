import type { ConversationWithMessages } from "./base";
import { fetchConversations } from "./base";
import { fetchLastNMessages } from "./fetching";

export type DateRangeOptions = {
  maxMessagesPerConversation?: number;
};

export type DateRangeResult = {
  conversations: ConversationWithMessages[];
  stats: {
    total_fetched: number;
    skipped_empty: number;
    skipped_failed: number;
    total_included: number;
  };
};

/**
 * Fetch all conversations within a date range.
 * Filters by updatedAt, excludes empty conversations.
 */
export async function fetchConversationsInDateRange(
  startDate: Date,
  endDate: Date,
  options: DateRangeOptions = {}
): Promise<DateRangeResult> {
  const { maxMessagesPerConversation = 100 } = options;

  const allConversations: ConversationWithMessages[] = [];
  let totalFetched = 0;
  let skippedEmpty = 0;
  let skippedFailed = 0;
  let nextToken: string | undefined;
  let reachedBeforeStart = false;

  // Fetch conversations (sorted by updatedAt desc) until we pass the start date
  while (!reachedBeforeStart) {
    const result = await fetchConversations(nextToken);
    totalFetched += result.conversations.length;

    for (const conversation of result.conversations) {
      const convDate = new Date(conversation.updatedAt);

      // Skip if after end date
      if (convDate > endDate) continue;

      // Stop if before start date (conversations are sorted desc)
      if (convDate < startDate) {
        reachedBeforeStart = true;
        break;
      }

      // In range - fetch messages
      try {
        const messages = await fetchLastNMessages(conversation.id, maxMessagesPerConversation);
        if (messages.length === 0) {
          skippedEmpty++;
          continue;
        }
        allConversations.push({ conversation, messages });
      } catch {
        skippedFailed++;
      }
    }

    if (!result.hasMore) break;
    nextToken = result.nextToken;
  }

  return {
    conversations: allConversations,
    stats: {
      total_fetched: totalFetched,
      skipped_empty: skippedEmpty,
      skipped_failed: skippedFailed,
      total_included: allConversations.length,
    },
  };
}
