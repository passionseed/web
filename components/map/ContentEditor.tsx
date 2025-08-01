"use client";

import { useState, useCallback, useMemo } from "react";
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

// Content type configurations
const CONTENT_TYPE_CONFIG = {
  video: {
    label: "📹 Video",
    placeholder: "https://youtube.com/watch?v=...",
    hint: "YouTube, Vimeo, etc.",
  },
  canva_slide: {
    label: "🎨 Canva Slide",
    placeholder: "https://www.canva.com/design/...",
    hint: "Canva presentation link",
  },
  text_with_images: {
    label: "📝 Text & Images",
    placeholder:
      "Write your content here... You can use HTML tags like <img src='...'>, <p>, <h1>, etc.",
    hint: "HTML tags supported: <img>, <p>, <h1>, etc.",
  },
} as const;

interface ContentEditorProps {
  nodeId: string;
  content: NodeContent[];
  onContentChange: (newContent: NodeContent[]) => void;
}

interface ContentFormProps {
  nodeId: string;
  existingContent?: NodeContent;
  onSave: (content: NodeContent) => void;
  onCancel: () => void;
}

// Validation utilities
const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ["http:", "https:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

const validateContentForm = (
  contentType: ContentType,
  contentUrl: string,
  contentBody: string
): string[] => {
  const errors: string[] = [];

  if (!contentType) {
    errors.push("Content type is required");
  }

  if (contentType === "video" || contentType === "canva_slide") {
    if (!contentUrl.trim()) {
      errors.push("URL is required for this content type");
    } else if (!validateUrl(contentUrl)) {
      errors.push("Please enter a valid URL starting with http:// or https://");
    }
  }

  if (contentType === "text_with_images" && !contentBody.trim()) {
    errors.push("Content body is required for text content");
  }

  return errors;
};

// Generate unique temporary ID
const generateTempId = (): string =>
  `temp_content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Content form component
const ContentForm = ({
  nodeId,
  existingContent,
  onSave,
  onCancel,
}: ContentFormProps) => {
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

  const config = CONTENT_TYPE_CONFIG[contentType];

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validationErrors = validateContentForm(
        contentType,
        contentUrl,
        contentBody
      );
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      const payload: NodeContent = {
        id: existingContent?.id || generateTempId(),
        node_id: nodeId,
        content_type: contentType,
        content_url: ["video", "canva_slide"].includes(contentType)
          ? contentUrl.trim()
          : null,
        content_body:
          contentType === "text_with_images" ? contentBody.trim() : null,
        created_at: existingContent?.created_at || new Date().toISOString(),
      };

      onSave(payload);
    },
    [contentType, contentUrl, contentBody, existingContent, nodeId, onSave]
  );

  const clearErrors = useCallback(() => setErrors([]), []);

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
            clearErrors();
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONTENT_TYPE_CONFIG).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(contentType === "video" || contentType === "canva_slide") && (
        <div className="space-y-2">
          <Label htmlFor="content_url">
            URL *
            <span className="text-xs text-muted-foreground ml-2">
              ({config.hint})
            </span>
          </Label>
          <Input
            id="content_url"
            value={contentUrl}
            onChange={(e) => {
              setContentUrl(e.target.value);
              clearErrors();
            }}
            placeholder={config.placeholder}
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
              ({config.hint})
            </span>
          </Label>
          <Textarea
            id="content_body"
            value={contentBody}
            onChange={(e) => {
              setContentBody(e.target.value);
              clearErrors();
            }}
            className={`min-h-[120px] ${
              errors.some((e) => e.includes("Content body"))
                ? "border-red-500"
                : ""
            }`}
            placeholder={config.placeholder}
          />
          <div className="text-xs text-muted-foreground">
            💡 Tip: Use &lt;img src="url"&gt; to embed images, &lt;h1&gt; for
            headings
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

// Content preview utilities
const getContentPreview = (item: NodeContent): string => {
  const previews = {
    video: () =>
      `📹 Video: ${item.content_url?.substring(0, 50)}${item.content_url && item.content_url.length > 50 ? "..." : ""}`,
    canva_slide: () =>
      `🎨 Canva: ${item.content_url?.substring(0, 50)}${item.content_url && item.content_url.length > 50 ? "..." : ""}`,
    text_with_images: () => {
      const bodyPreview =
        item.content_body?.replace(/<[^>]*>/g, "").substring(0, 50) || "";
      return `📝 Text: ${bodyPreview}${bodyPreview.length >= 50 ? "..." : ""}`;
    },
  };

  return previews[item.content_type]?.() || item.content_type;
};

// Main component
export function ContentEditor({
  nodeId,
  content,
  onContentChange,
}: ContentEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isFormActive = isAdding || editingId;

  const handleSave = useCallback(
    (savedContent: NodeContent) => {
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
        onContentChange(updatedContent);
      } else {
        // Add new content
        onContentChange([...content, savedContent]);
      }

      // Reset form state
      setIsAdding(false);
      setEditingId(null);
    },
    [content, onContentChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      onContentChange(content.filter((c) => c.id !== id));
    },
    [content, onContentChange]
  );

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const handleCancelForm = useCallback(() => {
    setIsAdding(false);
    setEditingId(null);
  }, []);

  const confirmDelete = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to delete this content?")) {
        handleDelete(id);
      }
    },
    [handleDelete]
  );

  // Empty state component
  const EmptyState = useMemo(
    () => (
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
    ),
    []
  );

  // Help text component
  const HelpText = useMemo(
    () => (
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>💡 Content will be shown to students in the order listed above</p>
        <p>
          🎯 Mix different content types to create engaging learning experiences
        </p>
      </div>
    ),
    []
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          Learning Content ({content.length})
        </h4>
        {!isFormActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-8"
          >
            <PlusCircle className="h-3 w-3 mr-1" />
            Add Content
          </Button>
        )}
      </div>

      {/* Add new content form */}
      {isAdding && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-1 max-h-[70vh] overflow-hidden">
          <div className="max-h-[65vh] overflow-y-auto">
            <ContentForm
              nodeId={nodeId}
              onSave={handleSave}
              onCancel={handleCancelForm}
            />
          </div>
        </div>
      )}

      {/* Content list */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {content.map((item, index) => (
          <Card key={item.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              {editingId === item.id ? (
                <div className="border border-yellow-300 rounded-lg p-1 bg-yellow-50 max-h-[65vh] overflow-hidden">
                  <div className="max-h-[60vh] overflow-y-auto">
                    <ContentForm
                      nodeId={nodeId}
                      existingContent={item}
                      onSave={handleSave}
                      onCancel={handleCancelForm}
                    />
                  </div>
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
                      onClick={() => handleEdit(item.id)}
                      className="h-8 w-8 p-0"
                      disabled={!!isFormActive}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(item.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                      disabled={isFormActive}
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
      {content.length === 0 && !isAdding && EmptyState}

      {/* Help text */}
      {content.length > 0 && HelpText}
    </div>
  );
}
