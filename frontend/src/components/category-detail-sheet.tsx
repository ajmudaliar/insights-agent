import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Topic, Subtopic } from "@/types/insights";
import { X, ChevronRight } from "lucide-react";
import { ConversationDetail } from "@/components/conversation-detail";

interface CategoryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Topic | null;
  subcategory?: Subtopic | null;
}

export function CategoryDetailSheet({
  open,
  onOpenChange,
  category,
  subcategory,
}: CategoryDetailSheetProps) {
  const item = subcategory || category;
  const isSubtopic = !!subcategory;
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  if (!item) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Show conversation detail view if a conversation is selected
  if (selectedConversationId) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[625px] sm:max-w-[625px] p-0">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <SheetHeader className="flex-1">
              <SheetTitle className="text-lg font-semibold text-left">
                Conversation
              </SheetTitle>
            </SheetHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-6 py-6 overflow-y-auto max-h-[calc(100vh-80px)]">
            <ConversationDetail
              conversationId={selectedConversationId}
              onBack={() => setSelectedConversationId(null)}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Show topic/subtopic detail view
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[625px] sm:max-w-[625px] p-0">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <SheetHeader className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {isSubtopic ? "Subtopic" : "Topic"}
              </Badge>
            </div>
            <SheetTitle className="text-lg font-semibold text-left">
              {item.name}
            </SheetTitle>
          </SheetHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </h3>
            <p className="text-sm leading-relaxed">{item.description}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Conversations</p>
              <p className="text-2xl font-semibold tabular-nums">
                {item.conversationCount}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Percentage</p>
              <p className="text-2xl font-semibold tabular-nums">
                {item.percentage ? `${item.percentage.toFixed(1)}%` : "-"}
              </p>
            </div>
          </div>

          {/* Conversations List */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Conversations
              </h3>
              <span className="text-xs text-muted-foreground">
                {item.conversationIds.length}
              </span>
            </div>

            {item.conversationIds.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No conversations found for this {isSubtopic ? "subtopic" : "topic"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {item.conversationIds.map((convId) => (
                  <button
                    key={convId}
                    onClick={() => setSelectedConversationId(convId)}
                    className="w-full px-3 py-2.5 bg-muted/30 hover:bg-muted/50 rounded text-left flex items-center justify-between group transition-colors"
                  >
                    <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground">
                      {convId}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Created</span>
              <span className="text-xs">{formatDate(item.created_at)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {isSubtopic ? "Topic" : "Topic"} Index
              </span>
              <span className="text-xs font-mono">{item.topicIndex}</span>
            </div>

            {isSubtopic && subcategory && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Subtopic Index</span>
                <span className="text-xs font-mono">{subcategory.subtopicIndex}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">ID</span>
              <span className="text-xs font-mono truncate ml-4">{item.key}</span>
            </div>
          </div>

          {/* Parent Topic (for subtopics) */}
          {isSubtopic && category && (
            <div className="pt-4 border-t space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Parent Topic
              </h3>
              <div className="rounded-md bg-muted/30 p-3">
                <p className="text-sm font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {category.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
