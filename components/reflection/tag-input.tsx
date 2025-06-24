import { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tag } from "@/types/reflection";

interface TagInputProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  onCreateTag: (name: string) => Promise<void>;
  className?: string;
}

export function TagInput({
  availableTags,
  selectedTagIds,
  onTagToggle,
  onCreateTag,
  className,
}: TagInputProps) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) {
      setIsAddingTag(false);
      return;
    }

    try {
      await onCreateTag(newTagName.trim());
      setNewTagName("");
    } catch (error) {
      console.error("Error creating tag:", error);
    } finally {
      setIsAddingTag(false);
    }
  };

  useEffect(() => {
    if (isAddingTag && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTag]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onTagToggle(tag.id)}
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              style={isSelected ? { backgroundColor: tag.color } : {}}
            >
              {tag.name}
              {isSelected && <X className="ml-1 h-3 w-3" />}
            </button>
          );
        })}

        {!isAddingTag ? (
          <button
            type="button"
            onClick={() => setIsAddingTag(true)}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Plus className="mr-1 h-3 w-3" />
            New Tag
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateNewTag();
                } else if (e.key === "Escape") {
                  setIsAddingTag(false);
                  setNewTagName("");
                }
              }}
              onBlur={handleCreateNewTag}
              placeholder="Tag name"
              className="h-8 w-32 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
