import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, Subcategory, ConversationCategory, ConversationFeatures } from "@/types/insights";
import { getConversationCategories, getConversationFeatures } from "@/services/insights";
import { ConversationDetail } from "@/components/conversation-detail";
import { ConversationListItem } from "@/components/conversation-list-item";
import { ArrowLeft } from "lucide-react";

interface CategoryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  subcategory?: Subcategory | null;
}

export function CategoryDetailSheet({
  open,
  onOpenChange,
  category,
  subcategory,
}: CategoryDetailSheetProps) {
  const [assignments, setAssignments] = useState<ConversationCategory[]>([]);
  const [features, setFeatures] = useState<ConversationFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ConversationCategory | null>(null);

  const item = subcategory || category;
  const isSubcategory = !!subcategory;

  useEffect(() => {
    if (!open || !item) {
      setAssignments([]);
      setFeatures([]);
      setSelectedAssignment(null);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load assignments and features in parallel
        const [allAssignments, allFeatures] = await Promise.all([
          getConversationCategories(item.config_id),
          getConversationFeatures(item.config_id),
        ]);

        // Filter by category or subcategory
        const filtered = isSubcategory
          ? allAssignments.filter(a => a.subcategory_id === item.key)
          : allAssignments.filter(a => a.category_id === item.key);

        setAssignments(filtered);
        setFeatures(allFeatures);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [open, item, isSubcategory]);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[625px] sm:max-w-[625px] p-0 flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {isSubcategory ? "Subcategory" : "Category"}
              </Badge>
            </div>
            <SheetTitle className="text-lg font-semibold text-left">
              {item.name}
            </SheetTitle>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Back Button (shown when conversation is selected) */}
            {selectedAssignment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAssignment(null)}
                className="gap-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to conversations
              </Button>
            )}

            {/* Show either conversation list or conversation detail */}
            {selectedAssignment ? (
              <ConversationDetail
                conversationId={selectedAssignment.conversation_id}
                configId={item.config_id}
                assignment={selectedAssignment}
                isSubcategory={isSubcategory}
                features={features.find(f => f.key === selectedAssignment.conversation_id) || null}
              />
            ) : (
              <>
                {/* Summary */}
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground/70">Summary</h3>
                  <p className="text-sm leading-relaxed">{item.summary}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Conversations</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {item.conversation_count}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Percentage</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {item.frequency_pct.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Conversations List */}
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xs font-medium text-muted-foreground/70">Conversations</h3>
                    <span className="text-xs text-muted-foreground">
                      {assignments.length}
                    </span>
                  </div>

                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No conversations found for this {isSubcategory ? "subcategory" : "category"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <ConversationListItem
                          key={assignment.conversation_id}
                          assignment={assignment}
                          isSubcategory={isSubcategory}
                          features={features.find(f => f.key === assignment.conversation_id) || null}
                          onClick={() => setSelectedAssignment(assignment)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="text-xs">{formatDate(item.createdAt)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">ID</span>
                    <span className="text-xs font-mono truncate ml-4">{item.key}</span>
                  </div>
                </div>

                {/* Parent Category (for subcategories) */}
                {isSubcategory && category && (
                  <div className="pt-4 border-t space-y-2">
                    <h3 className="text-xs font-medium text-muted-foreground/70">Parent Category</h3>
                    <div className="rounded-md bg-muted/30 p-3">
                      <p className="text-sm font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {category.summary}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
