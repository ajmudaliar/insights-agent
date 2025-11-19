import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  editClassName?: string;
  disabled?: boolean;
}

export function EditableField({
  value,
  onSave,
  multiline = false,
  placeholder = "Click to edit...",
  className,
  displayClassName,
  editClassName,
  disabled = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue.trim() === value.trim() || !editValue.trim()) {
      setIsEditing(false);
      setEditValue(value);
      setError(null);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(editValue.trim());

      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (!multiline && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  if (disabled) {
    return (
      <div className={cn("cursor-not-allowed opacity-60", displayClassName, className)}>
        {value || placeholder}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={cn("relative", className)}>
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSaving}
          className={cn(
            "min-h-[2em] resize-none transition-all duration-150",
            "border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
            multiline ? "h-auto" : "h-[2em]",
            isSaving && "opacity-60",
            editClassName
          )}
          rows={multiline ? Math.max(3, editValue.split("\n").length) : 1}
        />

        {isSaving && (
          <div className="absolute right-2 top-2">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}

        <p className="text-[10px] text-muted-foreground mt-1">
          {multiline ? "Cmd+Enter to save, Esc to cancel" : "Enter to save, Esc to cancel"}
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={cn(
        "group relative cursor-text transition-all duration-150 rounded",
        "hover:bg-accent/50",
        !value && "text-muted-foreground/50",
        displayClassName,
        className
      )}
    >
      {value || placeholder}

      {showSuccess && (
        <span className="absolute -right-6 top-0">
          <Check className="h-3 w-3 text-green-500" />
        </span>
      )}
    </div>
  );
}
