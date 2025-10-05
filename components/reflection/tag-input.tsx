import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { Tag } from "@/types/reflection";

interface TagInputProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => Promise<void>;
}

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function TagInput({ 
  availableTags, 
  selectedTagIds, 
  onTagToggle, 
  onCreateTag 
}: TagInputProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      await onCreateTag(newTagName.trim(), selectedColor);
      setNewTagName("");
      setIsCreating(false);
      setSelectedColor(TAG_COLORS[0]);
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <Badge
              key={tag.id}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer hover:opacity-80"
              style={{ 
                backgroundColor: isSelected ? tag.color : undefined,
                borderColor: tag.color,
                color: isSelected ? "white" : tag.color
              }}
              onClick={() => onTagToggle(tag.id)}
            >
              {tag.name}
              {isSelected && <X className="ml-1 h-3 w-3" />}
            </Badge>
          );
        })}
      </div>

      {/* Create New Tag */}
      {isCreating ? (
        <div className="border rounded-lg p-3 space-y-3">
          <Input
            placeholder="Tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 ${
                    selectedColor === color ? "border-gray-900" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateTag}>
              Create
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsCreating(true)}
          className="w-fit"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Tag
        </Button>
      )}
    </div>
  );
}