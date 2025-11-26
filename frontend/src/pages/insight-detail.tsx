import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightDetailHeader } from "@/components/insight-detail-header";
import { EditConfigDialog } from "@/components/edit-config-dialog";
import { CategoriesView } from "@/components/categories-view";
import { WorkflowStatusBanner } from "@/components/workflow-status-banner";
import { getConfig, getTopologyStats, updateConfig } from "@/services/insights";
import type { InsightsConfig, TopologyStats } from "@/types/insights";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export default function InsightDetail() {
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<InsightsConfig | null>(null);
  const [stats, setStats] = useState<TopologyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!configId) {
      setError("No config ID provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [configData, statsData] = await Promise.all([
        getConfig(configId),
        getTopologyStats(configId),
      ]);

      if (!configData) {
        setError("Insight not found");
      } else {
        setConfig(configData);
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      setError("Failed to load insight details");
    } finally {
      setIsLoading(false);
    }
  }, [configId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleWorkflowComplete = useCallback(async () => {
    // Refresh stats when workflow completes
    if (configId) {
      const statsData = await getTopologyStats(configId);
      setStats(statsData);
    }
  }, [configId]);

  const handleUpdate = async (updates: Partial<InsightsConfig>) => {
    if (!configId) return;

    try {
      // Call API to persist changes
      await updateConfig(configId, updates);

      // Fetch fresh data to ensure consistency
      const updatedConfig = await getConfig(configId);
      if (updatedConfig) {
        setConfig(updatedConfig);
      }

      toast.success("Configuration updated successfully");
    } catch (err) {
      console.error("Failed to update config:", err);
      toast.error("Failed to save changes. Please try again.");
      throw err;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-3/4 max-w-2xl" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {!isLoading && !error && config && (
        <>
          <div className="space-y-6">
            {/* Config Header */}
            <InsightDetailHeader
              config={config}
              stats={stats || undefined}
              onEditClick={() => setIsEditDialogOpen(true)}
            />

            {/* Workflow Status */}
            <WorkflowStatusBanner
              configId={config.key}
              onWorkflowComplete={handleWorkflowComplete}
            />

            {/* Categories and Subcategories */}
            <CategoriesView configId={config.key} />
          </div>

          {/* Edit Dialog */}
          <EditConfigDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            config={config}
            onSave={handleUpdate}
          />
        </>
      )}
    </div>
  );
}
