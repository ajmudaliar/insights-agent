import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import type { ConversationCategory, ConversationFeatures } from "@/types/insights";

interface ConversationDetailProps {
  conversationId: string;
  configId: string;
  assignment: ConversationCategory;
  isSubcategory?: boolean;
  features: ConversationFeatures | null;
}

export function ConversationDetail({ conversationId, configId, assignment, isSubcategory, features }: ConversationDetailProps) {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // Parse transcript into messages
  const parseTranscript = (transcript: string) => {
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

  const messages = features?.transcript ? parseTranscript(features.transcript) : [];

  const getConfidenceColor = (confidence: number) => {
    const percentage = confidence * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const confidence = isSubcategory ? assignment.subcategory_confidence : assignment.category_confidence;
  const reasoning = isSubcategory ? assignment.subcategory_reasoning : assignment.category_reasoning;

  return (
    <div className="space-y-6">
      {/* Conversation Header Info */}
      <div className="border border-border/40 rounded-md bg-white p-4">
        <div className="flex items-center gap-4">
          {/* Conversation ID */}
          <span className="text-xs font-mono text-muted-foreground/70 truncate">
            {conversationId}
          </span>

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
                <div className="mt-2 space-y-2">
                  {messages.map((message, idx) => (
                    <div
                      key={idx}
                      className={`px-2.5 py-2 rounded text-xs ${
                        message.role === 'user'
                          ? 'bg-muted/50'
                          : 'bg-blue-50 border border-blue-100'
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
                      <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap">
                        {message.text}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </div>
  );
}
