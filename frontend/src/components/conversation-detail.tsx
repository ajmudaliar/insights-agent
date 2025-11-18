import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getConversationWithMessages } from "@/services/insights";
import type { ConversationWithMessages, Message } from "@/types/insights";
import { ArrowLeft, Calendar, MessageSquare } from "lucide-react";

interface ConversationDetailProps {
  conversationId: string;
  onBack: () => void;
}

export function ConversationDetail({ conversationId, onBack }: ConversationDetailProps) {
  const [data, setData] = useState<ConversationWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConversation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await getConversationWithMessages(conversationId);
        if (!result) {
          setError("Conversation not found");
        } else {
          setData(result);
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
        setError("Failed to load conversation");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format message content based on type
  const formatMessageContent = (message: Message): string[] => {
    const type = message.type || "text";
    const payload = message.payload;

    switch (type) {
      case "text":
      case "markdown":
        return [payload?.text || message.content || ""];

      case "choice":
      case "dropdown":
        const lines: string[] = [];
        if (payload?.text) lines.push(payload.text);
        if (payload?.options && Array.isArray(payload.options)) {
          const optionsList = payload.options
            .map((opt: any, idx: number) => `${idx + 1}. ${opt.label || opt.value}`)
            .join("\n");
          lines.push(`[Options presented:\n${optionsList}]`);
        }
        return lines;

      case "image":
        return ["[Image]"];
      case "audio":
        return ["[Audio]"];
      case "video":
        return [payload?.title ? `[Video: ${payload.title}]` : "[Video]"];
      case "file":
        return [payload?.title ? `[File: ${payload.title}]` : "[File]"];

      case "card":
        const cardLines: string[] = [];
        if (payload?.title) cardLines.push(payload.title);
        if (payload?.subtitle) cardLines.push(payload.subtitle);
        if (payload?.actions && Array.isArray(payload.actions)) {
          const actionsList = payload.actions
            .map((action: any, idx: number) => `${idx + 1}. ${action.label}`)
            .join("\n");
          cardLines.push(`[Actions:\n${actionsList}]`);
        }
        return cardLines;

      case "carousel":
        if (!payload?.items || !Array.isArray(payload.items)) {
          return ["[Carousel]"];
        }
        const cardTitles = payload.items
          .map((card: any) => card.title)
          .filter(Boolean)
          .join(", ");
        return [`[Carousel with ${payload.items.length} cards${cardTitles ? `: ${cardTitles}` : ""}]`];

      case "location":
        return ["[Location]"];

      case "custom":
        return [`[Custom message: ${payload?.name || "unknown"}]`];

      default:
        return [`[${type} message]`];
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <p className="text-sm text-destructive">{error || "Conversation not found"}</p>
      </div>
    );
  }

  // Sort messages chronologically
  const sortedMessages = [...data.messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Conversation Header */}
      <div className="space-y-3 pb-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Conversation</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-muted-foreground">Channel</p>
            <Badge variant="outline" className="text-xs">
              {data.conversation.channel}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Integration</p>
            <Badge variant="outline" className="text-xs">
              {data.conversation.integration}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(data.conversation.createdAt)}</span>
        </div>

        {Object.keys(data.conversation.tags).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(data.conversation.tags).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {key}: {value}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Transcript ({sortedMessages.length} messages)
        </h4>

        <div className="space-y-0 max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-muted/10">
          {sortedMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages in this conversation
            </p>
          ) : (
            <div className="space-y-4 font-mono text-sm leading-relaxed">
              {sortedMessages.map((message, idx) => {
                const speaker = message.direction === "incoming" ? "User" : "Bot";
                const contentLines = formatMessageContent(message);

                return (
                  <div key={message.id} className="space-y-1">
                    {contentLines.map((line, lineIdx) => (
                      <div key={`${idx}-${lineIdx}`}>
                        {lineIdx === 0 ? (
                          <div>
                            <span className={`font-semibold ${
                              message.direction === "incoming"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-green-600 dark:text-green-400"
                            }`}>
                              {speaker}:
                            </span>
                            <span className="ml-2">{line}</span>
                          </div>
                        ) : (
                          <div className="pl-12 text-muted-foreground">{line}</div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Conversation ID */}
      <div className="pt-4 border-t">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Conversation ID</span>
          <span className="font-mono">{conversationId}</span>
        </div>
      </div>
    </div>
  );
}
