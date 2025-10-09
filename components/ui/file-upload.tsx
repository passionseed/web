"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { useToast } from "./use-toast";
import { PDFDocument } from "pdf-lib";
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
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map()); // Track abort controllers for each upload
  const { toast } = useToast();

  // Use effect to sync upload state with parent component
  useEffect(() => {
    const isCurrentlyUploading = uploadingFiles.size > 0;
    console.log(
      `Upload state changed: ${isCurrentlyUploading ? "uploading" : "idle"}, active uploads: ${uploadingFiles.size}`
    );

    if (onUploadStateChange) {
      onUploadStateChange(isCurrentlyUploading);
    }
  }, [uploadingFiles.size, onUploadStateChange]);

  // Component mount logging
  useEffect(() => {
    console.log("📦 FileUpload component mounted with uploadEndpoint:", uploadEndpoint);
  }, [uploadEndpoint]);

  // Cleanup: Abort all uploads on component unmount
  useEffect(() => {
    return () => {
      console.log("FileUpload component unmounting, aborting all uploads...");
      abortControllersRef.current.forEach((controller, uploadId) => {
        console.log(`Aborting upload: ${uploadId}`);
        controller.abort();
      });
      abortControllersRef.current.clear();
    };
  }, []);

  // Helper function to remove upload ID
  const finishUpload = useCallback((uploadId: string) => {
    setUploadingFiles((prev) => {
      const newSet = new Set(prev);
      newSet.delete(uploadId);
      console.log(
        `Upload finished: ${uploadId}, remaining uploads: ${newSet.size}`
      );
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
  // Helper to compress PDF before upload
  const compressPDF = useCallback(
    async (file: File): Promise<File> => {
      try {
        console.log(`📄 Starting PDF compression for: ${file.name}`);
        console.log(`📦 Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

        setUploadProgress({
          stage: "preparing",
          percentage: 10,
          message: "Compressing PDF...",
        });

        // Load PDF (with encryption support)
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true, // Handle encrypted PDFs
        });

        // Get document info
        const pageCount = pdfDoc.getPageCount();
        console.log(`PDF has ${pageCount} pages`);

        setUploadProgress({
          stage: "preparing",
          percentage: 30,
          message: `Optimizing ${pageCount} pages...`,
        });

        // Save with compression (lossless object stream optimization)
        // Save with compression
        const compressedBytes = await pdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 50,
        });

        // Convert to a true ArrayBuffer for File()
        const abuf = compressedBytes.buffer.slice(
          compressedBytes.byteOffset,
          compressedBytes.byteOffset + compressedBytes.byteLength
        ) as ArrayBuffer;

        // ✅ Safe browser-only File constructor
        let compressedFile = file;
        if (typeof window !== "undefined" && window.File) {
          compressedFile = new window.File([abuf], file.name, {
            type: "application/pdf",
            lastModified: Date.now(),
          });
        } else {
          console.warn("File constructor not available (running on server)");
        }

        // Calculate compression ratio
        const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
        const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
        const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);

        console.log(`✅ PDF compression complete!`);
        console.log(`   Original: ${originalSizeMB}MB`);
        console.log(`   Compressed: ${compressedSizeMB}MB`);
        console.log(`   Reduction: ${compressionRatio}%`);
        console.log(
          `PDF compressed: ${file.size} → ${compressedFile.size} bytes (${compressionRatio}% reduction)`
        );

        // Show compression result to user
        if (compressedFile.size < file.size) {
          toast({
            title: "PDF Compressed",
            description: `File size reduced by ${compressionRatio}% (${(
              file.size /
              1024 /
              1024
            ).toFixed(
              1
            )}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB)`,
          });
        }

        return compressedFile;
      } catch (error) {
        console.error("PDF compression failed:", error);
        toast({
          title: "Compression skipped",
          description: "Uploading original file...",
          variant: "default",
        });
        // Return original file if compression fails
        return file;
      }
    },
    [toast]
  );

  // Helper to upload large files in chunks (bypasses Vercel 4MB limit)
  const uploadInChunks = useCallback(
    async (
      file: File,
      nodeId: string,
      uploadType: string,
      signal: AbortSignal
    ): Promise<any> => {
      const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks (safely under 4MB limit)
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      console.log(
        `Uploading ${file.name} in ${totalChunks} chunks (${CHUNK_SIZE / 1024 / 1024}MB each)`
      );

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        console.log(
          `Uploading chunk ${chunkIndex + 1}/${totalChunks} (${chunk.size} bytes)`
        );

        // Update progress based on chunks uploaded
        const percentage = Math.round(((chunkIndex + 0.5) / totalChunks) * 100);
        setUploadProgress({
          stage: "uploading",
          percentage,
          message: `Uploading chunk ${chunkIndex + 1} of ${totalChunks}...`,
        });

        const headers: Record<string, string> = {
          "x-upload-session-id": sessionId,
          "x-chunk-index": chunkIndex.toString(),
          "x-total-chunks": totalChunks.toString(),
          "x-node-id": nodeId,
          "x-upload-type": uploadType,
        };

        // First chunk includes file metadata
        if (chunkIndex === 0) {
          headers["x-file-name"] = file.name;
          headers["x-file-type"] = file.type;
          headers["x-file-size"] = file.size.toString();
        }

        const response = await fetch("/api/upload/chunk", {
          method: "POST",
          headers,
          body: chunk,
          signal,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || `Chunk ${chunkIndex + 1} upload failed`
          );
        }

        // Last chunk - upload complete
        if (result.complete) {
          console.log("All chunks uploaded successfully!");
          setUploadProgress({
            stage: "complete",
            percentage: 100,
            message: "Upload complete!",
          });
          return result;
        }

        console.log(
          `Chunk ${chunkIndex + 1}/${totalChunks} uploaded. Progress: ${result.chunksReceived}/${result.totalChunks}`
        );
      }

      throw new Error("Upload completed but no final result received");
    },
    []
  );

  // Helper to upload with real progress tracking using XMLHttpRequest
  const uploadWithProgress = useCallback(
    (
      url: string,
      body: FormData | File,
      headers: Record<string, string>,
      signal: AbortSignal
    ): Promise<Response> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);

            // Update stage based on progress
            let stage: UploadProgress["stage"] = "uploading";
            let message = "Uploading to cloud...";

            if (percentage < 5) {
              stage = "preparing";
              message = "Preparing file...";
            } else if (percentage >= 95) {
              stage = "finalizing";
              message = "Finalizing upload...";
            }

            setUploadProgress({
              stage,
              percentage,
              message,
            });

            console.log(
              `Upload progress: ${percentage}% (${event.loaded}/${event.total} bytes)`
            );
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          setUploadProgress({
            stage: "complete",
            percentage: 100,
            message: "Upload complete!",
          });

          // Convert XHR response to fetch Response format
          const responseText = xhr.responseText;

          // Parse headers from XHR
          const headersObject: Record<string, string> = {};
          xhr
            .getAllResponseHeaders()
            .split("\r\n")
            .filter(Boolean)
            .forEach((line) => {
              const colonIndex = line.indexOf(": ");
              if (colonIndex > -1) {
                const key = line.substring(0, colonIndex);
                const value = line.substring(colonIndex + 2);
                headersObject[key] = value;
              }
            });

          const response = new Response(responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(headersObject),
          });

          resolve(response);
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        // Handle abort signal
        signal.addEventListener("abort", () => {
          xhr.abort();
        });

        // Open and send request
        xhr.open("POST", url);

        // Set headers
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.send(body);
      });
    },
    []
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      console.log("🚀 handleFileUpload called with:", file.name, file.size, "bytes, type:", file.type);

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

      // Create abort controller for this upload
      const abortController = new AbortController();
      abortControllersRef.current.set(uploadId, abortController);

      // Add to uploading files set
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.add(uploadId);
        console.log(
          `Upload started: ${uploadId}, total uploads: ${newSet.size}`
        );
        return newSet;
      });

      setUploadProgress({
        stage: "preparing",
        percentage: 0,
        message: "Starting upload...",
      });

      try {
        // Compress PDF files before upload
        let fileToUpload = file;
        console.log("File upload check:", {
          fileName: file.name,
          fileType: file.type,
          uploadEndpoint: uploadEndpoint,
          isPDF: file.type === "application/pdf",
          isDocuments: uploadEndpoint === "documents",
          willCompress: file.type === "application/pdf" && uploadEndpoint === "documents"
        });

        if (file.type === "application/pdf" && uploadEndpoint === "documents") {
          console.log("🗜️ Compressing PDF before upload...");
          fileToUpload = await compressPDF(file);
          console.log("✅ Compression complete, uploading compressed file");
        } else {
          console.log("⏭️ Skipping compression (not a document PDF)");
        }

        // For large files, use chunked upload to bypass Vercel's 4MB limit
        const useChunkedUpload = fileToUpload.size > 4 * 1024 * 1024;

        if (useChunkedUpload) {
          console.log(
            "Using chunked upload for large file:",
            fileToUpload.name,
            "size:",
            fileToUpload.size
          );

          const result = await uploadInChunks(
            fileToUpload,
            nodeId,
            uploadEndpoint === "documents" ? "map-content" : "submission",
            abortController.signal
          );

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
          formData.append("file", fileToUpload);
          formData.append("nodeId", nodeId);

          // Determine the upload endpoint based on the uploadEndpoint prop
          const uploadUrl =
            uploadEndpoint === "images"
              ? "/api/upload/images"
              : uploadEndpoint === "documents"
                ? "/api/upload/documents"
                : "/api/upload";

          console.log(
            "Uploading file:",
            fileToUpload.name,
            "for node:",
            nodeId,
            "to endpoint:",
            uploadUrl
          );

          const response = await uploadWithProgress(
            uploadUrl,
            formData,
            {},
            abortController.signal
          );

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

        // Clear UI after delay to show error message
        setTimeout(() => {
          setUploadProgress(null);
        }, 5000);
      } finally {
        // Always finish upload tracking immediately to prevent race conditions
        finishUpload(uploadId);

        // Clean up abort controller
        abortControllersRef.current.delete(uploadId);

        // Reset the input so the same file can be uploaded again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Clear progress UI if not already cleared (success case)
        setTimeout(() => {
          setUploadProgress(null);
        }, 1000);
      }
    },
    [
      nodeId,
      onUploadComplete,
      toast,
      validateFile,
      compressPDF,
      uploadInChunks,
      uploadWithProgress,
      finishUpload,
      uploadEndpoint,
      allowMultiple,
    ]
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
                  Max {maxSize}MB •{" "}
                  {uploadEndpoint === "images"
                    ? "Images only"
                    : uploadEndpoint === "documents"
                      ? "PDF documents only"
                      : "PDF, DOC, Images, and more"}
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
              File uploaded successfully. You can replace it by clicking
              "Replace File" above.
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
