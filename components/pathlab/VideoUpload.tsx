"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Video, AlertCircle, Check, HardDrive } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface VideoUploadProps {
  onUploadComplete: (url: string) => void;
  initialUrl?: string;
  initialFileSize?: number; // File size in bytes (if known)
  maxSizeMB?: number; // Max file size in MB (default 50MB for free tier)
  acceptedFormats?: string[]; // Accepted video formats (default: mp4, webm, mov, avi, mpeg)
}

const DEFAULT_MAX_SIZE_MB = 50;
const DEFAULT_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];

export function VideoUpload({
  onUploadComplete,
  initialUrl = "",
  initialFileSize,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  acceptedFormats = DEFAULT_FORMATS,
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(initialUrl);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(initialFileSize || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [totalStorageUsed, setTotalStorageUsed] = useState<number | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Fetch total storage usage
  useEffect(() => {
    const fetchStorageUsage = async () => {
      setIsLoadingStorage(true);
      try {
        const { data, error } = await supabase.storage
          .from('pathlab-videos')
          .list('pathlab', {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (error) throw error;

        if (data) {
          const totalBytes = data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
          setTotalStorageUsed(totalBytes);
        }
      } catch (error) {
        console.error('Error fetching storage usage:', error);
      } finally {
        setIsLoadingStorage(false);
      }
    };

    fetchStorageUsage();
  }, []); // Only fetch once on mount — storage usage doesn't need to update in real-time

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Validate file size and type
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `Invalid file type. Please upload a video file (${acceptedFormats.map(f => f.split('/')[1]).join(', ')}).`;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${maxSizeMB}MB.`;
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Set selected file
    setSelectedFile(file);

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = `pathlab/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('pathlab-videos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pathlab-videos')
        .getPublicUrl(filePath);

      // Update state
      setVideoUrl(publicUrl);
      setUploadedFileSize(selectedFile.size); // Save file size for display
      onUploadComplete(publicUrl);

      // Show success message with file size
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      toast.success(`Video uploaded successfully! (${fileSizeMB} MB stored)`, {
        description: `Storage used: ${fileSizeMB} MB of your 1000 MB free tier`,
      });

      // Clear selected file and preview
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error(error?.message || 'Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle clear
  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle remove uploaded video
  const handleRemove = () => {
    setVideoUrl('');
    setUploadedFileSize(null);
    onUploadComplete('');
    toast.success('Video removed');
  };

  return (
    <div className="space-y-4">
      {/* Upload Status */}
      {videoUrl && !selectedFile && (
        <div className="p-4 rounded-lg bg-green-950/30 border border-green-800/50">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-300">Video Uploaded</p>
              {uploadedFileSize && (
                <p className="text-sm text-green-200/80 mt-1">
                  <strong>{formatFileSize(uploadedFileSize)}</strong> stored in your Supabase bucket
                </p>
              )}
              <p className="text-xs text-green-200/60 mt-1 break-all">{videoUrl}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="mt-3"
              >
                <X className="w-4 h-4 mr-2" />
                Remove Video
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Selection */}
      {!videoUrl && !selectedFile && (
        <div>
          <Label htmlFor="video-file">Select Video File</Label>
          <div className="mt-2">
            <Input
              ref={fileInputRef}
              id="video-file"
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={handleFileSelect}
              className="bg-background"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Max file size: {maxSizeMB}MB. Supported formats: MP4, WebM, MOV, AVI, MPEG
          </p>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && !isUploading && (
        <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-800/50">
          <div className="flex items-start gap-3">
            <Video className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-300">{selectedFile.name}</p>
              <p className="text-sm text-blue-200/80 mt-1">
                Size: {formatFileSize(selectedFile.size)}
              </p>
              {previewUrl && (
                <video
                  src={previewUrl}
                  controls
                  className="mt-3 w-full max-w-md rounded-lg"
                  style={{ maxHeight: '200px' }}
                />
              )}
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={isUploading}
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-800/50">
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <p className="font-semibold text-blue-300">Uploading video...</p>
              <p className="text-sm text-blue-200/80 mt-1">{selectedFile?.name}</p>
              <div className="mt-3">
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      {!videoUrl && !selectedFile && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                <strong>Tips for best quality:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• Keep videos under {maxSizeMB}MB (compress if needed)</li>
                <li>• Use MP4 format for best compatibility</li>
                <li>• 720p resolution is recommended for short videos</li>
                <li>• Videos are automatically served via CDN for fast playback</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Storage Usage Indicator */}
      {totalStorageUsed !== null && (
        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
          <div className="flex items-start gap-2">
            <HardDrive className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-300">
                  PathLab Video Storage
                </p>
                <p className="text-xs text-slate-400">
                  {formatFileSize(totalStorageUsed)} / 1000 MB
                </p>
              </div>
              <Progress
                value={(totalStorageUsed / (1000 * 1024 * 1024)) * 100}
                className="h-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                {((totalStorageUsed / (1000 * 1024 * 1024)) * 100).toFixed(1)}% of free tier used
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
