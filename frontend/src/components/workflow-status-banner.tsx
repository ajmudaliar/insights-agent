import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, XCircle } from "lucide-react";
import type { WorkflowStatus } from "@/services/insights";
import { startMasterWorkflow, getMasterWorkflowStatus, getWorkflowById } from "@/services/insights";

interface WorkflowStatusBannerProps {
  configId: string;
  onWorkflowComplete?: () => void;
}

export function WorkflowStatusBanner({ configId, onWorkflowComplete }: WorkflowStatusBannerProps) {
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMasterWorkflowStatus(configId).then((status) => {
      setWorkflow(status);
      setIsLoading(false);
    });
  }, [configId]);

  useEffect(() => {
    if (!workflow || !["pending", "in_progress", "listening"].includes(workflow.status)) return;

    const interval = setInterval(async () => {
      const updated = await getWorkflowById(workflow.id);
      if (updated) {
        setWorkflow(updated);
        if (updated.status === "completed") onWorkflowComplete?.();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [workflow?.id, workflow?.status, onWorkflowComplete]);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const { workflowId } = await startMasterWorkflow(configId);
      const status = await getWorkflowById(workflowId);
      setWorkflow(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start workflow");
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) return null;

  // Not started or error starting
  if (!workflow) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${error ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}>
        <div className="flex items-center gap-2">
          {error ? <XCircle className="h-4 w-4 text-red-600" /> : <Play className="h-4 w-4 text-blue-600" />}
          <span className={`text-sm ${error ? "text-red-900" : "text-blue-900"}`}>{error || "Analysis not started"}</span>
        </div>
        <Button size="sm" onClick={handleStart} disabled={isStarting} className="gap-2">
          {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {isStarting ? "Starting..." : "Start Analysis"}
        </Button>
      </div>
    );
  }

  // Running
  if (["pending", "in_progress", "listening"].includes(workflow.status)) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50">
        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
        <span className="text-sm text-amber-900">Running...</span>
      </div>
    );
  }

  // Failed
  if (["failed", "timedout", "cancelled"].includes(workflow.status)) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-900">Analysis {workflow.status}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleStart} disabled={isStarting} className="gap-2">
          {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Retry
        </Button>
      </div>
    );
  }

  return null;
}
