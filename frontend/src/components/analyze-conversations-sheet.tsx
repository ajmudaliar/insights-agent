import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { step2GenerateSummaries } from "@/services/insights";

const formSchema = z.object({
  maxConversations: z
    .number()
    .min(1, "Must analyze at least 1 conversation")
    .max(500, "Cannot exceed 500 conversations"),
  maxMessagesPerConversation: z
    .number()
    .min(1, "Must include at least 1 message")
    .max(500, "Cannot exceed 500 messages"),
});

type FormData = z.infer<typeof formSchema>;

interface AnalyzeConversationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (summaryCount: number) => void;
  configId: string;
}

export function AnalyzeConversationsSheet({
  open,
  onOpenChange,
  onSuccess,
  configId,
}: AnalyzeConversationsSheetProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maxConversations: 100,
      maxMessagesPerConversation: 100,
    },
  });

  const handleClose = () => {
    if (!isRunning) {
      form.reset();
      setError(null);
      onOpenChange(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await step2GenerateSummaries({
        configId,
        maxConversations: data.maxConversations,
        maxMessagesPerConversation: data.maxMessagesPerConversation,
      });

      console.log("Summary generation result:", result);

      // Success!
      setIsRunning(false);
      form.reset();
      onSuccess(result.summaryCount);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze conversations");
      setIsRunning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Analyze Conversations</SheetTitle>
          <SheetDescription>
            Fetch and summarize conversations from your bot for analysis.
          </SheetDescription>
        </SheetHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="grid flex-1 auto-rows-min gap-6 px-4 mt-6">
              <FormField
                control={form.control}
                name="maxConversations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Conversations</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        disabled={isRunning}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of conversations to analyze (1-500). Default: 100
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxMessagesPerConversation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Messages Per Conversation</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        disabled={isRunning}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum messages to include per conversation (1-500). Default: 100
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="border-t pt-4 mt-6">
              <Button type="submit" disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Start Analysis"
                )}
              </Button>
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isRunning}>
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

