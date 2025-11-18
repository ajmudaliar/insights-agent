import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { step1GenerateConfig } from "@/services/insights";
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

interface CreateInsightSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInsightSheet({ open, onOpenChange, onSuccess }: CreateInsightSheetProps) {
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
      await step1GenerateConfig({
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
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create New Insight</SheetTitle>
          <SheetDescription>Configure your analysis parameters to generate an insight configuration.</SheetDescription>
        </SheetHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <FormField
                control={form.control}
                name="analytical_question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Analytical Question</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., What issues cause users to abandon conversations?"
                        disabled={isCreating}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>What insights do you want to discover from your conversations?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agent_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A customer support bot helping users with product questions and troubleshooting..."
                        disabled={isCreating}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Describe what your bot does and how it helps users</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="border-t pt-4">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Insight"
                )}
              </Button>
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isCreating}>
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
