import { useState, type KeyboardEvent, useRef, useEffect } from "react";
import { X, Plus, Loader2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableTagListProps {
  tags: string[];
  onSave: (tags: string[]) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EditableTagList({
  tags,
  onSave,
  placeholder = "Add feature...",
  disabled = false,
  className,
}: EditableTagListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddTag = async () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) {
      setIsAdding(false);
      setNewTag("");
      return;
    }

    if (tags.includes(trimmedTag)) {
      setError("Feature already exists");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave([...tags, trimmedTag]);

      setNewTag("");
      setIsAdding(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add feature");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await onSave(tags.filter((t) => t !== tagToRemove));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove feature");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setNewTag("");
      setIsAdding(false);
      setError(null);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className={cn(
              "h-6 text-xs px-2 py-0 gap-1 group",
              "hover:border-red-300 hover:bg-red-50 transition-colors duration-150",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                onClick={() => handleRemoveTag(tag)}
                disabled={isSaving}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}

        {isAdding ? (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onBlur={handleAddTag}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isSaving}
              className="h-6 text-xs px-2 w-32 focus:w-48 transition-all duration-150"
            />
            {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={disabled || isSaving}
            className="h-6 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Add feature
          </Button>
        )}

        {showSuccess && (
          <span>
            <Check className="h-3 w-3 text-green-500" />
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {isAdding && (
        <p className="text-[10px] text-muted-foreground">
          Enter to save, Esc to cancel
        </p>
      )}
    </div>
  );
}
