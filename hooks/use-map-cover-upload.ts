import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { processImage, validateImageFile } from "@/lib/image-processing";

interface UploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  mapId: string;
}

interface UseMapCoverUploadReturn {
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadMapCover: (file: File, mapId: string) => Promise<UploadResult | null>;
  reset: () => void;
}

export function useMapCoverUpload(): UseMapCoverUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadMapCover = async (file: File, mapId: string): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate file before processing
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid file");
      }

      console.log("🖼️ [Map Cover Upload Hook] Starting upload:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        mapId
      });

      // Process image for optimization
      setProgress(10);
      console.log("🎨 [Map Cover Upload Hook] Processing image...");
      
      const processedImage = await processImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        format: 'webp' // Use WebP for better compression
      });

      setProgress(30);

      console.log("✅ [Map Cover Upload Hook] Image processed:", {
        originalSize: `${(processedImage.originalSize / 1024 / 1024).toFixed(2)}MB`,
        compressedSize: `${(processedImage.compressedSize / 1024 / 1024).toFixed(2)}MB`,
        savings: `${processedImage.compressionRatio}%`,
        dimensions: `${processedImage.dimensions.width}x${processedImage.dimensions.height}`
      });

      // Create form data with processed image
      const formData = new FormData();
      formData.append("file", processedImage.file);
      formData.append("mapId", mapId);

      setProgress(40);

      // Track upload progress (simulated for now)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 300);

      // Upload to API
      const response = await fetch("/api/upload/map-covers", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      console.log("✅ [Map Cover Upload Hook] Upload successful:", result.data);

      toast({
        title: "Success",
        description: "Map cover uploaded successfully!",
        variant: "default",
      });

      return result.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      
      console.error("❌ [Map Cover Upload Hook] Upload failed:", err);
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setUploading(false);
    setProgress(0);
    setError(null);
  };

  return {
    uploading,
    progress,
    error,
    uploadMapCover,
    reset,
  };
}