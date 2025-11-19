import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { createInsight } from "@/services/insights";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  agent_description: z
    .string()
    .min(10, "Agent description must be at least 10 characters")
    .max(1000, "Agent description must be less than 1000 characters"),
  analytical_question: z
    .string()
    .min(10, "Analytical question must be at least 10 characters")
    .max(500, "Analytical question must be less than 500 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateInsightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInsightDialog({ open, onOpenChange, onSuccess }: CreateInsightDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agent_description: "",
      analytical_question: "",
    },
  });

  const handleClose = () => {
    if (!isCreating) {
      form.reset();
      setError(null);
      onOpenChange(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsCreating(true);
    setError(null);

    try {
      await createInsight({
        agent_description: data.agent_description,
        analytical_question: data.analytical_question,
      });

      // Success!
      setIsCreating(false);
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create insight");
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-lg font-medium">Create New Insight</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="px-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
            <div className="space-y-6 px-6 py-4">
              <FormField
                control={form.control}
                name="analytical_question"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium text-foreground">Analytical Question</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., What issues cause users to abandon conversations?"
                        disabled={isCreating}
                        className="resize-none text-sm min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      What insights do you want to discover from your conversations?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agent_description"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium text-foreground">Agent Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A customer support bot helping users with product questions and troubleshooting..."
                        disabled={isCreating}
                        className="resize-none text-sm min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      Describe what your bot does and how it helps users
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
              <div className="flex justify-end gap-2 w-full">
                <Button 
                  type="button" 
                  variant="ghost" 
                  disabled={isCreating} 
                  onClick={handleClose}
                  className="h-9"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating} className="h-9 gap-2">
                  {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCreating ? "Creating..." : "Create Insight"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

