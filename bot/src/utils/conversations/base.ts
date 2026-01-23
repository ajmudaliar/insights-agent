import { getTargetBotClient } from "../target-client";
import { RateLimiterMemory } from "rate-limiter-flexible";
import {
  useFakeData,
  getFakeConversations,
  paginateFakeConversations,
  getFakeMessages,
  paginateFakeMessages,
  getFakeConversationById,
} from "./fake-data";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Rate limiter instance - allows 500 requests per second by default
 * Adjust points and duration as needed for your API limits
 */
const rateLimiter = new RateLimiterMemory({
  points: 500, // Number of requests
  duration: 1, // Per second
});

// ============================================================================
// Types
// ============================================================================

export type Conversation = {
  id: string;
  currentTaskId?: string;
  currentWorkflowId?: string;
  createdAt: string;
  updatedAt: string;
  channel: string;
  integration: string;
  tags: {
    [k: string]: string;
  };
};

export type Message = {
  id: string;
  content?: string;
  payload?: { [k: string]: any };
  createdAt: string;
  updatedAt?: string;
  type?: string;
  direction?: "incoming" | "outgoing";
  userId?: string;
  author?: {
    id: string;
    type?: "admin" | "user" | "bot";
    name?: string;
    email?: string;
  };
};

export type ConversationWithMessages = {
  conversation: Conversation;
  messages: Message[];
};

// ============================================================================
// Base Fetch Functions
// ============================================================================

export type FetchConversationsOptions = {
  nextToken?: string;
  afterDate?: Date;
  beforeDate?: Date;
  hasMessages?: boolean;
};

export const fetchConversations = async (options: FetchConversationsOptions = {}) => {
  const { nextToken, afterDate, beforeDate, hasMessages } = options;

  // Use fake data if toggle is enabled
  if (useFakeData()) {
    let allConversations = getFakeConversations().map((c) => c.conversation);

    // Apply date filters for fake data
    if (afterDate) {
      allConversations = allConversations.filter((c) => new Date(c.updatedAt) >= afterDate);
    }
    if (beforeDate) {
      allConversations = allConversations.filter((c) => new Date(c.updatedAt) <= beforeDate);
    }

    const result = paginateFakeConversations(allConversations, nextToken);
    return {
      conversations: result.conversations,
      nextToken: result.nextToken,
      hasMore: !!result.nextToken,
    };
  }

  await rateLimiter.consume("conversations", 1);

  const client = getTargetBotClient();

  // Build tags filter
  const tags: Record<string, string> | undefined = hasMessages ? { hasMessages: "true" } : undefined;

  // Note: afterDate/beforeDate are supported by the API but not yet in SDK types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.listConversations({
    nextToken: nextToken,
    sortField: "updatedAt",
    sortDirection: "desc",
    afterDate: afterDate?.toISOString(),
    beforeDate: beforeDate?.toISOString(),
    tags,
  } as any);

  return {
    conversations: result.conversations,
    nextToken: result.meta.nextToken,
    hasMore: !!result.meta.nextToken,
  };
};

export const fetchConversationById = async (conversationId: string) => {
  // Use fake data if toggle is enabled
  if (useFakeData()) {
    const fake = getFakeConversationById(conversationId);
    if (!fake) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    return fake.conversation;
  }

  await rateLimiter.consume("conversation-by-id", 1);

  const client = getTargetBotClient();
  const result = await client.getConversation({ id: conversationId });

  return result.conversation;
};

export const fetchMessages = async (conversationId: string, nextToken?: string) => {
  // Use fake data if toggle is enabled
  if (useFakeData()) {
    const messages = getFakeMessages(conversationId);
    const result = paginateFakeMessages(messages, nextToken);
    return {
      messages: result.messages,
      nextToken: result.nextToken,
      hasMore: !!result.nextToken,
    };
  }

  await rateLimiter.consume(conversationId, 1);

  const client = getTargetBotClient();
  const result = await client.listMessages({
    conversationId,
    nextToken,
  });

  return {
    messages: result.messages,
    nextToken: result.meta.nextToken,
    hasMore: !!result.meta.nextToken,
  };
};
