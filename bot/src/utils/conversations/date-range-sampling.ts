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
    skipped_failed: number;
    total_included: number;
  };
};

/**
 * Fetch all conversations within a date range.
 * Uses API-level filtering by date and hasMessages tag.
 */
export async function fetchConversationsInDateRange(
  startDate: Date,
  endDate: Date,
  options: DateRangeOptions = {}
): Promise<DateRangeResult> {
  const { maxMessagesPerConversation = 100 } = options;

  const allConversations: ConversationWithMessages[] = [];
  let totalFetched = 0;
  let skippedFailed = 0;
  let nextToken: string | undefined;

  // Fetch conversations with API-level date and hasMessages filtering
  while (true) {
    const result = await fetchConversations({
      nextToken,
      afterDate: startDate,
      beforeDate: endDate,
      hasMessages: true,
    });
    totalFetched += result.conversations.length;

    for (const conversation of result.conversations) {
      try {
        const messages = await fetchLastNMessages(conversation.id, maxMessagesPerConversation);
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
      skipped_failed: skippedFailed,
      total_included: allConversations.length,
    },
  };
}
