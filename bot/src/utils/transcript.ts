import type { Message } from "./conversations";

// ============================================================================
// Transcript Generation
// ============================================================================

/**
 * Helper function to format text messages (text, markdown)
 */
const formatTextMessage = (payload: any, content?: string): string => {
  return payload?.text || content || "";
};

/**
 * Helper function to format choice/dropdown messages
 */
const formatChoiceMessage = (payload: any): string[] => {
  const lines: string[] = [];
  
  // Add the main text
  if (payload?.text) {
    lines.push(payload.text);
  }
  
  // Add numbered options
  if (payload?.options && Array.isArray(payload.options)) {
    const optionsList = payload.options
      .map((opt: any, idx: number) => `${idx + 1}. ${opt.label || opt.value}`)
      .join("\n");
    lines.push(`[Options presented:\n${optionsList}]`);
  }
  
  return lines;
};

/**
 * Helper function to format media messages (image, audio, video, file)
 */
const formatMediaMessage = (type: string, payload: any): string => {
  switch (type) {
    case "image":
      return "[Image]";
    case "audio":
      return "[Audio]";
    case "video":
      return payload?.title ? `[Video: ${payload.title}]` : "[Video]";
    case "file":
      return payload?.title ? `[File: ${payload.title}]` : "[File]";
    default:
      return "";
  }
};

/**
 * Helper function to format card messages
 */
const formatCardMessage = (payload: any): string[] => {
  const lines: string[] = [];
  
  // Add title and subtitle
  if (payload?.title) {
    lines.push(payload.title);
  }
  if (payload?.subtitle) {
    lines.push(payload.subtitle);
  }
  
  // Add action buttons
  if (payload?.actions && Array.isArray(payload.actions)) {
    const actionsList = payload.actions
      .map((action: any, idx: number) => `${idx + 1}. ${action.label}`)
      .join("\n");
    lines.push(`[Actions:\n${actionsList}]`);
  }
  
  return lines;
};

/**
 * Helper function to format carousel messages
 */
const formatCarouselMessage = (payload: any): string => {
  if (!payload?.items || !Array.isArray(payload.items)) {
    return "[Carousel]";
  }
  
  const cardTitles = payload.items
    .map((card: any) => card.title)
    .filter(Boolean)
    .join(", ");
  
  return `[Carousel with ${payload.items.length} cards${cardTitles ? `: ${cardTitles}` : ""}]`;
};

/**
 * Helper function to format a single message based on its type
 */
const formatMessageContent = (message: Message): string[] => {
  const type = message.type || "text";
  const payload = message.payload;
  
  switch (type) {
    case "text":
    case "markdown":
      const textContent = formatTextMessage(payload, message.content);
      return textContent ? [textContent] : [];
    
    case "choice":
    case "dropdown":
      return formatChoiceMessage(payload);
    
    case "image":
    case "audio":
    case "video":
    case "file":
      const mediaContent = formatMediaMessage(type, payload);
      return mediaContent ? [mediaContent] : [];
    
    case "card":
      return formatCardMessage(payload);
    
    case "carousel":
      const carouselContent = formatCarouselMessage(payload);
      return carouselContent ? [carouselContent] : [];
    
    case "bloc":
      return ["[Composite message]"];
    
    case "location":
      return ["[Location]"];
    
    case "custom":
      return [`[Custom message: ${payload?.name || "unknown"}]`];
    
    default:
      // Fallback for unknown types
      return [`[${type} message]`];
  }
};

/**
 * Generates an LLM-friendly transcript from an array of messages
 * Format: Clean, no timestamps, single newlines, handles all message types
 * @param messages - Array of messages to format
 * @returns Formatted transcript string optimized for LLM consumption
 */
export const generateTranscript = (messages: Message[]): string => {
  // Sort messages chronologically (oldest first)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const transcriptLines: string[] = [];

  sortedMessages.forEach((message) => {
    const speaker = message.direction === "incoming" ? "User" : "Bot";
    const contentLines = formatMessageContent(message);
    
    // Add each content line with speaker prefix on the first line only
    contentLines.forEach((line, index) => {
      if (index === 0) {
        transcriptLines.push(`${speaker}: ${line}`);
      } else {
        transcriptLines.push(line);
      }
    });
  });

  return transcriptLines.join("\n");
};

