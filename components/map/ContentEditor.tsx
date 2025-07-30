"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeContent, ContentType } from "@/types/map";
import { Trash2, PlusCircle, Edit, Check, X, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ContentEditorProps {
  nodeId: string;
  content: NodeContent[];
  onContentChange: (newContent: NodeContent[]) => void;
}

const ContentForm = ({
  nodeId,
  existingContent,
  onSave,
  onCancel,
}: {
  nodeId: string;
  existingContent?: NodeContent;
  onSave: (content: NodeContent) => void;
  onCancel: () => void;
}) => {
  const [contentType, setContentType] = useState<ContentType>(
    existingContent?.content_type || "video"
  );
  const [contentUrl, setContentUrl] = useState(
    existingContent?.content_url || ""
  );
  const [contentBody, setContentBody] = useState(
    existingContent?.content_body || ""
  );
  const [errors, setErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!contentType) {
      newErrors.push("Content type is required");
    }

    if (contentType === "video" || contentType === "canva_slide") {
      if (!contentUrl.trim()) {
        newErrors.push("URL is required for this content type");
      } else {
        // Basic URL validation
        try {
          const url = new URL(contentUrl);
          if (!["http:", "https:"].includes(url.protocol)) {
            newErrors.push("URL must start with http:// or https://");
          }
        } catch {
          newErrors.push("Please enter a valid URL");
        }
      }
    }

    if (contentType === "text_with_images") {
      if (!contentBody.trim()) {
        newErrors.push("Content body is required for text content");
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload: NodeContent = {
      id:
        existingContent?.id ||
        `temp_content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      node_id: nodeId,
      content_type: contentType,
      content_url: ["video", "canva_slide"].includes(contentType)
        ? contentUrl.trim()
        : null,
      content_body:
        contentType === "text_with_images" ? contentBody.trim() : null,
      created_at: existingContent?.created_at || new Date().toISOString(),
    };

    console.log("Saving content:", payload);
    onSave(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded-lg bg-muted/30"
    >
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="contentType">Content Type *</Label>
        <Select
          value={contentType}
          onValueChange={(v: ContentType) => {
            setContentType(v);
            setErrors([]); // Clear errors when type changes
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">📹 Video</SelectItem>
            <SelectItem value="canva_slide">🎨 Canva Slide</SelectItem>
            <SelectItem value="text_with_images">📝 Text & Images</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(contentType === "video" || contentType === "canva_slide") && (
        <div className="space-y-2">
          <Label htmlFor="content_url">
            URL *
            <span className="text-xs text-muted-foreground ml-2">
              (
              {contentType === "video"
                ? "YouTube, Vimeo, etc."
                : "Canva presentation link"}
              )
            </span>
          </Label>
          <Input
            id="content_url"
            value={contentUrl}
            onChange={(e) => {
              setContentUrl(e.target.value);
              setErrors([]); // Clear errors on change
            }}
            placeholder={
              contentType === "video"
                ? "https://youtube.com/watch?v=..."
                : "https://www.canva.com/design/..."
            }
            className={
              errors.some((e) => e.includes("URL")) ? "border-red-500" : ""
            }
          />
        </div>
      )}

      {contentType === "text_with_images" && (
        <div className="space-y-2">
          <Label htmlFor="content_body">
            Content *
            <span className="text-xs text-muted-foreground ml-2">
              (HTML tags supported: &lt;img&gt;, &lt;p&gt;, &lt;h1&gt;, etc.)
            </span>
          </Label>
          <Textarea
            id="content_body"
            value={contentBody}
            onChange={(e) => {
              setContentBody(e.target.value);
              setErrors([]); // Clear errors on change
            }}
            className={`min-h-[120px] ${errors.some((e) => e.includes("Content body")) ? "border-red-500" : ""}`}
            placeholder="Write your content here... You can use HTML tags like <img src='...'>, <p>, <h1>, etc."
          />
          <div className="text-xs text-muted-foreground">
            💡 Tip: Use &lt;img src="url"&gt; to embed images, &lt;h1&gt; for
            headings, &lt;p&gt; for paragraphs
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} size="sm">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit" size="sm">
          <Check className="h-4 w-4 mr-1" />
          {existingContent ? "Update Content" : "Add Content"}
        </Button>
      </div>
    </form>
  );
};

export function ContentEditor({
  nodeId,
  content,
  onContentChange,
}: ContentEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = (savedContent: NodeContent) => {
    console.log("ContentEditor: Handling save for content:", savedContent);

    // Validate the saved content
    if (
      !savedContent.id ||
      !savedContent.node_id ||
      !savedContent.content_type
    ) {
      console.error("Invalid content data:", savedContent);
      return;
    }

    const existingIndex = content.findIndex((c) => c.id === savedContent.id);

    if (existingIndex >= 0) {
      // Update existing content
      const updatedContent = [...content];
      updatedContent[existingIndex] = savedContent;
      console.log(
        "ContentEditor: Updating existing content at index",
        existingIndex
      );
      onContentChange(updatedContent);
    } else {
      // Add new content
      const newContent = [...content, savedContent];
      console.log(
        "ContentEditor: Adding new content. Total items:",
        newContent.length
      );
      onContentChange(newContent);
    }

    // Reset form state
    setIsAdding(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    console.log("ContentEditor: Deleting content with id:", id);
    const filteredContent = content.filter((c) => c.id !== id);
    console.log(
      "ContentEditor: Remaining content items:",
      filteredContent.length
    );
    onContentChange(filteredContent);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const getContentPreview = (item: NodeContent): string => {
    switch (item.content_type) {
      case "video":
        return `📹 Video: ${item.content_url?.substring(0, 50)}${item.content_url && item.content_url.length > 50 ? "..." : ""}`;
      case "canva_slide":
        return `🎨 Canva: ${item.content_url?.substring(0, 50)}${item.content_url && item.content_url.length > 50 ? "..." : ""}`;
      case "text_with_images":
        const bodyPreview =
          item.content_body?.replace(/<[^>]*>/g, "").substring(0, 50) || "";
        return `📝 Text: ${bodyPreview}${bodyPreview.length >= 50 ? "..." : ""}`;
      default:
        return item.content_type;
    }
  };

  // Debug logging
  console.log("ContentEditor render:", {
    nodeId,
    contentCount: content.length,
    isAdding,
    editingId,
    content: content.map((c) => ({ id: c.id, type: c.content_type })),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          Learning Content ({content.length})
        </h4>
        {!isAdding && !editingId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("ContentEditor: Starting to add new content");
              setIsAdding(true);
            }}
            className="h-8"
          >
            <PlusCircle className="h-3 w-3 mr-1" />
            Add Content
          </Button>
        )}
      </div>

      {/* Add new content form */}
      {isAdding && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-1">
          <ContentForm
            nodeId={nodeId}
            onSave={handleSave}
            onCancel={handleCancelAdd}
          />
        </div>
      )}

      {/* Existing content list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {content.map((item, index) => (
          <Card key={item.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              {editingId === item.id ? (
                <div className="border border-yellow-300 rounded-lg p-1 bg-yellow-50">
                  <ContentForm
                    nodeId={nodeId}
                    existingContent={item}
                    onSave={handleSave}
                    onCancel={handleCancelEdit}
                  />
                </div>
              ) : (
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                        #{index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {item.content_type.replace("_", " ")}
                      </span>
                      {!item.content_url && !item.content_body && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          Missing Content
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {getContentPreview(item)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log(
                          "ContentEditor: Starting to edit content:",
                          item.id
                        );
                        setEditingId(item.id);
                      }}
                      className="h-8 w-8 p-0"
                      disabled={isAdding}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this content?"
                          )
                        ) {
                          handleDelete(item.id);
                        }
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                      disabled={isAdding}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {content.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <div className="space-y-2">
            <p className="text-sm font-medium">No learning content added yet</p>
            <p className="text-xs">
              Add videos, slides, or text content to help students learn
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="mt-2"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Your First Content
            </Button>
          </div>
        </div>
      )}

      {/* Help text */}
      {content.length > 0 && (
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>💡 Content will be shown to students in the order listed above</p>
          <p>
            🎯 Mix different content types to create engaging learning
            experiences
          </p>
        </div>
      )}
    </div>
  );
}
