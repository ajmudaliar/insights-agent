import type { Message, Conversation, ConversationWithMessages, FetchConversationsOptions } from "./base";
import { fetchConversations, fetchMessages } from "./base";

// ============================================================================
// Recursive Fetch Functions
// ============================================================================

export type FetchLastNConversationsOptions = Omit<FetchConversationsOptions, "nextToken">;

/**
 * Recursively fetches the last N conversations
 * @param n - The total number of conversations to fetch
 * @param options - Optional filters (hasMessages, afterDate, beforeDate)
 * @returns Array of conversations (newest first)
 */
export const fetchLastNConversations = async (
  n: number,
  options: FetchLastNConversationsOptions = {}
): Promise<Conversation[]> => {
  const conversations: any[] = [];
  let nextToken: string | undefined = undefined;

  const fetchBatch = async (): Promise<void> => {
    // Base case: we have enough conversations
    if (conversations.length >= n) {
      return;
    }

    // Fetch the next batch of conversations (rate-limited in base.ts)
    const result = await fetchConversations({ ...options, nextToken });
    conversations.push(...result.conversations);

    // Base case: no more conversations available
    if (!result.hasMore) {
      return;
    }

    // Base case: we now have enough conversations
    if (conversations.length >= n) {
      return;
    }

    // Update token for next batch
    nextToken = result.nextToken;

    // Recursive case: fetch more conversations
    await fetchBatch();
  };

  await fetchBatch();
  return conversations.slice(0, n);
};

/**
 * Recursively fetches the last N messages from a conversation
 * @param conversationId - The conversation ID to fetch messages from
 * @param n - The total number of messages to fetch
 * @returns Array of messages (newest first)
 */
export const fetchLastNMessages = async (conversationId: string, n: number): Promise<Message[]> => {
  const messages: Message[] = [];
  let nextToken: string | undefined = undefined;

  const fetchBatch = async (): Promise<void> => {
    // Base case: we have enough messages
    if (messages.length >= n) {
      return;
    }

    // Fetch the next batch of messages (rate-limited in base.ts)
    const result = await fetchMessages(conversationId, nextToken);
    messages.push(...result.messages);

    // Base case: no more messages available
    if (!result.hasMore) {
      return;
    }

    // Base case: we now have enough messages
    if (messages.length >= n) {
      return;
    }

    // Update token for next batch
    nextToken = result.nextToken;

    // Recursive case: fetch more messages
    await fetchBatch();
  };

  await fetchBatch();
  return messages.slice(0, n);
};

/**
 * Fetches conversations with their messages in a single operation
 * This enables stratified sampling based on message count/content
 *
 * @param n - The total number of conversations to fetch
 * @param maxMessagesPerConversation - Maximum messages to fetch per conversation
 * @returns Array of {conversation, messages} pairs
 */
export const fetchConversationsWithMessages = async (
  n: number,
  maxMessagesPerConversation: number
): Promise<ConversationWithMessages[]> => {
  // Step 1: Fetch conversations
  const conversations = await fetchLastNConversations(n);

  // Step 2: Fetch messages for each conversation
  const conversationsWithMessages: ConversationWithMessages[] = [];

  for (const conversation of conversations) {
    try {
      const messages = await fetchLastNMessages(conversation.id, maxMessagesPerConversation);
      conversationsWithMessages.push({
        conversation,
        messages,
      });
    } catch (error) {
      // Skip conversations that fail to fetch messages
      continue;
    }
  }

  return conversationsWithMessages;
};
