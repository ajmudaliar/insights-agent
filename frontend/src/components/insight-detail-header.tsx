import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { InsightsConfig, TopologyStats } from "@/types/insights";
import { Calendar, Hash, Activity, Settings2, ChevronDown, Filter, FolderIcon, LayersIcon, MessageSquareIcon } from "lucide-react";

interface InsightDetailHeaderProps {
  config: InsightsConfig;
  stats?: TopologyStats;
}

export function InsightDetailHeader({ config, stats }: InsightDetailHeaderProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const hasFilterableAttributes = config.attributes?.some(attr => attr.filter_by) || false;

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {config.analytical_question}
          </h1>

          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            {config.agent_description}
          </p>
        </div>

        {/* Primary metadata row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(config.created_at)}</span>
          </div>

          <div className="h-3 w-px bg-border" />

          <div className="flex items-center gap-1.5">
            <Hash className="h-3 w-3" />
            <span className="font-mono">{config.key}</span>
          </div>

          {hasFilterableAttributes && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Filter className="h-3 w-3" />
                <span>Filterable</span>
              </div>
            </>
          )}

          <div className="h-3 w-px bg-border" />

          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span>Active</span>
          </div>
        </div>

        {/* Stats badges */}
        {stats && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs font-normal border-border/50 text-muted-foreground">
              <FolderIcon className="w-3 h-3 mr-1" />
              {stats.total_categories} {stats.total_categories === 1 ? "category" : "categories"}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal border-border/50 text-muted-foreground">
              <LayersIcon className="w-3 h-3 mr-1" />
              {stats.total_subcategories} {stats.total_subcategories === 1 ? "subcategory" : "subcategories"}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal border-border/50 text-muted-foreground">
              <MessageSquareIcon className="w-3 h-3 mr-1" />
              {stats.total_conversations} {stats.total_conversations === 1 ? "conversation" : "conversations"}
            </Badge>
          </div>
        )}

        {/* Collapsible Details Section */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-muted-foreground hover:text-foreground -ml-2 h-7"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${
                  isDetailsOpen ? "rotate-180" : ""
                }`}
              />
              {isDetailsOpen ? "Hide Details" : "Show Details"}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 pt-2">
            {/* Summary Prompt */}
            {config.summary_prompt && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  <span>Summary Prompt</span>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed pl-5">
                  {config.summary_prompt}
                </p>
              </div>
            )}

            {/* Clustering Focus */}
            {config.clustering_focus && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Settings2 className="h-3 w-3" />
                  <span>Clustering Focus</span>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed pl-5">
                  {config.clustering_focus}
                </p>
              </div>
            )}

            {/* Extract Features */}
            {config.extract_features && config.extract_features.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Settings2 className="h-3 w-3" />
                  <span>Extract Features ({config.extract_features.length})</span>
                </div>
                <div className="pl-5 flex flex-wrap gap-2">
                  {config.extract_features.map((feature, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="h-5 text-[10px] px-2 py-0"
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Attributes */}
            {config.attributes && config.attributes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Settings2 className="h-3 w-3" />
                  <span>Attributes ({config.attributes.length})</span>
                </div>
                <div className="pl-5 space-y-2">
                  {config.attributes.map((attr, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground/90">
                          {attr.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-4 text-[10px] px-1 py-0"
                        >
                          {attr.type}
                        </Badge>
                        {attr.filter_by && (
                          <Badge
                            variant="secondary"
                            className="h-4 text-[10px] px-1 py-0"
                          >
                            filterable
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/70">
                        {attr.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-2 border-t space-y-1">
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60">
                <span>Created: {formatDateTime(config.createdAt)}</span>
                <div className="h-2 w-px bg-border" />
                <span>Updated: {formatDateTime(config.updatedAt)}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}

