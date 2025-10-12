"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { OptimizedImage } from "./OptimizedImage";
import {
  Upload,
  X,
  Camera,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface UploadedImage {
  url: string;
  blurhash?: string;
  fileName: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

interface ImageUploadProps {
  mapId?: string; // Optional for new maps
  currentImage?: {
    url?: string;
    blurhash?: string;
  };
  onImageUploaded: (image: UploadedImage) => void;
  onImageRemoved: () => void;
  disabled?: boolean;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ImageUpload({
  mapId,
  currentImage,
  onImageUploaded,
  onImageRemoved,
  disabled = false,
  className = "",
  maxWidth = 1200,
  maxHeight = 800,
  quality = 85,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateFile = useCallback((file: File): string | null => {
    if (!file) return "No file selected";

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return `Unsupported file type. Please use: ${SUPPORTED_TYPES.map((t) => t.split("/")[1]).join(", ")}`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    if (file.name.length > 255) {
      return "Filename too long (max 255 characters)";
    }

    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        toast({
          title: "Invalid file",
          description: error,
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setUploadError(null);

      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
    },
    [validateFile, previewUrl, toast]
  );

  const uploadImage = useCallback(
    async (file: File) => {
      if (!mapId) {
        setUploadError("Map ID is required for upload");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mapId", mapId);
        formData.append("maxWidth", maxWidth.toString());
        formData.append("maxHeight", maxHeight.toString());
        formData.append("quality", quality.toString());

        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 10;
          });
        }, 200);

        const response = await fetch("/api/maps/upload-cover-image", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Upload failed: ${response.statusText}`
          );
        }

        setUploadProgress(100);

        const result = await response.json();

        // Clean up preview
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }

        onImageUploaded({
          url: result.url,
          blurhash: result.blurhash,
          fileName: result.fileName,
          width: result.width,
          height: result.height,
          size: result.size,
          format: result.format,
        });

        setSelectedFile(null);

        toast({
          title: "Upload successful",
          description: "Cover image has been updated",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setUploadError(errorMessage);

        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [mapId, maxWidth, maxHeight, quality, previewUrl, onImageUploaded, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith("image/"));

      if (imageFile) {
        handleFileSelect(imageFile);
      } else {
        toast({
          title: "Invalid file",
          description: "Please drop an image file",
          variant: "destructive",
        });
      }
    },
    [disabled, isUploading, handleFileSelect, toast]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleRemoveImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setUploadError(null);
    onImageRemoved();
  }, [previewUrl, onImageRemoved]);

  const handleRetry = useCallback(() => {
    if (selectedFile) {
      uploadImage(selectedFile);
    }
  }, [selectedFile, uploadImage]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hasCurrentImage = currentImage?.url && currentImage.url.trim() !== "";
  const hasPreview = previewUrl || selectedFile;
  const showDropZone = !hasCurrentImage && !hasPreview;

  // Debug logging
  useEffect(() => {
    console.log("ImageUpload debug:", {
      hasCurrentImage,
      currentImageUrl: currentImage?.url,
      currentImageBlurhash: currentImage?.blurhash,
      hasPreview,
      showDropZone,
    });
  }, [
    hasCurrentImage,
    currentImage?.url,
    currentImage?.blurhash,
    hasPreview,
    showDropZone,
  ]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_TYPES.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Current image display */}
      {hasCurrentImage && !hasPreview && (
        <div className="relative group max-w-xs mx-auto">
          <div className="aspect-square w-full rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
            <OptimizedImage
              src={currentImage!.url!}
              blurhash={currentImage?.blurhash}
              alt="Current cover image"
              fill
              className="object-cover w-full h-full"
            />
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRemoveImage}
              disabled={disabled || isUploading}
              className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              onClick={openFileDialog}
              disabled={disabled || isUploading}
              className="h-8"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span className="text-xs">Replace</span>
            </Button>
          </div>
        </div>
      )}

      {/* Preview of selected file */}
      {hasPreview && (
        <div className="space-y-3">
          <div className="relative group max-w-xs mx-auto">
            <div className="aspect-square w-full rounded-lg overflow-hidden border-2 border-blue-200">
              <img
                src={previewUrl || ""}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute top-2 right-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                disabled={isUploading}
                className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading and optimizing image...
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700 flex-1">{uploadError}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={!selectedFile || isUploading}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Upload button */}
          {!isUploading && !uploadError && selectedFile && mapId && (
            <Button
              onClick={() => uploadImage(selectedFile)}
              disabled={disabled}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Upload Cover Image
            </Button>
          )}

          {!mapId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <AlertCircle className="h-4 w-4" />
                Image will be uploaded when you create the map
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drop zone */}
      {showDropZone && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={disabled ? undefined : openFileDialog}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isDragging ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              {isDragging ? (
                <Upload className="h-6 w-6 text-blue-600" />
              ) : (
                <Camera className="h-6 w-6 text-gray-600" />
              )}
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {isDragging ? "Drop image here" : "Add cover image"}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop an image, or click to select
              </p>
              <p className="text-xs text-gray-400">
                Supports: JPG, PNG, WebP, GIF • Max: 10MB
              </p>
            </div>

            {!isDragging && (
              <Button variant="outline" disabled={disabled}>
                Choose File
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
