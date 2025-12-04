import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  domain_context: z.string().max(5000).optional(),
  categorization_guidance: z.string().max(5000).optional(),
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
      domain_context: "",
      categorization_guidance: "",
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
        domain_context: data.domain_context,
        categorization_guidance: data.categorization_guidance,
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
      <DialogContent className="sm:max-w-6xl p-0 gap-0 overflow-hidden flex flex-col w-full max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 shrink-0">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 border-b">
                <TabsList className="w-full flex rounded-none bg-transparent h-12 p-0">
                  <TabsTrigger
                    value="basic"
                    className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-12"
                  >
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger
                    value="advanced"
                    className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-12"
                  >
                    Advanced
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="basic" className="p-0 mt-0 h-full">
                  <div className="flex h-full">
                    {/* Form Fields Column */}
                    <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
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
                                className="resize-none text-sm min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
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
                                className="resize-none text-sm min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Guidance Sidebar */}
                    <div className="w-[510px] border-l bg-muted/10 px-6 py-6 space-y-8 overflow-y-auto hidden md:block">
                      <div className="bg-card border rounded-lg p-4 shadow-sm space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">Analytical Question</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            The core business question you want to answer from these conversations.
                          </p>
                          <div className="space-y-3 pl-3 border-l-2 border-muted">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-medium text-foreground uppercase tracking-wider">Examples</span>
                              <ul className="list-disc pl-3 space-y-1 text-xs text-muted-foreground">
                                <li>"What are the most common topics discussed?"</li>
                                <li>"What problems are users trying to solve?"</li>
                                <li>"What questions does the agent fail to answer?"</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border/50">
                          <h4 className="text-sm font-semibold text-foreground mb-1">Agent Description</h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            Helps the AI understand the context of the conversations.
                          </p>
                          <ul className="list-disc pl-3 space-y-1 text-xs text-muted-foreground">
                            <li>"Customer support bot helping users troubleshoot technical issues and manage accounts"</li>
                            <li>"Sales assistant that qualifies leads and schedules demos for B2B software"</li>
                            <li>"E-commerce bot answering product questions, tracking orders, and handling returns"</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="p-0 mt-0 h-full">
                  <div className="flex h-full">
                    {/* Form Fields Column */}
                    <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto">
                      <FormField
                        control={form.control}
                        name="domain_context"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-medium text-foreground">Domain-Specific Context</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g., Healthcare chatbot, HIPAA-sensitive terms, common patient issues..."
                                disabled={isCreating}
                                className="resize-none text-sm font-mono min-h-[150px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="categorization_guidance"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-medium text-foreground">Categorization Guidance</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g., Focus on user pain points rather than feature usage..."
                                disabled={isCreating}
                                className="resize-none text-sm font-mono min-h-[150px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Guidance Sidebar */}
                    <div className="w-[510px] border-l bg-muted/10 px-6 py-6 space-y-8 overflow-y-auto hidden md:block">
                      <div className="bg-card border rounded-lg p-4 shadow-sm space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">Domain Context</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Provide knowledge to improve config generation and downstream analysis.
                          </p>
                          <div className="space-y-3 pl-3 border-l-2 border-muted">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-medium text-foreground uppercase tracking-wider">Terminology</span>
                              <p className="text-xs text-muted-foreground">"'Provisioning' means account setup, not server infrastructure in our context"</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-medium text-foreground uppercase tracking-wider">Business Context</span>
                              <p className="text-xs text-muted-foreground">"E-commerce fashion brand - users often ask about sizing, returns within 30 days, and international shipping"</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-medium text-foreground uppercase tracking-wider">User Segments</span>
                              <p className="text-xs text-muted-foreground">"B2B sales bot - 70% enterprise clients, 30% SMB. Enterprise users ask about SSO and compliance"</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border/50">
                          <h4 className="text-sm font-semibold text-foreground mb-1">Categorization Guidance</h4>
                          <p className="text-xs text-muted-foreground mb-3">
                            Instructions for how categories should be generated.
                          </p>
                          <ul className="list-disc pl-4 space-y-2 text-xs text-muted-foreground">
                            <li>"Group by conversation outcome (satisfied, frustrated, unclear resolution)"</li>
                            <li>"Categorize by business impact (revenue-blocking vs. general inquiries)"</li>
                            <li>"Separate pre-sale questions from post-sale support issues"</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

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

