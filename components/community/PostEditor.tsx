import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icons from "@/components/icons";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

type PostEditorProps = {
  onSubmit: (content: string, mediaIds?: string[]) => Promise<void>;
  isSubmitting?: boolean;
  placeholder?: string;
  initialContent?: string;
  className?: string;
};

export function PostEditor({
  onSubmit,
  isSubmitting = false,
  placeholder = "What's on your mind?",
  initialContent = "",
  className,
}: PostEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [media, setMedia] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && media.length === 0) return;

    try {
      let mediaIds: string[] = [];

      // In a real app, you would upload the media files to storage
      // and get back the file IDs/URLs
      if (media.length > 0) {
        setIsUploading(true);
        // Simulate file upload
        await new Promise((resolve) => setTimeout(resolve, 1000));
        mediaIds = media.map((_, i) => `media-${Date.now()}-${i}`);
      }

      await onSubmit(content, mediaIds);

      // Reset form
      setContent("");
      setMedia([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error submitting post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 4 - media.length);

    // Validate file types and sizes
    const validFiles = newFiles.filter((file) => {
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only images and videos are allowed.",
          variant: "destructive",
        });
        return false;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    setMedia((prev) => [...prev, ...validFiles]);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] resize-none pr-10"
          disabled={isSubmitting || isUploading}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {content.length}/1000
        </div>
      </div>

      {/* Media preview */}
      {media.length > 0 && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          }}
        >
          {media.map((file, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-muted rounded-md overflow-hidden">
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Icons.video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeMedia(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isSubmitting || isUploading}
              >
                <Icons.x className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || isUploading || media.length >= 4}
          >
            <Icons.image className="h-4 w-4" />
            <span className="sr-only">Add media</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={isSubmitting || isUploading || media.length >= 4}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isSubmitting || isUploading}
          >
            <Icons.smile className="h-4 w-4" />
            <span className="sr-only">Add emoji</span>
          </Button>
        </div>

        <Button
          type="submit"
          disabled={
            isSubmitting ||
            isUploading ||
            (!content.trim() && media.length === 0)
          }
        >
          {isSubmitting || isUploading ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              {isUploading ? "Uploading..." : "Posting..."}
            </>
          ) : (
            "Post"
          )}
        </Button>
      </div>

      {media.length > 0 && media.length < 4 && (
        <p className="text-xs text-muted-foreground text-center">
          You can add {4 - media.length} more{" "}
          {4 - media.length === 1 ? "file" : "files"}
        </p>
      )}

      {media.length >= 4 && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum 4 files per post
        </p>
      )}
    </form>
  );
}
