import { CreateInsightDialog } from "@/components/create-insight-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listConfigs, getTopologyStats } from "@/services/insights";
import type { InsightsConfig, TopologyStats } from "@/types/insights";
import { Plus, Sparkles, FolderIcon, LayersIcon, MessageSquareIcon, CheckCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<InsightsConfig[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, TopologyStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const data = await listConfigs();
      setConfigs(data);

      // Load stats for each config in parallel
      const statsPromises = data.map(async (config) => {
        const stats = await getTopologyStats(config.key);
        return { configId: config.key, stats };
      });

      const statsResults = await Promise.all(statsPromises);
      const newStatsMap: Record<string, TopologyStats> = {};
      statsResults.forEach(({ configId, stats }) => {
        newStatsMap[configId] = stats;
      });
      setStatsMap(newStatsMap);
    } catch (error) {
      toast.error("Failed to load insights");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSuccess = () => {
    toast.success("Insight created successfully!");
    loadConfigs();
  };

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
          {Math.round(confidence * 100)}%
        </Badge>
      );
    } else if (confidence >= 0.6) {
      return (
        <Badge variant="outline" className="text-xs font-normal border-amber-200 text-amber-700 bg-amber-50">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          {Math.round(confidence * 100)}%
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs font-normal border-red-200 text-red-700 bg-red-50">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          {Math.round(confidence * 100)}%
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground/70">
            Analyze conversations and discover patterns with AI-powered insights
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="default" className="gap-2">
          <Plus className="h-4 w-4" />
          New Insight
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-border/50 rounded-lg p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && configs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl opacity-20 bg-gradient-to-br from-primary to-primary/50 rounded-full" />
            <Sparkles className="relative h-16 w-16 text-muted-foreground/40 mb-6" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No insights yet</h2>
          <p className="text-muted-foreground/70 text-center max-w-md mb-8 text-sm">
            Create your first insight to start analyzing conversations and discovering patterns in your bot
            interactions.
          </p>
          <Button onClick={() => setDialogOpen(true)} size="default" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Insight
          </Button>
        </div>
      )}

      {/* Linear-style Table */}
      {!isLoading && configs.length > 0 && (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <div className="divide-y divide-border/30">
            {configs.map((config) => {
              const stats = statsMap[config.key];
              return (
                <div
                  key={config.key}
                  className="group p-4 hover:bg-accent/30 cursor-pointer transition-all duration-150 ease-out"
                  onClick={() => navigate(`/insights/${config.key}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Main content - takes most space */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Title */}
                      <h3 className="font-medium text-sm leading-tight text-foreground group-hover:text-blue-600 transition-colors duration-150">
                        {config.analytical_question}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground/70 line-clamp-1">{config.agent_description}</p>

                      {/* Stats badges */}
                      {stats && (
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs font-normal border-border/50 text-muted-foreground">
                            <FolderIcon className="w-3 h-3 mr-1" />
                            {stats.total_categories}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-normal border-border/50 text-muted-foreground">
                            <LayersIcon className="w-3 h-3 mr-1" />
                            {stats.total_subcategories}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-normal border-border/50 text-muted-foreground">
                            <MessageSquareIcon className="w-3 h-3 mr-1" />
                            {stats.total_conversations}
                          </Badge>
                          {stats.avg_category_confidence > 0 && getConfidenceBadge(stats.avg_category_confidence)}
                        </div>
                      )}
                    </div>

                    {/* Right side - metadata */}
                    <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground/70 shrink-0">
                      <span>{formatDate(config.created_at)}</span>
                      <span className="font-mono text-muted-foreground/50">{config.key}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateInsightDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleSuccess} />
    </div>
  );
}
