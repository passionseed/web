"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { useToast } from "./use-toast";
import {
  Upload,
  X,
  File,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Cloud,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { Progress } from "./progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileUploadProps {
  nodeId: string;
  onUploadComplete: (fileUrl: string, fileName: string) => void;
  onValidationError?: (error: string) => void;
  onUploadStateChange?: (isUploading: boolean) => void; // New prop to track upload state
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  allowMultiple?: boolean; // New prop to control multiple uploads
  uploadEndpoint?: "default" | "images" | "documents"; // New prop to specify endpoint
}

interface UploadedFile {
  name: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface UploadProgress {
  stage: "preparing" | "uploading" | "finalizing" | "complete" | "error";
  percentage: number;
  message: string;
}

export function FileUpload({
  nodeId,
  onUploadComplete,
  onValidationError,
  onUploadStateChange,
  accept = ".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.json,.csv",
  maxSize = 10,
  className = "",
  disabled = false,
  allowMultiple = true, // Default to true for multiple uploads
  uploadEndpoint = "default", // Default to the main upload endpoint
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]); // Changed to array for multiple files
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set()); // Track actively uploading files by unique ID
  const [isDragging, setIsDragging] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use effect to sync upload state with parent component
  useEffect(() => {
    const isCurrentlyUploading = uploadingFiles.size > 0;
    console.log(`Upload state changed: ${isCurrentlyUploading ? 'uploading' : 'idle'}, active uploads: ${uploadingFiles.size}`);
    
    if (onUploadStateChange) {
      onUploadStateChange(isCurrentlyUploading);
    }
  }, [uploadingFiles.size, onUploadStateChange]);

  // Helper function to remove upload ID
  const finishUpload = useCallback((uploadId: string) => {
    setUploadingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(uploadId);
      console.log(`Upload finished: ${uploadId}, remaining uploads: ${newSet.size}`);
      return newSet;
    });
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, []);

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      if (file.size > maxSize * 1024 * 1024) {
        return { valid: false, error: `File too large (max ${maxSize}MB)` };
      }

      const allowedTypes = accept.split(",").map((type) => type.trim());
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      if (!allowedTypes.includes(fileExtension)) {
        return { valid: false, error: "File type not supported" };
      }

      if (file.name.length > 255) {
        return { valid: false, error: "File name too long" };
      }

      return { valid: true };
    },
    [accept, maxSize]
  );

  const simulateProgress = useCallback((onComplete: () => void) => {
    let progress = 0;
    const stages: UploadProgress["stage"][] = [
      "preparing",
      "uploading",
      "finalizing",
    ];
    let currentStageIndex = 0;

    const updateProgress = () => {
      progress += Math.random() * 15 + 5; // 5-20% increments

      if (progress >= 100) {
        setUploadProgress({
          stage: "complete",
          percentage: 100,
          message: "Upload complete!",
        });
        setTimeout(onComplete, 500);
        return;
      }

      // Update stage based on progress
      if (progress > 80 && currentStageIndex < 2) {
        currentStageIndex = 2;
      } else if (progress > 30 && currentStageIndex < 1) {
        currentStageIndex = 1;
      }

      const messages = {
        preparing: "Preparing file...",
        uploading: "Uploading to cloud...",
        finalizing: "Finalizing upload...",
        complete: "Upload complete!",
        error: "Upload failed",
      };

      setUploadProgress({
        stage: stages[currentStageIndex],
        percentage: Math.min(progress, 95), // Cap at 95% until complete
        message: messages[stages[currentStageIndex]],
      });

      setTimeout(updateProgress, 200 + Math.random() * 300);
    };

    updateProgress();
  }, []);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        if (onValidationError) {
          onValidationError(validation.error || "Invalid file");
        } else {
          toast({
            title: "Invalid file",
            description: validation.error,
            variant: "destructive",
          });
        }
        return;
      }

      // Create unique ID for this upload
      const uploadId = `${file.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add to uploading files set
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.add(uploadId);
        console.log(`Upload started: ${uploadId}, total uploads: ${newSet.size}`);
        return newSet;
      });

      setUploadProgress({
        stage: "preparing",
        percentage: 0,
        message: "Starting upload...",
      });

      try {
        // For large files or documents, use streaming proxy
        const useStreamingUpload = file.size > 4 * 1024 * 1024 || uploadEndpoint === "documents";

        if (useStreamingUpload) {
          console.log("Using streaming upload for large file:", file.name, "size:", file.size);

          // Start progress simulation
          let uploadCompleted = false;
          simulateProgress(() => {
            uploadCompleted = true;
          });

          // Upload via streaming proxy endpoint
          console.log("Uploading via streaming proxy...");

          const response = await fetch("/api/upload/stream", {
            method: "POST",
            headers: {
              "x-node-id": nodeId,
              "x-file-name": file.name,
              "x-file-type": file.type,
              "x-file-size": file.size.toString(),
              "x-upload-type": uploadEndpoint === "documents" ? "map-content" : "submission",
            },
            body: file,
          });

          let result;
          try {
            result = await response.json();
          } catch (parseError) {
            console.error("Failed to parse response:", parseError);
            throw new Error("Invalid server response");
          }

          if (!response.ok) {
            console.error("Streaming upload failed:", response.status, result);
            throw new Error(result.error || `Server error (${response.status})`);
          }

          // Wait for progress animation if needed
          if (!uploadCompleted) {
            await new Promise((resolve) => {
              const checkCompletion = () => {
                if (uploadCompleted) {
                  resolve(void 0);
                } else {
                  setTimeout(checkCompletion, 100);
                }
              };
              checkCompletion();
            });
          }

          const uploadedFileData: UploadedFile = {
            name: result.fileName,
            originalName: result.originalName,
            url: result.fileUrl,
            size: result.size,
            type: result.type,
            uploadedAt: result.uploadedAt,
          };

          // Add to uploaded files array - handle single vs multiple file uploads
          if (allowMultiple) {
            setUploadedFiles((prev) => [...prev, uploadedFileData]);
          } else {
            setUploadedFiles([uploadedFileData]);
          }

          // Call parent callback
          onUploadComplete(result.fileUrl, result.fileName);

          toast({
            title: "Upload successful!",
            description: `${file.name} has been uploaded successfully.`,
          });
        } else {
          // Use traditional server upload for smaller files
          const formData = new FormData();
          formData.append("file", file);
          formData.append("nodeId", nodeId);

          // Start progress simulation
          let uploadCompleted = false;
          simulateProgress(() => {
            uploadCompleted = true;
          });

          // Determine the upload endpoint based on the uploadEndpoint prop
          const uploadUrl = uploadEndpoint === "images"
            ? "/api/upload/images"
            : uploadEndpoint === "documents"
            ? "/api/upload/documents"
            : "/api/upload";

          console.log("Uploading file:", file.name, "for node:", nodeId, "to endpoint:", uploadUrl);

          const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });

          let result;
          try {
            result = await response.json();
          } catch (parseError) {
            console.error("Failed to parse response:", parseError);
            throw new Error("Invalid server response");
          }

          if (!response.ok) {
            console.error(
              "Upload failed with status:",
              response.status,
              "Result:",
              result
            );

            // More specific error handling
            let errorMessage =
              result.error || `Server error (${response.status})`;

            if (response.status === 403) {
              errorMessage =
                "Access denied. Please check your permissions or try refreshing the page.";
            } else if (response.status === 401) {
              errorMessage = "Authentication required. Please log in again.";
            } else if (response.status === 400) {
              errorMessage =
                result.error ||
                "Invalid request. Please check your file and try again.";
            }

            // Add development details if available
            if (result.details && process.env.NODE_ENV === "development") {
              errorMessage += ` (Details: ${result.details})`;
            }

            throw new Error(errorMessage);
          }

          // Wait for progress animation if needed
          if (!uploadCompleted) {
            await new Promise((resolve) => {
              const checkCompletion = () => {
                if (uploadCompleted) {
                  resolve(void 0);
                } else {
                  setTimeout(checkCompletion, 100);
                }
              };
              checkCompletion();
            });
          }

          const uploadedFileData: UploadedFile = {
            name: result.fileName,
            originalName: result.originalName,
            url: result.fileUrl,
            size: result.size,
            type: result.type,
            uploadedAt: result.uploadedAt,
          };

          // Add to uploaded files array - handle single vs multiple file uploads
          if (allowMultiple) {
            setUploadedFiles((prev) => [...prev, uploadedFileData]);
          } else {
            // For single file uploads, replace the existing file
            setUploadedFiles([uploadedFileData]);
          }

          // Call parent callback
          onUploadComplete(result.fileUrl, result.fileName);

          toast({
            title: "Upload successful!",
            description: `${file.name} has been uploaded successfully.`,
          });
        }
      } catch (error) {
        console.error("Upload error:", error);

        setUploadProgress({
          stage: "error",
          percentage: 0,
          message: error instanceof Error ? error.message : "Upload failed",
        });

        toast({
          title: "Upload failed",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
          variant: "destructive",
        });

        // Immediately remove from uploading set on error, then clear UI after delay
        finishUpload(uploadId);
        setTimeout(() => {
          setUploadProgress(null);
        }, 5000);
      } finally {
        // Reset the input so the same file can be uploaded again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Clear progress after a brief delay to show completion
        setTimeout(() => {
          setUploadProgress(null);
          finishUpload(uploadId);
        }, 1000);
      }
    },
    [nodeId, onUploadComplete, onUploadStateChange, toast, validateFile, simulateProgress, finishUpload, uploadEndpoint, allowMultiple]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        Array.from(files).forEach((file) => handleFileUpload(file));
      }
    },
    [handleFileUpload]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        Array.from(files).forEach((file) => handleFileUpload(file));
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
    },
    []
  );

  const handleRemove = useCallback(
    async (index: number) => {
      const fileToRemove = uploadedFiles[index];
      if (!fileToRemove) return;

      try {
        const response = await fetch(
          `/api/upload?fileName=${encodeURIComponent(fileToRemove.name)}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete file");
        }

        // Remove from local state
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

        toast({
          title: "File removed",
          description: "Your file has been removed successfully.",
        });
      } catch (error) {
        console.error("Delete error:", error);
        toast({
          title: "Delete failed",
          description: "Failed to remove the file. Please try again.",
          variant: "destructive",
        });
      }
    },
    [uploadedFiles, toast]
  );

  const isImageFile = (fileName: string, fileType?: string): boolean => {
    const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    if (fileType && imageTypes.includes(fileType)) return true;

    const extension = fileName.toLowerCase().split(".").pop();
    return extension ? imageExtensions.includes(`.${extension}`) : false;
  };

  const getFileIcon = (fileName: string, fileType?: string) => {
    if (isImageFile(fileName, fileType)) {
      return <ImageIcon className="h-5 w-5 text-blue-600" />;
    }
    return <File className="h-5 w-5 text-blue-600" />;
  };

  const isUploading = uploadingFiles.size > 0;
  const hasError = uploadProgress?.stage === "error";

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {/* Show uploaded files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Uploaded Files ({uploadedFiles.length}):
            </p>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.originalName, file.type)}
                    <p className="text-sm font-medium text-green-900 truncate">
                      {file.originalName}
                    </p>
                  </div>

                  {/* Image thumbnail */}
                  {isImageFile(file.originalName, file.type) && (
                    <div className="mt-2">
                      <img
                        src={file.url}
                        alt={file.originalName}
                        className="max-w-32 max-h-24 object-cover rounded border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setExpandedImage(file.url)}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.type}</span>
                    <span>•</span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 hover:underline"
                    >
                      View file
                    </a>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="text-green-600 hover:text-green-800 hover:bg-green-100 flex-shrink-0"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {(isUploading || hasError) && (
          <div
            className={`p-6 border-2 rounded-lg ${
              hasError
                ? "border-red-300 bg-red-50"
                : "border-blue-300 bg-blue-50"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {hasError ? (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              ) : (
                <Cloud className="h-6 w-6 text-blue-600" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    hasError ? "text-red-900" : "text-blue-900"
                  }`}
                >
                  {uploadProgress?.message}
                </p>
                {!hasError && (
                  <div className="mt-2">
                    <Progress
                      value={uploadProgress?.percentage || 0}
                      className="h-2"
                    />
                    <p className="text-xs text-blue-700 mt-1">
                      {uploadProgress?.percentage.toFixed(0)}% complete
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Always show upload interface - even during upload for multiple files */}
        <div className="space-y-2">
          {/* For multiple file uploads - show "Add Another File" button when files are uploaded */}
          {allowMultiple && (uploadedFiles.length > 0 || isUploading) && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => !disabled && fileInputRef.current?.click()}
                disabled={disabled}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isUploading ? "Upload Another File" : "Add Another File"}
              </Button>
            </div>
          )}

          {/* For single file uploads - show compact "Replace File" button when file is uploaded */}
          {!allowMultiple && uploadedFiles.length > 0 && !isUploading && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => !disabled && fileInputRef.current?.click()}
                disabled={disabled}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace File
              </Button>
            </div>
          )}

          {/* Full upload interface when no files and not uploading */}
          {uploadedFiles.length === 0 && !isUploading && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : disabled
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-300 hover:border-gray-400 cursor-pointer"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !disabled && fileInputRef.current?.click()}
            >
              <Upload
                className={`h-8 w-8 mx-auto mb-4 ${
                  disabled ? "text-gray-400" : "text-gray-500"
                }`}
              />

              <div className="space-y-2">
                <p
                  className={`text-sm font-medium ${
                    disabled ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  {isDragging ? "Drop your file here" : "Upload your file"}
                </p>
                <p
                  className={`text-xs ${
                    disabled ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  Drag and drop or click to browse
                  <br />
                  Max {maxSize}MB • {uploadEndpoint === "images" ? "Images only" : uploadEndpoint === "documents" ? "PDF documents only" : "PDF, DOC, Images, and more"}
                </p>
              </div>

              {!disabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              )}
            </div>
          )}

          {/* Hidden file input */}
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled}
            multiple={allowMultiple}
            className="hidden"
          />

          {/* Help text */}
          {allowMultiple && (uploadedFiles.length > 0 || isUploading) && (
            <p className="text-xs text-muted-foreground text-center">
              You can upload multiple files. Each file must be under {maxSize}
              MB.
            </p>
          )}
          
          {!allowMultiple && uploadedFiles.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              File uploaded successfully. You can replace it by clicking "Replace File" above.
            </p>
          )}
        </div>
      </div>

      {/* Image Expansion Modal */}
      {expandedImage && (
        <Dialog
          open={!!expandedImage}
          onOpenChange={() => setExpandedImage(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative bg-black rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full"
                onClick={() => setExpandedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={expandedImage}
                alt="Expanded view"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
