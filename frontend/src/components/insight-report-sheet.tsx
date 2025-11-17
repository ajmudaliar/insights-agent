import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getInsightsReport } from "@/services/insights";
import type { InsightsReport } from "@/types/insights";
import { FileText, BarChart3, MessageSquare, Timer, AlertCircle } from "lucide-react";

interface InsightReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
}

export function InsightReportSheet({
  open,
  onOpenChange,
  configId,
}: InsightReportSheetProps) {
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && configId) {
      loadReport();
    }
  }, [open, configId]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const data = await getInsightsReport(configId);
      setReport(data);
    } catch (error) {
      console.error("Failed to load report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Insights Report</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Comprehensive analysis findings and recommendations
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          {isLoading && (
            <div className="space-y-6 pl-4 pr-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Separator />
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}

          {!isLoading && !report && (
            <Alert className="ml-4 mr-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No report available yet. Complete all analysis phases to generate a report.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && report && (
            <div className="space-y-6 pb-6 pl-4 pr-6">
              {/* Metadata Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-3 w-3" />
                    <span>Generated {formatDate(report.generated_at)}</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <Badge variant="secondary" className="h-5 text-[10px] px-1.5 py-0">
                    {report.metadata.analysis_mode}
                  </Badge>
                  <div className="h-3 w-px bg-border" />
                  <span>{formatDuration(report.metadata.generation_duration_ms)}</span>
                </div>
              </div>

              {/* Statistics Overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    <span>Conversations</span>
                  </div>
                  <p className="text-xl font-semibold">{report.total_conversations}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BarChart3 className="h-3 w-3" />
                    <span>Categories</span>
                  </div>
                  <p className="text-xl font-semibold">{report.categories_count}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>Subcategories</span>
                  </div>
                  <p className="text-xl font-semibold">{report.subcategories_count}</p>
                </div>
              </div>

              <Separator />

              {/* Executive Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Executive Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {report.executive_summary}
                </p>
              </div>

              <Separator />

              {/* Key Patterns */}
              {report.key_patterns && report.key_patterns.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">Key Patterns</h3>
                    <ul className="space-y-2">
                      {report.key_patterns.map((pattern, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground leading-relaxed flex gap-2"
                        >
                          <span className="text-muted-foreground/50 mt-0.5">•</span>
                          <span>{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                </>
              )}

              {/* Category Insights */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Category Insights</h3>
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {report.category_insights.map((insight) => (
                    <AccordionItem
                      key={insight.categoryId}
                      value={insight.categoryId}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-sm font-medium">{insight.categoryName}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-1 space-y-4">
                        {/* Narrative */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Overview
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {insight.narrative}
                          </p>
                        </div>

                        {/* Key Findings */}
                        {insight.key_findings && insight.key_findings.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Key Findings
                            </p>
                            <ul className="space-y-1.5">
                              {insight.key_findings.map((finding, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-muted-foreground leading-relaxed flex gap-2"
                                >
                                  <span className="text-muted-foreground/50 mt-0.5">•</span>
                                  <span>{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Metrics */}
                        <div className="pt-2">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Avg Turn Count</p>
                            <p className="text-sm font-medium">
                              {insight.avg_turn_count.toFixed(1)}
                            </p>
                          </div>
                        </div>

                        {/* Top Attributes */}
                        {insight.top_attributes &&
                          Object.keys(insight.top_attributes).length > 0 && (
                            <div className="space-y-2 pt-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Top Attributes
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(insight.top_attributes).map(([key, value]) => (
                                  <Badge
                                    key={key}
                                    variant="secondary"
                                    className="text-[10px] px-2 py-0.5"
                                  >
                                    {key}: {JSON.stringify(value)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Recommendations */}
              {report.recommendations && report.recommendations.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">Recommendations</h3>
                    <ul className="space-y-2">
                      {report.recommendations.map((recommendation, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground leading-relaxed flex gap-2"
                        >
                          <span className="text-muted-foreground/50 mt-0.5">•</span>
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

