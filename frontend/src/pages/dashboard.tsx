import { CreateInsightSheet } from "@/components/create-insight-sheet";
import { InsightCard } from "@/components/insight-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listConfigs } from "@/services/insights";
import type { InsightsConfig } from "@/types/insights";
import { Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const [configs, setConfigs] = useState<InsightsConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const data = await listConfigs();
      setConfigs(data);
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

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground">
            Analyze conversations and discover patterns with AI-powered insights
          </p>
        </div>
        <Button
          onClick={() => setSheetOpen(true)}
          size="lg"
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Insight
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </Card>
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
          <h2 className="text-2xl font-semibold mb-2">No insights yet</h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Create your first insight to start analyzing conversations and discovering patterns in your bot interactions.
          </p>
          <Button
            onClick={() => setSheetOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Your First Insight
          </Button>
        </div>
      )}

      {/* Insights Grid */}
      {!isLoading && configs.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-500">
          {configs.map((config, index) => (
            <InsightCard
              key={config.key}
              config={config}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Create Sheet */}
      <CreateInsightSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
