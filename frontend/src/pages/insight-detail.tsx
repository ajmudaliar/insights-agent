import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightDetailHeader } from "@/components/insight-detail-header";
import { CategoriesTable } from "@/components/categories-table";
import { getConfig } from "@/services/insights";
import type { InsightsConfig } from "@/types/insights";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function InsightDetail() {
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<InsightsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, [configId]);

  const loadConfig = async () => {
    if (!configId) {
      setError("No config ID provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getConfig(configId);
      if (!data) {
        setError("Insight not found");
      } else {
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      setError("Failed to load insight details");
    } finally {
      setIsLoading(false);
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
        <div className="space-y-8">
          {/* Config Header */}
          <InsightDetailHeader config={config} />

          {/* Categories Table */}
          <CategoriesTable configId={config.key} />
        </div>
      )}
    </div>
  );
}

