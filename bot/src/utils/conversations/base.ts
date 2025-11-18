import { getTargetBotClient } from "../target-client";
import { RateLimiterMemory } from "rate-limiter-flexible";

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

export const fetchConversations = async (nextToken?: string) => {
  await rateLimiter.consume("conversations", 1);

  const client = getTargetBotClient();
  const result = await client.listConversations({
    nextToken: nextToken,
  });

  return {
    conversations: result.conversations,
    nextToken: result.meta.nextToken,
    hasMore: !!result.meta.nextToken,
  };
};

export const fetchConversationById = async (conversationId: string) => {
  await rateLimiter.consume("conversation-by-id", 1);

  const client = getTargetBotClient();
  const result = await client.getConversation({ id: conversationId });

  return result.conversation;
};

export const fetchMessages = async (conversationId: string, nextToken?: string) => {
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
