import { Badge } from "@/components/ui/badge";
import type { ConversationCategory, ConversationFeatures } from "@/types/insights";

interface ConversationListItemProps {
  assignment: ConversationCategory;
  isSubcategory?: boolean;
  features: ConversationFeatures | null;
  onClick: () => void;
}

export function ConversationListItem({ assignment, isSubcategory, features, onClick }: ConversationListItemProps) {

  const getConfidenceColor = (confidence: number) => {
    const percentage = confidence * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const confidence = isSubcategory ? assignment.subcategory_confidence : assignment.category_confidence;

  // Parse transcript to count messages
  const messageCount = features?.transcript ? features.transcript.split('\n').filter(line =>
    line.startsWith('User: ') || line.startsWith('Bot: ')
  ).length : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 border border-border/40 rounded-md bg-white hover:bg-accent/5 transition-colors duration-150"
    >
      <div className="flex items-center gap-4">
        {/* Conversation ID */}
        <span className="text-xs font-mono text-muted-foreground/70 truncate">
          {assignment.conversation_id.slice(0, 20)}...
        </span>

        {/* Right side: Outcome + Message Count + Confidence */}
        <div className="ml-auto flex items-center gap-3">
          {/* Outcome */}
          {features?.conversation_outcome && (
            <Badge
              variant={
                features.conversation_outcome === 'satisfied' ? 'default' :
                features.conversation_outcome === 'unsatisfied' ? 'destructive' :
                'secondary'
              }
              className={`text-[10px] font-normal px-1.5 py-0 h-5 ${
                features.conversation_outcome === 'satisfied'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : ''
              }`}
            >
              {features.conversation_outcome}
            </Badge>
          )}

          {/* Message Count */}
          {messageCount > 0 && (
            <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 h-5 border-border/40">
              {messageCount}
            </Badge>
          )}

          {/* Confidence */}
          {confidence !== undefined && (
            <div className="flex items-center gap-2">
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
    </button>
  );
}
