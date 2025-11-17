import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Search, FileText, Check, Lock } from "lucide-react";
import { getPipelineStatus } from "@/services/insights";
import { AnalyzeConversationsSheet } from "./analyze-conversations-sheet";
import { DiscoverPatternsSheet } from "./discover-patterns-sheet";
import { GenerateReportSheet } from "./generate-report-sheet";
import { cn } from "@/lib/utils";

interface PipelineStepperProps {
  configId: string;
  onStepComplete: () => void;
}

type StepStatus = "completed" | "ready" | "locked" | "running";

interface StepState {
  status: StepStatus;
  count?: number;
}

export function PipelineStepper({ configId, onStepComplete }: PipelineStepperProps) {
  const [step1State, setStep1State] = useState<StepState>({ status: "ready" });
  const [step2State, setStep2State] = useState<StepState>({ status: "locked" });
  const [step3State, setStep3State] = useState<StepState>({ status: "locked" });

  const [isStep1SheetOpen, setIsStep1SheetOpen] = useState(false);
  const [isStep2SheetOpen, setIsStep2SheetOpen] = useState(false);
  const [isStep3SheetOpen, setIsStep3SheetOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const status = await getPipelineStatus(configId);

      // Update step 1 (Analyze Conversations)
      if (status.analyzedConversations) {
        setStep1State({ status: "completed", count: status.summariesCount });
      } else {
        setStep1State({ status: "ready" });
      }

      // Update step 2 (Discover Patterns)
      if (status.discoveredPatterns) {
        setStep2State({ status: "completed", count: status.categoriesCount });
      } else if (status.analyzedConversations) {
        setStep2State({ status: "ready" });
      } else {
        setStep2State({ status: "locked" });
      }

      // Update step 3 (Generate Report)
      if (status.generatedReport) {
        setStep3State({ status: "completed" });
      } else if (status.discoveredPatterns) {
        setStep3State({ status: "ready" });
      } else {
        setStep3State({ status: "locked" });
      }
    } catch (error) {
      console.error("Failed to load pipeline status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep1Success = (summaryCount: number) => {
    setStep1State({ status: "completed", count: summaryCount });
    setStep2State({ status: "ready" });
    onStepComplete();
  };

  const handleStep2Success = (categoryCount: number) => {
    setStep2State({ status: "completed", count: categoryCount });
    setStep3State({ status: "ready" });
    onStepComplete();
  };

  const handleStep3Success = () => {
    setStep3State({ status: "completed" });
    onStepComplete();
  };

  const getStepCircleContent = (status: StepStatus, icon: React.ReactNode) => {
    if (status === "completed") {
      return <Check className="h-3.5 w-3.5 text-white" />;
    }
    if (status === "running") {
      return <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />;
    }
    if (status === "locked") {
      return <Lock className="h-3 w-3 text-muted-foreground" />;
    }
    return icon;
  };

  const getStepCircleClass = (status: StepStatus) => {
    if (status === "completed") {
      return "bg-green-600 border-green-600";
    }
    if (status === "running") {
      return "bg-blue-600 border-blue-600";
    }
    if (status === "ready") {
      return "bg-blue-600 border-blue-600";
    }
    return "bg-background border-border";
  };

  const getStepBadge = (status: StepStatus) => {
    if (status === "completed") {
      return (
        <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-400 border-0 text-[10px] h-5 px-2">
          Completed
        </Badge>
      );
    }
    if (status === "running") {
      return (
        <Badge variant="secondary" className="bg-blue-600/10 text-blue-700 dark:text-blue-400 border-0 text-[10px] h-5 px-2">
          In Progress
        </Badge>
      );
    }
    if (status === "ready") {
      return (
        <Badge variant="secondary" className="bg-blue-600/10 text-blue-700 dark:text-blue-400 border-0 text-[10px] h-5 px-2">
          Ready
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-[10px] h-5 px-2">
        Pending
      </Badge>
    );
  };

  const getConnectorClass = (prevStatus: StepStatus) => {
    if (prevStatus === "completed") {
      return "bg-green-600";
    }
    return "bg-border";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Vertical Stepper */}
      <div className="space-y-0">
        {/* Step 1: Analyze Conversations */}
        <div className="relative">
          <div className="flex items-start gap-2.5 pb-6">
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                getStepCircleClass(step1State.status)
              )}
            >
              {getStepCircleContent(
                step1State.status,
                <MessageSquare className="h-3.5 w-3.5 text-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Step 1</p>
                {getStepBadge(step1State.status)}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        step1State.status === "locked" ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      Summarize
                    </p>
                    {step1State.status === "completed" && step1State.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        · {step1State.count} conversation{step1State.count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Process and summarize conversations</p>
                </div>
                <Button
                  variant={step1State.status === "completed" ? "ghost" : "default"}
                  size="sm"
                  onClick={() => setIsStep1SheetOpen(true)}
                  disabled={step1State.status === "running"}
                  className="h-7 text-xs shrink-0"
                >
                  {step1State.status === "completed" ? "Run Again" : "Configure"}
                </Button>
              </div>
            </div>
          </div>

          {/* Connector Line (vertical) */}
          <div className="absolute left-4 top-8 w-[2px] h-[calc(100%-32px)]">
            <div className={cn("w-full h-full transition-all", getConnectorClass(step1State.status))} />
          </div>
        </div>

        {/* Step 2: Discover Patterns */}
        <div className="relative">
          <div className="flex items-start gap-2.5 pb-6">
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                getStepCircleClass(step2State.status)
              )}
            >
              {getStepCircleContent(
                step2State.status,
                <Search className="h-3.5 w-3.5 text-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Step 2</p>
                {getStepBadge(step2State.status)}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        step2State.status === "locked" ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      Categorize
                    </p>
                    {step2State.status === "completed" && step2State.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        · {step2State.count} categor{step2State.count !== 1 ? "ies" : "y"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Group conversations into patterns</p>
                </div>
                <Button
                  variant={step2State.status === "completed" ? "ghost" : "default"}
                  size="sm"
                  onClick={() => setIsStep2SheetOpen(true)}
                  disabled={step2State.status === "locked" || step2State.status === "running"}
                  className="h-7 text-xs shrink-0"
                >
                  {step2State.status === "locked"
                    ? "Locked"
                    : step2State.status === "completed"
                    ? "Run Again"
                    : "Configure"}
                </Button>
              </div>
            </div>
          </div>

          {/* Connector Line (vertical) */}
          <div className="absolute left-4 top-8 w-[2px] h-[calc(100%-32px)]">
            <div className={cn("w-full h-full transition-all", getConnectorClass(step2State.status))} />
          </div>
        </div>

        {/* Step 3: Generate Report */}
        <div className="relative">
          <div className="flex items-start gap-2.5">
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                getStepCircleClass(step3State.status)
              )}
            >
              {getStepCircleContent(
                step3State.status,
                <FileText className="h-3.5 w-3.5 text-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Step 3</p>
                {getStepBadge(step3State.status)}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step3State.status === "locked" ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    Report
                  </p>
                  <p className="text-xs text-muted-foreground">Generate insights and recommendations</p>
                </div>
                <Button
                  variant={step3State.status === "completed" ? "ghost" : "default"}
                  size="sm"
                  onClick={() => setIsStep3SheetOpen(true)}
                  disabled={step3State.status === "locked" || step3State.status === "running"}
                  className="h-7 text-xs shrink-0"
                >
                  {step3State.status === "locked"
                    ? "Locked"
                    : step3State.status === "completed"
                    ? "Run Again"
                    : "Configure"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sheets */}
      <AnalyzeConversationsSheet
        open={isStep1SheetOpen}
        onOpenChange={setIsStep1SheetOpen}
        onSuccess={handleStep1Success}
        configId={configId}
      />
      <DiscoverPatternsSheet
        open={isStep2SheetOpen}
        onOpenChange={setIsStep2SheetOpen}
        onSuccess={handleStep2Success}
        configId={configId}
      />
      <GenerateReportSheet
        open={isStep3SheetOpen}
        onOpenChange={setIsStep3SheetOpen}
        onSuccess={handleStep3Success}
        configId={configId}
      />
    </>
  );
}

