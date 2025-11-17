import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationCard } from "@/components/conversation-card";
import { getConversationsForCategory } from "@/services/insights";
import type { Category, Subcategory, ConversationWithCategory } from "@/types/insights";
import { X } from "lucide-react";

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
  const item = subcategory || category;
  const isSubcategory = !!subcategory;
  
  const [conversations, setConversations] = useState<ConversationWithCategory[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // Fetch conversations when category/subcategory changes
  useEffect(() => {
    const loadConversations = async () => {
      if (!category || !open) {
        setConversations([]);
        return;
      }

      try {
        setIsLoadingConversations(true);
        setConversationsError(null);

        const data = await getConversationsForCategory(
          category.configId,
          category.key,
          subcategory?.key
        );
        
        setConversations(data);
      } catch (err) {
        console.error("Failed to load conversations:", err);
        setConversationsError("Failed to load conversations");
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [category, subcategory, open]);

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
      <SheetContent className="w-[625px] sm:max-w-[625px] p-0">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <SheetHeader className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {isSubcategory ? "Subcategory" : "Category"}
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

          {/* Category Type */}
          {item.category_type && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category Type
              </h3>
              <Badge variant="outline" className="text-xs">
                {item.category_type}
              </Badge>
            </div>
          )}

          {/* Conversations Section */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Conversations
              </h3>
              <span className="text-xs text-muted-foreground">
                {isLoadingConversations ? "..." : conversations.length}
              </span>
            </div>

            {/* Loading State */}
            {isLoadingConversations && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoadingConversations && conversationsError && (
              <p className="text-sm text-destructive">{conversationsError}</p>
            )}

            {/* Empty State */}
            {!isLoadingConversations && !conversationsError && conversations.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No conversations found for this {isSubcategory ? 'subcategory' : 'category'}
                </p>
              </div>
            )}

            {/* Conversations List */}
            {!isLoadingConversations && !conversationsError && conversations.length > 0 && (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.conversationId}
                    conversation={conversation}
                  />
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
              <span className="text-xs text-muted-foreground">Category Index</span>
              <span className="text-xs font-mono">{item.categoryIndex}</span>
            </div>
            
            {isSubcategory && subcategory && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Subcategory Index</span>
                <span className="text-xs font-mono">{subcategory.subcategoryIndex}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">ID</span>
              <span className="text-xs font-mono truncate ml-4">{item.key}</span>
            </div>
          </div>

          {/* Parent Category (for subcategories) */}
          {isSubcategory && category && (
            <div className="pt-4 border-t space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Parent Category
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

