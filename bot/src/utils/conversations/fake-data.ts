import type { Conversation, Message } from "./base";
import templateConversations from "./fake-conversations.json";

// ============================================================================
// Types
// ============================================================================

type TemplateMessage = {
  role: "user" | "bot";
  content: string;
};

type TemplateConversation = {
  id: string;
  channel: string;
  tags: { topic: string; source: string };
  messages: TemplateMessage[];
};

type FakeConversationData = {
  conversation: Conversation;
  messages: Message[];
};

// ============================================================================
// Seeded Random Generator (for reproducible variations)
// ============================================================================

function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = createSeededRandom(42);

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)]!;
}

// ============================================================================
// Generate Variations
// ============================================================================

const CHANNELS = ["webchat", "slack", "messenger", "whatsapp", "api"];
const SOURCES = ["website", "mobile", "desktop", "app"];

function generateTimestamp(daysAgo: number, hourOffset: number): Date {
  const now = new Date();
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  date.setHours(hourOffset, randomInt(0, 59), randomInt(0, 59));
  return date;
}

function generateConversationFromTemplate(
  template: TemplateConversation,
  variationIndex: number
): FakeConversationData {
  // Generate unique ID
  const id = `conv_${template.id}_v${variationIndex}`;

  // Spread conversations over last 30 days
  const daysAgo = randomInt(0, 30);
  const hourOffset = randomInt(8, 22); // Business hours-ish
  const createdAt = generateTimestamp(daysAgo, hourOffset);

  // Generate messages with timestamps
  const messages: Message[] = template.messages.map((msg, idx) => {
    const messageTime = new Date(createdAt.getTime() + idx * randomInt(30000, 300000));
    return {
      id: `${id}_msg_${idx}`,
      content: msg.content,
      createdAt: messageTime.toISOString(),
      direction: msg.role === "user" ? "incoming" as const : "outgoing" as const,
      type: "text",
      userId: msg.role === "user" ? `user_${id.slice(-8)}` : undefined,
      author: {
        id: msg.role === "user" ? `user_${id.slice(-8)}` : "bot",
        type: msg.role === "user" ? "user" as const : "bot" as const,
        name: msg.role === "user" ? "User" : "Botpress Docs Bot",
      },
    };
  });

  // Get last message time for updatedAt
  const lastMessage = messages[messages.length - 1];
  const updatedAt = lastMessage?.createdAt || createdAt.toISOString();

  // Vary channel and source
  const channel = randomChoice(CHANNELS);
  const source = randomChoice(SOURCES);

  const conversation: Conversation = {
    id,
    createdAt: createdAt.toISOString(),
    updatedAt,
    channel,
    integration: channel,
    tags: {
      topic: template.tags.topic,
      source,
    },
  };

  return { conversation, messages };
}

// ============================================================================
// Generate Full Dataset
// ============================================================================

let generatedData: FakeConversationData[] | null = null;

function generateAllConversations(): FakeConversationData[] {
  const templates = templateConversations as TemplateConversation[];
  const data: FakeConversationData[] = [];

  // Generate ~35 variations of each template to get 1000+ conversations
  const variationsPerTemplate = Math.ceil(1050 / templates.length);

  for (const template of templates) {
    for (let i = 0; i < variationsPerTemplate; i++) {
      data.push(generateConversationFromTemplate(template, i));
    }
  }

  // Sort by createdAt descending (newest first)
  data.sort((a, b) =>
    new Date(b.conversation.createdAt).getTime() - new Date(a.conversation.createdAt).getTime()
  );

  return data;
}

// ============================================================================
// Public API
// ============================================================================

export function getFakeConversations(): FakeConversationData[] {
  if (!generatedData) {
    generatedData = generateAllConversations();
  }
  return generatedData;
}

export function getFakeConversationById(id: string): FakeConversationData | undefined {
  return getFakeConversations().find((c) => c.conversation.id === id);
}

export function paginateFakeConversations(
  conversations: Conversation[],
  nextToken?: string,
  pageSize: number = 20
): { conversations: Conversation[]; nextToken?: string } {
  let startIndex = 0;

  if (nextToken) {
    try {
      startIndex = parseInt(Buffer.from(nextToken, "base64").toString("utf8"), 10);
    } catch {
      startIndex = 0;
    }
  }

  const page = conversations.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < conversations.length;

  return {
    conversations: page,
    nextToken: hasMore
      ? Buffer.from((startIndex + pageSize).toString()).toString("base64")
      : undefined,
  };
}

export function getFakeMessages(conversationId: string): Message[] {
  const conv = getFakeConversationById(conversationId);
  return conv?.messages ?? [];
}

export function paginateFakeMessages(
  messages: Message[],
  nextToken?: string,
  pageSize: number = 20
): { messages: Message[]; nextToken?: string } {
  let startIndex = 0;

  if (nextToken) {
    try {
      startIndex = parseInt(Buffer.from(nextToken, "base64").toString("utf8"), 10);
    } catch {
      startIndex = 0;
    }
  }

  const page = messages.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < messages.length;

  return {
    messages: page,
    nextToken: hasMore
      ? Buffer.from((startIndex + pageSize).toString()).toString("base64")
      : undefined,
  };
}

// ============================================================================
// Toggle Check
// ============================================================================

export function useFakeData(): boolean {
  return true;
}
