import { useState } from "react";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import type { ConversationWithCategory } from "@/types/insights";

interface ConversationCardProps {
  conversation: ConversationWithCategory;
}

export function ConversationCard({ conversation }: ConversationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    // 10-level color scale from red (0%) to green (100%)
    const percentage = confidence * 100;
    
    if (percentage >= 90) return { badge: 'default', bar: 'bg-green-600', text: 'text-green-700' };
    if (percentage >= 80) return { badge: 'default', bar: 'bg-green-500', text: 'text-green-600' };
    if (percentage >= 70) return { badge: 'default', bar: 'bg-green-400', text: 'text-green-500' };
    if (percentage >= 60) return { badge: 'secondary', bar: 'bg-lime-500', text: 'text-lime-600' };
    if (percentage >= 50) return { badge: 'secondary', bar: 'bg-yellow-500', text: 'text-yellow-600' };
    if (percentage >= 40) return { badge: 'secondary', bar: 'bg-amber-500', text: 'text-amber-600' };
    if (percentage >= 30) return { badge: 'secondary', bar: 'bg-orange-500', text: 'text-orange-600' };
    if (percentage >= 20) return { badge: 'destructive', bar: 'bg-red-500', text: 'text-red-600' };
    if (percentage >= 10) return { badge: 'destructive', bar: 'bg-red-600', text: 'text-red-700' };
    return { badge: 'destructive', bar: 'bg-red-700', text: 'text-red-800' };
  };

  const formatDate = (dateString: string) => {
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
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const parseTranscript = (transcript: string) => {
    // Parse transcript into messages
    // Expected format: lines with "User: " or "Bot: " prefix
    const lines = transcript.split('\n').filter(line => line.trim());
    const messages: Array<{ role: 'user' | 'bot'; text: string }> = [];
    
    lines.forEach(line => {
      if (line.startsWith('User: ')) {
        messages.push({ role: 'user', text: line.substring(6) });
      } else if (line.startsWith('Bot: ')) {
        messages.push({ role: 'bot', text: line.substring(5) });
      }
    });
    
    return messages;
  };

  const messages = parseTranscript(conversation.transcript);
  const metrics = conversation.behavioral_metrics;
  const attributes = conversation.extracted_attributes;
  const assignment = conversation.categoryAssignment;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border/50 rounded-md bg-muted/30 hover:bg-muted/40 transition-colors">
        {/* Collapsed Header */}
        <CollapsibleTrigger className="w-full">
          <div className="px-3 py-2.5 flex items-start gap-3">
            <div className="flex items-center justify-center pt-0.5">
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 text-left">
              {/* Conversation ID, timestamp, and confidence */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {conversation.conversationId}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(conversation.conversation_created_at)}
                </span>
                {assignment?.confidence !== undefined && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs font-medium tabular-nums">
                      {(assignment.confidence * 100).toFixed(0)}%
                    </span>
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getConfidenceColor(assignment.confidence).bar}`}
                        style={{ width: `${assignment.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Key metrics */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">{metrics.turn_count} turns</span>
                <span className="tabular-nums">
                  {metrics.user_message_count} user / {metrics.bot_message_count} bot
                </span>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4 border-t border-border/30 pt-3">
            {/* Categorization Metadata */}
            {assignment && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Categorization
                </h4>
                <div className="space-y-2">
                  {assignment.confidence !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Confidence</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums">
                          {(assignment.confidence * 100).toFixed(0)}%
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getConfidenceColor(assignment.confidence).bar}`}
                            style={{ width: `${assignment.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {assignment.reasoning && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Reasoning</span>
                      <p className="text-xs italic leading-relaxed text-foreground/80">
                        {assignment.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Extracted Attributes */}
            {attributes && Object.keys(attributes).length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Extracted Attributes
                </h4>
                <div className="space-y-2">
                  {Object.entries(attributes).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-2 py-1.5 border-b border-border/30 last:border-0"
                    >
                      <span className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-medium text-right">
                        {typeof value === 'object' 
                          ? JSON.stringify(value) 
                          : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Behavioral Metrics */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Behavioral Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Turn Count</p>
                  <p className="text-base font-medium tabular-nums">{metrics.turn_count}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">User Messages</p>
                  <p className="text-base font-medium tabular-nums">{metrics.user_message_count}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Bot Messages</p>
                  <p className="text-base font-medium tabular-nums">{metrics.bot_message_count}</p>
                </div>
              </div>
            </div>

            {/* Summary Section - Collapsible */}
            <div className="space-y-1.5">
              <Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Summary
                  </h4>
                  {isSummaryOpen ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <p className="text-sm leading-relaxed mt-2">{conversation.summary}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Transcript Section - Collapsible */}
            {messages.length > 0 && (
              <div className="space-y-1.5">
                <Collapsible open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Transcript ({messages.length} messages)
                    </h4>
                    {isTranscriptOpen ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-2 max-h-[300px] overflow-y-auto space-y-2 pr-2">
                      {messages.map((message, idx) => (
                        <div
                          key={idx}
                          className={`px-2.5 py-2 rounded text-xs ${
                            message.role === 'user'
                              ? 'bg-muted/50'
                              : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge
                              variant={message.role === 'user' ? 'default' : 'secondary'}
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {message.role === 'user' ? 'User' : 'Bot'}
                            </Badge>
                          </div>
                          <p className="leading-relaxed text-foreground/90">{message.text}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Metadata footer */}
            <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
              <span>Analyzed {formatDate(conversation.analyzed_at)}</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Created {formatDate(conversation.conversation_created_at)}
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

