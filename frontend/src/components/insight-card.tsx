import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InsightsConfig, TopologyStats } from "@/types/insights";
import { useNavigate } from "react-router-dom";
import { FolderIcon, LayersIcon, MessageSquareIcon, CheckCircleIcon } from "lucide-react";

interface InsightCardProps {
  config: InsightsConfig;
  stats?: TopologyStats;
  style?: React.CSSProperties;
}

export function InsightCard({ config, stats, style }: InsightCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <Badge variant="outline" className="text-xs font-normal border-green-200 text-green-700 bg-green-50">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          {Math.round(confidence * 100)}% confidence
        </Badge>
      );
    } else if (confidence >= 0.6) {
      return (
        <Badge variant="outline" className="text-xs font-normal border-amber-200 text-amber-700 bg-amber-50">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          {Math.round(confidence * 100)}% confidence
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs font-normal border-red-200 text-red-700 bg-red-50">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          {Math.round(confidence * 100)}% confidence
        </Badge>
      );
    }
  };

  return (
    <Card
      className="group relative p-5 cursor-pointer transition-all duration-200 hover:border-blue-400/50 border-border/50"
      style={style}
      onClick={() => {
        navigate(`/insights/${config.key}`);
      }}
    >
      <div className="space-y-4">
        {/* Question - Most prominent */}
        <div>
          <h3 className="font-medium text-base leading-snug line-clamp-2 text-foreground">
            {config.analytical_question}
          </h3>
        </div>

        {/* Agent Description */}
        <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
          {config.agent_description}
        </p>

        {/* Stats Grid */}
        {stats && (
          <div className="flex flex-wrap gap-2 pt-1">
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
            {stats.avg_category_confidence > 0 && getConfidenceBadge(stats.avg_category_confidence)}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/30">
          <span className="text-xs text-muted-foreground/70">{formatDate(config.created_at)}</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-xs font-mono text-muted-foreground/70">{config.id}</span>
        </div>
      </div>
    </Card>
  );
}
