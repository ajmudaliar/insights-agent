import { useState } from "react";
import { X, Plus, Loader2, Check, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Attribute = {
  name: string;
  type: string;
  description: string;
  filter_by?: boolean;
};

interface EditableAttributesListProps {
  attributes: Attribute[];
  onSave: (attributes: Attribute[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function EditableAttributesList({
  attributes,
  onSave,
  disabled = false,
  className,
}: EditableAttributesListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<Attribute>({
    name: "",
    type: "categorical",
    description: "",
    filter_by: false,
  });

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...attributes[index] });
    setError(null);
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditForm({
      name: "",
      type: "categorical",
      description: "",
      filter_by: false,
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!editForm.name.trim() || !editForm.description.trim()) {
      setError("Name and description are required");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      let newAttributes: Attribute[];
      if (isAdding) {
        // Check for duplicate name
        if (attributes.some((a) => a.name === editForm.name)) {
          setError("Attribute with this name already exists");
          setIsSaving(false);
          return;
        }
        newAttributes = [...attributes, editForm];
      } else if (editingIndex !== null) {
        newAttributes = attributes.map((attr, idx) =>
          idx === editingIndex ? editForm : attr
        );
      } else {
        return;
      }

      await onSave(newAttributes);

      setEditingIndex(null);
      setIsAdding(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save attribute");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setIsAdding(false);
    setError(null);
  };

  const handleRemove = async (index: number) => {
    try {
      setIsSaving(true);
      setError(null);
      await onSave(attributes.filter((_, idx) => idx !== index));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove attribute");
    } finally {
      setIsSaving(false);
    }
  };

  const _handleToggleFilter = async (index: number) => {
    try {
      setIsSaving(true);
      setError(null);
      const newAttributes = attributes.map((attr, idx) =>
        idx === index ? { ...attr, filter_by: !attr.filter_by } : attr
      );
      await onSave(newAttributes);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update attribute");
    } finally {
      setIsSaving(false);
    }
  };

  const renderAttributeForm = () => (
    <div className="space-y-3 p-3 border rounded-md bg-accent/20">
      <div className="space-y-2">
        <Input
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          placeholder="Attribute name (e.g., sentiment)"
          disabled={isSaving}
          className="h-7 text-xs"
        />

        <div className="flex gap-2">
          <select
            value={editForm.type}
            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
            disabled={isSaving}
            className="h-7 text-xs border rounded-md px-2 bg-background flex-1"
          >
            <option value="categorical">Categorical</option>
            <option value="numerical">Numerical</option>
            <option value="boolean">Boolean</option>
          </select>

          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={editForm.filter_by}
              onCheckedChange={(checked) =>
                setEditForm({ ...editForm, filter_by: checked })
              }
              disabled={isSaving}
            />
            <span className="text-muted-foreground">Filterable</span>
          </label>
        </div>

        <Input
          value={editForm.description}
          onChange={(e) =>
            setEditForm({ ...editForm, description: e.target.value })
          }
          placeholder="Description"
          disabled={isSaving}
          className="h-7 text-xs"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-6 text-xs"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="h-6 text-xs gap-1"
        >
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          Save
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {attributes.map((attr, index) => {
        if (editingIndex === index) {
          return <div key={index}>{renderAttributeForm()}</div>;
        }

        return (
          <div
            key={index}
            className={cn(
              "group space-y-1 p-2 rounded-md transition-all duration-150",
              "hover:bg-accent/50",
              disabled && "opacity-60"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-medium text-foreground/90">
                  {attr.name}
                </span>
                <Badge
                  variant="outline"
                  className="h-4 text-[10px] px-1 py-0"
                >
                  {attr.type}
                </Badge>
                {attr.filter_by && (
                  <Badge
                    variant="secondary"
                    className="h-4 text-[10px] px-1 py-0"
                  >
                    filterable
                  </Badge>
                )}
              </div>

              {!disabled && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(index)}
                    disabled={isSaving}
                    className="h-5 w-5 p-0"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    disabled={isSaving}
                    className="h-5 w-5 p-0 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground/70 pl-0">
              {attr.description}
            </p>
          </div>
        );
      })}

      {isAdding && renderAttributeForm()}

      {!isAdding && !disabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartAdd}
          disabled={isSaving || editingIndex !== null}
          className="h-6 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add attribute
        </Button>
      )}

      {showSuccess && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          Saved
        </div>
      )}
    </div>
  );
}
