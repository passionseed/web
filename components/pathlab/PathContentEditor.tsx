"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { PathContent, PathContentType } from "@/types/pathlab";
import { useToast } from "@/hooks/use-toast";

interface PathContentEditorProps {
  activityId: string;
  initialContent?: PathContent[];
}

const CONTENT_TYPES: Array<{ value: PathContentType; label: string }> = [
  // Inherited from nodes
  { value: "video", label: "Video (YouTube, Vimeo, etc.)" },
  { value: "short_video", label: "Short Video (< 2 min)" },
  { value: "canva_slide", label: "Canva Slide" },
  { value: "text", label: "Text / Markdown" },
  { value: "image", label: "Image" },
  { value: "pdf", label: "PDF Document" },
  { value: "resource_link", label: "External Link" },
  { value: "order_code", label: "Code Ordering Activity" },
  // PathLab-specific
  { value: "daily_prompt", label: "Daily Prompt" },
  { value: "reflection_card", label: "Reflection Card" },
  { value: "emotion_check", label: "Emotion Check" },
  { value: "progress_snapshot", label: "Progress Snapshot" },
];

export function PathContentEditor({
  activityId,
  initialContent = [],
}: PathContentEditorProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<PathContent[]>(initialContent);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New content form state
  const [newContentType, setNewContentType] = useState<PathContentType>("text");
  const [newContentTitle, setNewContentTitle] = useState("");
  const [newContentUrl, setNewContentUrl] = useState("");
  const [newContentBody, setNewContentBody] = useState("");

  const handleAddContent = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/pathlab/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityId,
          content_type: newContentType,
          content_title: newContentTitle || null,
          content_url: newContentUrl || null,
          content_body: newContentBody || null,
          display_order: content.length,
        }),
      });

      if (!response.ok) throw new Error("Failed to create content");

      const { content: newContent } = await response.json();
      setContent([...content, newContent]);

      // Reset form
      setNewContentType("text");
      setNewContentTitle("");
      setNewContentUrl("");
      setNewContentBody("");
      setIsAdding(false);

      toast({
        title: "Content added",
        description: "Content item has been added successfully",
      });
    } catch (error) {
      console.error("Error adding content:", error);
      toast({
        title: "Error",
        description: "Failed to add content item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/pathlab/content?contentId=${contentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete content");

      setContent(content.filter((c) => c.id !== contentId));

      toast({
        title: "Content deleted",
        description: "Content item has been removed",
      });
    } catch (error) {
      console.error("Error deleting content:", error);
      toast({
        title: "Error",
        description: "Failed to delete content item",
        variant: "destructive",
      });
    }
  };

  const renderContentForm = () => (
    <Card className="border-dashed">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contentType">Content Type</Label>
          <Select value={newContentType} onValueChange={(v) => setNewContentType(v as PathContentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contentTitle">Title (optional)</Label>
          <Input
            id="contentTitle"
            value={newContentTitle}
            onChange={(e) => setNewContentTitle(e.target.value)}
            placeholder="Content title"
          />
        </div>

        {["video", "short_video", "canva_slide", "image", "pdf", "resource_link"].includes(newContentType) && (
          <div className="space-y-2">
            <Label htmlFor="contentUrl">URL</Label>
            <Input
              id="contentUrl"
              value={newContentUrl}
              onChange={(e) => setNewContentUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        {["text", "order_code", "daily_prompt", "reflection_card"].includes(newContentType) && (
          <div className="space-y-2">
            <Label htmlFor="contentBody">Content</Label>
            <Textarea
              id="contentBody"
              value={newContentBody}
              onChange={(e) => setNewContentBody(e.target.value)}
              placeholder="Enter content here..."
              rows={6}
              className="resize-none font-mono text-sm"
            />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setIsAdding(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleAddContent} disabled={isSaving}>
            {isSaving ? "Adding..." : "Add Content"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Existing Content List */}
      {content.length > 0 && (
        <div className="space-y-2">
          {content.map((item, index) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="cursor-grab pt-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {CONTENT_TYPES.find((t) => t.value === item.content_type)?.label}
                        </span>
                        {item.content_title && (
                          <p className="font-medium">{item.content_title}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContent(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    {item.content_url && (
                      <p className="text-sm text-muted-foreground truncate">{item.content_url}</p>
                    )}
                    {item.content_body && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.content_body}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Content Button/Form */}
      {isAdding ? (
        renderContentForm()
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Content Item
        </Button>
      )}

      {content.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No content items yet</p>
          <p className="text-sm">Click "Add Content Item" to get started</p>
        </div>
      )}
    </div>
  );
}
