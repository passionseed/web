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
import {
  Trash2,
  PlusCircle,
  Edit,
  Check,
  X,
  AlertCircle,
  Upload,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/ui/file-upload";
import {
  createNodeContent,
  updateNodeContent,
  deleteNodeContent,
} from "@/lib/supabase/nodes";
import { useToast } from "@/components/ui/use-toast";

// Content type configurations
const CONTENT_TYPE_CONFIG = {
  video: {
    label: "📹 Video & Media",
    placeholder: "https://youtube.com/watch?v=... or https://vimeo.com/...",
    hint: "YouTube, Vimeo, SoundCloud, Twitter, Reddit, GIPHY, Flickr",
  },
  canva_slide: {
    label: "🎨 Canva Slide",
    placeholder: "https://www.canva.com/design/DAGu7Owilr4/...",
    hint: "Copy Canva Smart embed link",
  },
  text: {
    label: "📝 Text Content",
    placeholder:
      "Write your text content here... You can use HTML tags or Markdown syntax.",
    hint: "Supports both HTML tags and Markdown syntax (headers, bold, italic, lists, links, etc.)",
  },
  image: {
    label: "🖼️ Image Upload",
    placeholder: "",
    hint: "Upload images (JPG, PNG, GIF, WebP) up to 5MB",
  },
  pdf: {
    label: "📄 PDF Document",
    placeholder: "",
    hint: "Upload PDF documents up to 40MB",
  },
  resource_link: {
    label: "🔗 Resource Link",
    placeholder: "https://example.com/document.pdf or https://book-website.com",
    hint: "Files, books, documents, external resources",
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
  contentCount: number; // Number of existing content items
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

  if (
    contentType === "video" ||
    contentType === "canva_slide" ||
    contentType === "resource_link"
  ) {
    if (!contentUrl.trim()) {
      errors.push("URL is required for this content type");
    } else if (!validateUrl(contentUrl)) {
      errors.push("Please enter a valid URL starting with http:// or https://");
    } else if (
      contentType === "canva_slide" &&
      !contentUrl.includes("canva.com/design/")
    ) {
      errors.push(
        "Please enter a valid Canva design URL (should contain 'canva.com/design/')"
      );
    } else if (contentType === "video") {
      // Enhanced validation for video URLs - check for supported platforms
      const supportedPlatforms = [
        "youtube.com",
        "youtu.be",
        "vimeo.com",
        "soundcloud.com",
        "twitter.com",
        "reddit.com",
        "giphy.com",
        "flickr.com",
      ];
      const isSupported = supportedPlatforms.some((platform) =>
        contentUrl.toLowerCase().includes(platform)
      );

      if (!isSupported) {
        errors.push(
          "For best compatibility, use URLs from: YouTube, Vimeo, SoundCloud, Twitter, Reddit, GIPHY, or Flickr. Other URLs may still work but aren't guaranteed."
        );
      }
    }
  }

  if (contentType === "text" && !contentBody.trim()) {
    errors.push("Content body is required for text content");
  }

  if (contentType === "image" && !contentUrl.trim()) {
    errors.push("Please upload an image file");
  }

  if (contentType === "pdf" && !contentUrl.trim()) {
    errors.push("Please upload a PDF file");
  }

  if (contentType === "resource_link" && !contentBody.trim()) {
    errors.push("Description is required for resource links");
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
  contentCount,
  onSave,
  onCancel,
}: ContentFormProps) => {
  const [contentType, setContentType] = useState<ContentType>(
    existingContent?.content_type || "video"
  );
  const [contentTitle, setContentTitle] = useState(
    existingContent?.content_title || ""
  );
  const [contentUrl, setContentUrl] = useState(
    existingContent?.content_url || ""
  );
  const [contentBody, setContentBody] = useState(
    existingContent?.content_body || ""
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const config = CONTENT_TYPE_CONFIG[contentType];

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      console.log("Form submission attempted:", {
        contentType,
        contentTitle,
        contentUrl,
        contentBody,
        uploadedFileName,
      });

      const validationErrors = validateContentForm(
        contentType,
        contentUrl,
        contentBody
      );

      console.log("Validation errors:", validationErrors);

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      const payload: NodeContent = {
        id: existingContent?.id || generateTempId(),
        node_id: nodeId,
        content_type: contentType,
        content_title: contentTitle.trim() || null,
        content_url: [
          "video",
          "canva_slide",
          "resource_link",
          "image",
          "pdf",
        ].includes(contentType)
          ? contentUrl.trim()
          : null,
        content_body:
          contentType === "text" || contentType === "resource_link"
            ? contentBody.trim()
            : null,
        display_order: existingContent?.display_order ?? contentCount,
        created_at: existingContent?.created_at || new Date().toISOString(),
      };

      console.log("Saving content payload:", payload);
      setIsSaving(true);

      // Wrap in Promise to handle both sync and async onSave
      Promise.resolve(onSave(payload))
        .finally(() => {
          setIsSaving(false);
        });
    },
    [
      contentType,
      contentTitle,
      contentUrl,
      contentBody,
      existingContent,
      nodeId,
      onSave,
    ]
  );

  const clearErrors = useCallback(() => setErrors([]), []);

  const handleFileUploadComplete = useCallback(
    (fileUrl: string, fileName: string) => {
      console.log("File upload completed:", { fileUrl, fileName });
      setContentUrl(fileUrl);
      setUploadedFileName(fileName);
      clearErrors();
    },
    [clearErrors]
  );

  const handleFileUploadError = useCallback((error: string) => {
    setErrors([error]);
  }, []);

  const handleUploadStateChange = useCallback((uploading: boolean) => {
    console.log("Upload state changed:", uploading);
    setIsUploading(uploading);
  }, []);

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

      {/* Title field for all content types */}
      <div className="space-y-2">
        <Label htmlFor="content_title">
          Title
          <span className="text-xs text-muted-foreground ml-2">
            (Optional - give this content a descriptive title)
          </span>
        </Label>
        <Input
          id="content_title"
          value={contentTitle}
          onChange={(e) => {
            setContentTitle(e.target.value);
            clearErrors();
          }}
          placeholder="e.g., Introduction Video, Week 1 Slides, Important Resource..."
          className="h-11 border-2 border-slate-200 hover:border-slate-300 focus:border-blue-500 transition-colors"
        />
      </div>

      {(contentType === "video" ||
        contentType === "canva_slide" ||
        contentType === "resource_link") && (
        <div className="space-y-3">
          <Label
            htmlFor="content_url"
            className="text-sm font-semibold text-slate-700"
          >
            URL <span className="text-red-500">*</span>
            <span className="text-xs text-slate-500 ml-2 font-normal">
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
            className={`h-11 border-2 border-slate-200 hover:border-slate-300 focus:border-blue-500 transition-colors ${
              errors.some((e) => e.includes("URL"))
                ? "border-red-400 focus:border-red-500"
                : ""
            }`}
          />

          {contentType === "video" && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-600 mt-0.5">🎯</div>
              <div className="text-xs text-green-800 leading-relaxed">
                <strong>Supported platforms:</strong> YouTube, Vimeo,
                SoundCloud, Twitter, Reddit, GIPHY, Flickr.
                <br />
                <strong>Pro tip:</strong> Most social media and video platform
                URLs work automatically!
              </div>
            </div>
          )}

          {contentType === "resource_link" && (
            <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-purple-600 mt-0.5">📚</div>
              <div className="text-xs text-purple-800 leading-relaxed">
                <strong>Examples:</strong> PDFs, Google Docs, GitHub repos,
                books, articles, datasets, tools.
                <br />
                <strong>Tip:</strong> Add a clear description below to help
                students understand what this resource is!
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Upload for Images */}
      {contentType === "image" && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-700">
            Upload Image <span className="text-red-500">*</span>
            <span className="text-xs text-slate-500 ml-2 font-normal">
              ({config.hint})
            </span>
          </Label>
          <FileUpload
            nodeId={nodeId}
            onUploadComplete={handleFileUploadComplete}
            onValidationError={handleFileUploadError}
            onUploadStateChange={handleUploadStateChange}
            accept=".jpg,.jpeg,.png,.gif,.webp"
            maxSize={5} // 5MB limit for images
            allowMultiple={false}
            uploadEndpoint="images"
            className="border-2 border-dashed border-blue-200"
          />
          {contentUrl && (
            <div className="space-y-2">
              <div className="text-xs text-green-600 bg-green-50 p-2 rounded flex items-center gap-2">
                <span>✅ Image uploaded successfully</span>
                {uploadedFileName && (
                  <span className="text-muted-foreground">({uploadedFileName})</span>
                )}
              </div>
              {/* Image Preview */}
              <div className="border-2 border-green-200 rounded-lg p-2 bg-green-50/30">
                <p className="text-xs font-medium text-slate-700 mb-2">Preview:</p>
                <div className="relative w-full max-w-md mx-auto">
                  <img
                    src={contentUrl}
                    alt="Uploaded preview"
                    className="w-full h-auto rounded-lg shadow-md object-contain max-h-64"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                      console.error('Failed to load image preview');
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Upload for PDFs */}
      {contentType === "pdf" && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-700">
            Upload PDF Document <span className="text-red-500">*</span>
            <span className="text-xs text-slate-500 ml-2 font-normal">
              ({config.hint})
            </span>
          </Label>
          <FileUpload
            nodeId={nodeId}
            onUploadComplete={handleFileUploadComplete}
            onValidationError={handleFileUploadError}
            onUploadStateChange={handleUploadStateChange}
            accept=".pdf"
            maxSize={40} // 40MB limit for PDFs
            allowMultiple={false}
            uploadEndpoint="documents"
            className="border-2 border-dashed border-purple-200"
          />
          {(uploadedFileName || contentUrl) && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              ✅ PDF uploaded successfully
            </div>
          )}
        </div>
      )}

      {/* Text Content and Resource Link Description */}
      {(contentType === "text" || contentType === "resource_link") && (
        <div className="space-y-2">
          <Label htmlFor="content_body">
            {contentType === "resource_link" ? "Description" : "Content"} *
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
              errors.some(
                (e) => e.includes("Content body") || e.includes("Description")
              )
                ? "border-red-500"
                : ""
            }`}
            placeholder={
              contentType === "resource_link"
                ? "Describe what this resource is and why it's useful for students. e.g., 'Essential reading on machine learning fundamentals' or 'Python documentation for reference'"
                : config.placeholder
            }
          />
          <div className="text-xs text-muted-foreground">
            {contentType === "resource_link" ? (
              <>
                📚 Tip: Explain what students will find in this resource and how
                it relates to the lesson
              </>
            ) : (
              <div className="space-y-1">
                <div>
                  💡 <strong>HTML:</strong> Use &lt;p&gt; for paragraphs,
                  &lt;h1&gt; for headings, &lt;strong&gt; for bold text
                </div>
                <div>
                  📝 <strong>Markdown:</strong> Use # for headings, **bold**,
                  *italic*, - for lists
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          size="sm"
          disabled={isSaving || isUploading}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={
            isSaving ||
            isUploading ||
            ((contentType === "image" || contentType === "pdf") && !contentUrl)
          }
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : isUploading ? (
            <>
              <Upload className="h-4 w-4 mr-1" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              {existingContent ? "Update Content" : "Add Content"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// Content preview utilities
const getContentPreview = (item: NodeContent): string => {
  // If there's a title, use it as the primary preview
  if (item.content_title?.trim()) {
    const typeIcons = {
      video: "📹",
      canva_slide: "🎨",
      text: "📝",
      image: "🖼️",
      pdf: "📄",
      resource_link: "🔗",
    };
    const icon = typeIcons[item.content_type] || "";
    return `${icon} ${item.content_title}`;
  }

  // Fallback to content-based previews
  const previews = {
    video: () =>
      `📹 Video: ${item.content_url?.substring(0, 50)}${item.content_url && item.content_url.length > 50 ? "..." : ""}`,
    canva_slide: () =>
      `🎨 Canva: ${item.content_url?.substring(0, 50)}${item.content_url && item.content_url.length > 50 ? "..." : ""}`,
    text: () => {
      const bodyPreview =
        item.content_body?.replace(/<[^>]*>/g, "").substring(0, 50) || "";
      return `📝 Text: ${bodyPreview}${bodyPreview.length >= 50 ? "..." : ""}`;
    },
    image: () => {
      const fileName =
        item.content_url?.split("/").pop()?.substring(0, 30) || "";
      return `🖼️ Image: ${fileName}${fileName.length >= 30 ? "..." : ""}`;
    },
    pdf: () => {
      const fileName =
        item.content_url?.split("/").pop()?.substring(0, 30) || "";
      return `📄 PDF: ${fileName}${fileName.length >= 30 ? "..." : ""}`;
    },
    resource_link: () => {
      const descriptionPreview = item.content_body?.substring(0, 30) || "";
      const urlPreview = item.content_url?.substring(0, 25) || "";
      return `🔗 Resource: ${descriptionPreview}${descriptionPreview.length >= 30 ? "..." : ""} (${urlPreview}${urlPreview.length >= 25 ? "..." : ""})`;
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
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isFormActive = isAdding || editingId;

  // Sort content by display_order for rendering
  const sortedContent = useMemo(() => {
    return [...content].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [content]);

  const handleSave = useCallback(
    async (savedContent: NodeContent) => {
      if (
        !savedContent.id ||
        !savedContent.node_id ||
        !savedContent.content_type
      ) {
        console.error("Invalid content data:", savedContent);
        toast({
          title: "Invalid content data",
          description: "Content is missing required fields",
          variant: "destructive",
        });
        return;
      }

      const existingIndex = content.findIndex((c) => c.id === savedContent.id);

      // Signal start of content auto-save
      if (typeof (window as any).__startContentAutoSave === 'function') {
        (window as any).__startContentAutoSave();
      }

      try {
        let finalContent: NodeContent;

        if (existingIndex >= 0 && !savedContent.id.startsWith("temp_")) {
          // Update existing content in database
          console.log("✏️ Updating content in database:", savedContent.id);
          finalContent = await updateNodeContent(savedContent.id, {
            content_type: savedContent.content_type,
            content_title: savedContent.content_title,
            content_url: savedContent.content_url,
            content_body: savedContent.content_body,
            display_order: savedContent.display_order,
          });
          console.log("✅ Content updated in database:", finalContent);

          // Update local state
          const updatedContent = [...content];
          updatedContent[existingIndex] = finalContent;
          onContentChange(updatedContent);

          toast({ title: "Content updated successfully!" });

          // Signal content auto-save complete
          if (typeof (window as any).__finishContentAutoSave === 'function') {
            (window as any).__finishContentAutoSave();
          }
        } else {
          // Create new content in database
          console.log("➕ Creating content in database for node:", nodeId);
          console.log("Content data being sent:", {
            node_id: nodeId,
            content_type: savedContent.content_type,
            content_title: savedContent.content_title,
            content_url: savedContent.content_url,
            content_body: savedContent.content_body,
            display_order: savedContent.display_order,
          });

          finalContent = await createNodeContent({
            node_id: nodeId,
            content_type: savedContent.content_type,
            content_title: savedContent.content_title,
            content_url: savedContent.content_url,
            content_body: savedContent.content_body,
            display_order: savedContent.display_order ?? 0,
          });
          console.log("✅ Content created in database:", finalContent);

          // Add to local state
          onContentChange([...content, finalContent]);

          toast({ title: "Content added successfully!" });

          // Signal content auto-save complete
          if (typeof (window as any).__finishContentAutoSave === 'function') {
            (window as any).__finishContentAutoSave();
          }
        }

        // Reset form state
        setIsAdding(false);
        setEditingId(null);
      } catch (error) {
        console.error("❌ Failed to save content:", error);
        toast({
          title: "Failed to save content",
          description: (error as Error).message || "Unknown error",
          variant: "destructive",
        });
      }
    },
    [content, onContentChange, nodeId, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      // Signal start of content auto-save
      if (typeof (window as any).__startContentAutoSave === 'function') {
        (window as any).__startContentAutoSave();
      }

      try {
        // Delete from database if it's not a temp ID
        if (!id.startsWith("temp_")) {
          console.log("🗑️ Deleting content from database:", id);
          await deleteNodeContent(id);
          console.log("✅ Content deleted from database");
        }

        // Update local state
        onContentChange(content.filter((c) => c.id !== id));
        toast({ title: "Content deleted successfully!" });

        // Signal content auto-save complete
        if (typeof (window as any).__finishContentAutoSave === 'function') {
          (window as any).__finishContentAutoSave();
        }
      } catch (error) {
        console.error("❌ Failed to delete content:", error);
        toast({
          title: "Failed to delete content",
          description: (error as Error).message || "Unknown error",
          variant: "destructive",
        });
      }
    },
    [content, onContentChange, toast]
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

  // Reordering functions
  const moveContentUp = useCallback(
    async (index: number) => {
      if (index === 0) return; // Already at top
      const newContent = [...sortedContent];

      // Swap items
      [newContent[index - 1], newContent[index]] = [
        newContent[index],
        newContent[index - 1],
      ];

      // Update display_order for all items to match their new positions
      const updatedContent = newContent.map((item, idx) => ({
        ...item,
        display_order: idx,
      }));

      // Update in local state immediately for UI responsiveness
      onContentChange(updatedContent);

      // Update the two affected items in database
      try {
        await Promise.all([
          updateNodeContent(updatedContent[index - 1].id, {
            display_order: index - 1,
          }),
          updateNodeContent(updatedContent[index].id, {
            display_order: index,
          }),
        ]);
      } catch (error) {
        console.error("Failed to update content order:", error);
        toast({
          title: "Order update failed",
          description: "The order was not saved to the database",
          variant: "destructive",
        });
      }

      toast({
        title: "Content reordered",
        description: "Moved up in the list",
      });
    },
    [sortedContent, onContentChange, toast]
  );

  const moveContentDown = useCallback(
    async (index: number) => {
      if (index === sortedContent.length - 1) return; // Already at bottom
      const newContent = [...sortedContent];

      // Swap items
      [newContent[index], newContent[index + 1]] = [
        newContent[index + 1],
        newContent[index],
      ];

      // Update display_order for all items to match their new positions
      const updatedContent = newContent.map((item, idx) => ({
        ...item,
        display_order: idx,
      }));

      // Update in local state immediately for UI responsiveness
      onContentChange(updatedContent);

      // Update the two affected items in database
      try {
        await Promise.all([
          updateNodeContent(updatedContent[index].id, {
            display_order: index,
          }),
          updateNodeContent(updatedContent[index + 1].id, {
            display_order: index + 1,
          }),
        ]);
      } catch (error) {
        console.error("Failed to update content order:", error);
        toast({
          title: "Order update failed",
          description: "The order was not saved to the database",
          variant: "destructive",
        });
      }

      toast({
        title: "Content reordered",
        description: "Moved down in the list",
      });
    },
    [sortedContent, onContentChange, toast]
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
        <p>↕️ Use the up/down arrows to reorder content items</p>
        <p>
          🎯 Mix different content types to create engaging learning experiences
        </p>
      </div>
    ),
    []
  );

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
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
            <PlusCircle className="h-3 w-3 mr-1 my-2" />
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
              contentCount={content.length}
              onSave={handleSave}
              onCancel={handleCancelForm}
            />
          </div>
        </div>
      )}

      {/* Content list */}
      <div className="space-y-2 pb-4">
        {sortedContent.map((item, index) => (
          <Card key={item.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              {editingId === item.id ? (
                <div className="border border-yellow-300 rounded-lg p-1 bg-yellow-50 max-h-[65vh] overflow-hidden">
                  <div className="max-h-[60vh] overflow-y-auto">
                    <ContentForm
                      nodeId={nodeId}
                      existingContent={item}
                      contentCount={content.length}
                      onSave={handleSave}
                      onCancel={handleCancelForm}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveContentUp(index)}
                          className="h-5 w-6 p-0 hover:bg-blue-100"
                          disabled={index === 0 || !!isFormActive}
                          title="Move up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveContentDown(index)}
                          className="h-5 w-6 p-0 hover:bg-blue-100"
                          disabled={index === sortedContent.length - 1 || !!isFormActive}
                          title="Move down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

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
                        disabled={!!isFormActive}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Image Preview in List */}
                  {item.content_type === "image" && item.content_url && (
                    <div className="mt-2 border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                      <img
                        src={item.content_url}
                        alt={item.content_title || "Image content"}
                        className="w-full h-auto object-contain max-h-48"
                        loading="lazy"
                        onError={(e) => {
                          // Hide image if it fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          console.error('Failed to load image thumbnail');
                        }}
                      />
                    </div>
                  )}
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
