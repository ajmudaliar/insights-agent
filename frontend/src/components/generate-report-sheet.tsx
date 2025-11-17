import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { step4GenerateReport } from "@/services/insights";

interface GenerateReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (reportId: string) => void;
  configId: string;
}

export function GenerateReportSheet({
  open,
  onOpenChange,
  onSuccess,
  configId,
}: GenerateReportSheetProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isRunning) {
      setError(null);
      onOpenChange(false);
    }
  };

  const handleGenerate = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await step4GenerateReport({ configId });

      console.log("Report generation result:", result);

      // Success!
      setIsRunning(false);
      onSuccess(result.reportId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
      setIsRunning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Generate Report</SheetTitle>
          <SheetDescription>
            Create narrative insights and recommendations based on your analysis.
          </SheetDescription>
        </SheetHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-6 px-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">What will be generated:</p>
                <ul className="text-sm text-muted-foreground space-y-1.5 ml-1">
                  <li>• Executive summary of all findings</li>
                  <li>• Detailed narrative for each category</li>
                  <li>• Key patterns across conversations</li>
                  <li>• Actionable recommendations</li>
                  <li>• Behavioral metrics aggregation</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This process typically takes 3-5 minutes. The report will aggregate data from
              all categories and generate comprehensive insights using AI.
            </p>
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          <Button onClick={handleGenerate} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
          <SheetClose asChild>
            <Button type="button" variant="outline" disabled={isRunning}>
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

