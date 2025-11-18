import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationCategory, ConversationFeatures, Message } from "@/types/insights";
import { getConversationWithMessages } from "@/services/insights";

interface ConversationDetailProps {
  conversationId: string;
  configId: string;
  assignment: ConversationCategory;
  isSubcategory?: boolean;
}

export function ConversationDetail({ conversationId, configId, assignment, isSubcategory }: ConversationDetailProps) {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [features, setFeatures] = useState<ConversationFeatures | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationCreatedAt, setConversationCreatedAt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [convWithMessages, featuresResult] = await Promise.all([
          getConversationWithMessages(conversationId),
          (async () => {
            const { getConversationFeatures } = await import("@/services/insights");
            const allFeatures = await getConversationFeatures(configId);
            return allFeatures.find(f => f.key === conversationId) || null;
          })(),
        ]);

        if (convWithMessages) {
          setMessages(convWithMessages.messages);
          setConversationCreatedAt(convWithMessages.conversation.createdAt);
        }

        setFeatures(featuresResult);
      } catch (err) {
        console.error("Failed to load conversation data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [conversationId, configId]);

  const getConfidenceColor = (confidence: number) => {
    const percentage = confidence * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const metrics = messages.length > 0 ? {
    turn_count: Math.ceil(messages.length / 2),
    user_message_count: messages.filter(m => m.direction === 'incoming').length,
    bot_message_count: messages.filter(m => m.direction === 'outgoing').length,
  } : null;

  const confidence = isSubcategory ? assignment.subcategory_confidence : assignment.category_confidence;
  const reasoning = isSubcategory ? assignment.subcategory_reasoning : assignment.category_reasoning;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conversation Header Info */}
      <div className="border border-border/40 rounded-md bg-white p-4">
        <div className="flex items-center gap-4">
          {/* Conversation ID */}
          <span className="text-xs font-mono text-muted-foreground/70 truncate">
            {conversationId}
          </span>

          {/* Timestamp */}
          {conversationCreatedAt && (
            <span className="text-xs text-muted-foreground/60">
              {formatDate(conversationCreatedAt)}
            </span>
          )}

          {/* Metrics */}
          {metrics && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
              <span className="tabular-nums">{metrics.turn_count} turns</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="tabular-nums">{metrics.user_message_count}u / {metrics.bot_message_count}b</span>
            </div>
          )}

          {/* Confidence */}
          {confidence !== undefined && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground/70 tabular-nums">
                {(confidence * 100).toFixed(0)}%
              </span>
              <div className="w-16 h-1 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getConfidenceColor(confidence)}`}
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Details */}
      <div className="space-y-6">
        {/* Categorization */}
        {reasoning && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground/70">Reasoning</h4>
            <p className="text-sm text-muted-foreground/80 leading-relaxed italic">
              "{reasoning}"
            </p>
          </div>
        )}

        {/* Intent & Outcome Row */}
        {features && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground/70">Intent</h4>
              <p className="text-sm text-foreground">{features.primary_user_intent}</p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground/70">Outcome</h4>
              <Badge
                variant={
                  features.conversation_outcome === 'satisfied' ? 'default' :
                  features.conversation_outcome === 'unsatisfied' ? 'destructive' :
                  'secondary'
                }
                className="text-xs font-normal"
              >
                {features.conversation_outcome}
              </Badge>
            </div>
          </div>
        )}

        {/* Key Topics */}
        {features?.key_topics && features.key_topics.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground/70">Topics</h4>
            <div className="flex flex-wrap gap-1.5">
              {features.key_topics.map((topic, idx) => (
                <Badge key={idx} variant="outline" className="text-xs font-normal border-border/40">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Specific Features */}
        {features?.specific_features && Object.keys(features.specific_features).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground/70">Features</h4>
            {Object.entries(features.specific_features).map(([key, values]) => (
              values.length > 0 && (
                <div key={key} className="space-y-1.5">
                  <span className="text-xs text-muted-foreground/60 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {values.map((value, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs font-normal">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Extracted Attributes */}
        {features?.attributes && Object.keys(features.attributes).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground/70">Attributes</h4>
            <div className="space-y-1.5">
              {Object.entries(features.attributes).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-xs text-muted-foreground/60 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        {messages.length > 0 && (
          <div className="space-y-2">
            <Collapsible open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
              <CollapsibleTrigger className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <h4 className="text-xs font-medium text-muted-foreground/70">
                  Transcript ({messages.length})
                </h4>
                {isTranscriptOpen ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-3 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {messages.map((message, idx) => {
                    const hasPayload = message.payload && typeof message.payload === 'object';
                    const text = message.content || (hasPayload && message.payload.text) || '';
                    const options = hasPayload && Array.isArray(message.payload.options) ? message.payload.options : [];

                    return (
                      <div key={message.id || idx} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={message.direction === 'incoming' ? 'default' : 'secondary'}
                            className="text-[10px] font-normal px-1.5 py-0 h-4"
                          >
                            {message.direction === 'incoming' ? 'User' : 'Bot'}
                          </Badge>
                          {message.createdAt && (
                            <span className="text-[10px] text-muted-foreground/50">
                              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          )}
                        </div>

                        <div className={`pl-3 border-l-2 ${
                          message.direction === 'incoming'
                            ? 'border-blue-200'
                            : 'border-purple-200'
                        }`}>
                          {text ? (
                            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                              {text.split('\n').map((line, i) => {
                                const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                return (
                                  <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} className="mb-1 last:mb-0" />
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              {JSON.stringify(message.payload)}
                            </p>
                          )}

                          {options.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {options.map((option: any, optIdx: number) => (
                                <div
                                  key={optIdx}
                                  className="px-2.5 py-1.5 bg-muted/40 border border-border/30 rounded text-xs text-foreground/80"
                                >
                                  {option.label || option.value || JSON.stringify(option)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </div>
  );
}
