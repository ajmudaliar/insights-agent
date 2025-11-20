import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Plus } from "lucide-react";
import type { InsightsConfig } from "@/types/insights";

type Attribute = {
  name: string;
  type: string;
  description: string;
  filter_by?: boolean;
};

interface EditConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: InsightsConfig;
  onSave: (updates: Partial<InsightsConfig>) => Promise<void>;
}

export function EditConfigDialog({ open, onOpenChange, config, onSave }: EditConfigDialogProps) {
  const [formData, setFormData] = useState({
    analytical_question: config.analytical_question,
    agent_description: config.agent_description,
    summary_prompt: config.summary_prompt || "",
    clustering_focus: config.clustering_focus || "",
    domain_context: config.domain_context || "",
    categorization_guidance: config.categorization_guidance || "",
    extract_features: config.extract_features || [],
    attributes: config.attributes || [],
  });

  const [newFeature, setNewFeature] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens or config changes
  useEffect(() => {
    if (open) {
      setFormData({
        analytical_question: config.analytical_question,
        agent_description: config.agent_description,
        summary_prompt: config.summary_prompt || "",
        clustering_focus: config.clustering_focus || "",
        domain_context: config.domain_context || "",
        categorization_guidance: config.categorization_guidance || "",
        extract_features: config.extract_features || [],
        attributes: config.attributes || [],
      });
      setError(null);
    }
  }, [open, config]);

  const handleAddFeature = () => {
    const trimmed = newFeature.trim();
    if (trimmed && !formData.extract_features.includes(trimmed)) {
      setFormData({
        ...formData,
        extract_features: [...formData.extract_features, trimmed],
      });
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (feature: string) => {
    setFormData({
      ...formData,
      extract_features: formData.extract_features.filter((f) => f !== feature),
    });
  };

  const handleAddAttribute = () => {
    setFormData({
      ...formData,
      attributes: [
        ...formData.attributes,
        {
          name: "",
          type: "categorical",
          description: "",
          filter_by: false,
        },
      ],
    });
  };

  const handleUpdateAttribute = (index: number, updates: Partial<Attribute>) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.map((attr, idx) =>
        idx === index ? { ...attr, ...updates } : attr
      ),
    });
  };

  const handleRemoveAttribute = (index: number) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((_, idx) => idx !== index),
    });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.analytical_question.trim()) {
      setError("Analytical question is required");
      return;
    }

    if (!formData.agent_description.trim()) {
      setError("Agent description is required");
      return;
    }

    // Validate attributes
    for (const attr of formData.attributes) {
      if (!attr.name.trim() || !attr.description.trim()) {
        setError("All attributes must have a name and description");
        return;
      }
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col w-full">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-lg font-medium">Edit Configuration</DialogTitle>
        </DialogHeader>

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
                value="features"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-12"
              >
                Features
              </TabsTrigger>
              <TabsTrigger
                value="attributes"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-12"
              >
                Attributes
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
                <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto">
                  {/* Analytical Question */}
                  <div className="space-y-3">
                    <Label htmlFor="analytical_question" className="text-sm font-medium text-foreground">
                      Analytical Question <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="analytical_question"
                      value={formData.analytical_question}
                      onChange={(e) =>
                        setFormData({ ...formData, analytical_question: e.target.value })
                      }
                      placeholder="What question are you trying to answer?"
                      rows={3}
                      disabled={isSaving}
                      className="resize-none text-sm"
                    />
                  </div>

                  {/* Agent Description */}
                  <div className="space-y-3">
                    <Label htmlFor="agent_description" className="text-sm font-medium text-foreground">
                      Agent Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="agent_description"
                      value={formData.agent_description}
                      onChange={(e) =>
                        setFormData({ ...formData, agent_description: e.target.value })
                      }
                      placeholder="What does this agent do?"
                      rows={4}
                      disabled={isSaving}
                      className="resize-none text-sm"
                    />
                  </div>

                  {/* Clustering Focus */}
                  <div className="space-y-3">
                    <Label htmlFor="clustering_focus" className="text-sm font-medium text-foreground">
                      Clustering Focus
                    </Label>
                    <Textarea
                      id="clustering_focus"
                      value={formData.clustering_focus}
                      onChange={(e) =>
                        setFormData({ ...formData, clustering_focus: e.target.value })
                      }
                      placeholder="What should the clustering focus on?"
                      rows={3}
                      disabled={isSaving}
                      className="resize-none text-sm"
                    />
                  </div>

                  {/* Summary Prompt */}
                  <div className="space-y-3">
                    <Label htmlFor="summary_prompt" className="text-sm font-medium text-foreground">
                      Summary Prompt
                    </Label>
                    <Textarea
                      id="summary_prompt"
                      value={formData.summary_prompt}
                      onChange={(e) =>
                        setFormData({ ...formData, summary_prompt: e.target.value })
                      }
                      placeholder="Prompt for generating conversation summaries"
                      rows={4}
                      disabled={isSaving}
                      className="resize-none text-sm"
                    />
                  </div>
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

                    <div className="pt-4 border-t border-border/50">
                      <h4 className="text-sm font-semibold text-foreground mb-1">Clustering Focus</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Determines how the AI groups similar conversations.
                      </p>
                      <div className="space-y-3 pl-3 border-l-2 border-muted">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            <strong>By Intent:</strong> Group by user goal (e.g., "Refund", "Tech Support").
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <strong>By Sentiment:</strong> Group by emotion (e.g., "Frustrated", "Delighted").
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <strong>By Topic:</strong> Group by product feature or subject.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="px-6 py-6 space-y-8 mt-0">
          {/* Extract Features */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Extract Features</Label>
            <div className="space-y-3">
              {formData.extract_features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.extract_features.map((feature) => (
                    <Badge
                      key={feature}
                      variant="secondary"
                      className="text-xs font-normal px-2.5 py-1 gap-1.5 hover:bg-secondary/80 transition-colors"
                    >
                      <span>{feature}</span>
                      <button
                        onClick={() => handleRemoveFeature(feature)}
                        disabled={isSaving}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                  placeholder="Add feature (e.g., product_mentions)"
                  disabled={isSaving}
                  className="text-sm h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFeature}
                  disabled={isSaving || !newFeature.trim()}
                  className="h-9 px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

            </TabsContent>

            <TabsContent value="attributes" className="px-6 py-6 space-y-8 mt-0">
          {/* Attributes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Attributes</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddAttribute}
                disabled={isSaving}
                className="h-8 gap-1.5 text-sm font-normal"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {formData.attributes.map((attr, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg space-y-3 bg-accent/20 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <Input
                        value={attr.name}
                        onChange={(e) =>
                          handleUpdateAttribute(index, { name: e.target.value })
                        }
                        placeholder="Attribute name (e.g., sentiment)"
                        disabled={isSaving}
                        className="text-sm h-9 font-medium"
                      />

                      <div className="flex gap-2">
                        <select
                          value={attr.type}
                          onChange={(e) =>
                            handleUpdateAttribute(index, { type: e.target.value })
                          }
                          disabled={isSaving}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="categorical">Categorical</option>
                          <option value="numerical">Numerical</option>
                          <option value="boolean">Boolean</option>
                        </select>

                        <label className="flex items-center gap-2 px-3 border rounded-md bg-background min-w-fit">
                          <Switch
                            checked={attr.filter_by}
                            onCheckedChange={(checked) =>
                              handleUpdateAttribute(index, { filter_by: checked })
                            }
                            disabled={isSaving}
                          />
                          <span className="text-xs whitespace-nowrap">Filterable</span>
                        </label>
                      </div>

                      <Textarea
                        value={attr.description}
                        onChange={(e) =>
                          handleUpdateAttribute(index, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Description"
                        rows={2}
                        disabled={isSaving}
                        className="resize-none text-sm"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttribute(index)}
                      disabled={isSaving}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {formData.attributes.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                  No attributes defined. Click "Add" to create one.
                </div>
              )}
            </div>
          </div>

            </TabsContent>

            <TabsContent value="advanced" className="p-0 mt-0 h-full">
              <div className="flex h-full">
                {/* Form Fields Column */}
                <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto">
                  {/* Domain Context */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="domain_context" className="text-sm font-medium text-foreground">
                        Domain-Specific Context
                      </Label>
                    </div>
                    <Textarea
                      id="domain_context"
                      value={formData.domain_context}
                      onChange={(e) =>
                        setFormData({ ...formData, domain_context: e.target.value })
                      }
                      placeholder="Example: This is a healthcare chatbot, conversations may involve HIPAA-sensitive terms..."
                      rows={6}
                      disabled={isSaving}
                      className="resize-none text-sm font-mono"
                    />
                  </div>

                  {/* Categorization Guidance */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="categorization_guidance" className="text-sm font-medium text-foreground">
                        Categorization Guidance
                      </Label>
                    </div>
                    <Textarea
                      id="categorization_guidance"
                      value={formData.categorization_guidance}
                      onChange={(e) =>
                        setFormData({ ...formData, categorization_guidance: e.target.value })
                      }
                      placeholder="Example: Frame categories around user pain points rather than feature usage..."
                      rows={6}
                      disabled={isSaving}
                      className="resize-none text-sm font-mono"
                    />
                  </div>
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

        {error && (
          <div className="px-6 py-3 text-sm text-destructive bg-destructive/5 border-t border-destructive/20 shrink-0">
            {error}
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-9"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="h-9 gap-2">
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
