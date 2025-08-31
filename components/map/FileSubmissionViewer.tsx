"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  ExternalLink,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface FileSubmissionViewerProps {
  fileUrls: string[];
  className?: string;
}

const getFileExtension = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.split('.').pop()?.toLowerCase() || '';
    
    // If no extension found from pathname, try to detect from content-type or URL patterns
    if (!extension && url.includes('image')) {
      return 'jpg'; // Default for images without extension
    }
    
    return extension;
  } catch {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    // If no extension found, try to detect from URL patterns
    if (!extension && url.includes('image')) {
      return 'jpg'; // Default for images without extension
    }
    
    return extension;
  }
};

const getFileName = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop() || 'Unknown file';
  } catch {
    return url.split('/').pop() || 'Unknown file';
  }
};

const getFileIcon = (extension: string) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const pdfExtensions = ['pdf'];
  
  if (imageExtensions.includes(extension)) {
    return <ImageIcon className="h-4 w-4" />;
  } else if (pdfExtensions.includes(extension)) {
    return <FileText className="h-4 w-4" />;
  } else {
    return <FileText className="h-4 w-4" />;
  }
};

const getFileTypeColor = (extension: string) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const pdfExtensions = ['pdf'];
  
  if (imageExtensions.includes(extension)) {
    return "bg-green-100 text-green-800 border-green-200";
  } else if (pdfExtensions.includes(extension)) {
    return "bg-red-100 text-red-800 border-red-200";
  } else {
    return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const FilePreview = ({ url, fileName, extension }: { url: string, fileName: string, extension: string }) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const pdfExtensions = ['pdf'];
  
  const isImage = imageExtensions.includes(extension);
  const isPdf = pdfExtensions.includes(extension);
  
  // Debug logging
  console.log(`File: ${fileName}, Extension: ${extension}, IsImage: ${isImage}`);
  
  // Show images by default, but keep PDFs hidden by default
  // Use a function to ensure proper initialization
  // For now, show all files by default for testing
  const [showPreview, setShowPreview] = useState(() => true);
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="border rounded-lg p-3 bg-white">
      {/* File Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getFileIcon(extension)}
          <span className="text-sm font-medium truncate" title={fileName}>
            {fileName}
          </span>
          <Badge variant="outline" className={`text-xs ${getFileTypeColor(extension)}`}>
            {extension.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {(isImage || isPdf) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="h-7 px-2"
              title={showPreview ? (isImage ? "Hide Image" : "Hide Preview") : (isImage ? "Show Image" : "Show Preview")}
            >
              {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(url, '_blank')}
            className="h-7 px-2"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              a.click();
            }}
            className="h-7 px-2"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* File Preview */}
      {showPreview && (
        <div className="mt-3 border-t pt-3">
          {/* Try to display as image first, regardless of extension */}
          {!imageError && (
            <div className="max-w-full">
              <img
                src={url}
                alt={fileName}
                className="max-w-full max-h-80 object-contain rounded border shadow-sm bg-gray-50 cursor-pointer hover:shadow-md transition-shadow"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
                onClick={() => window.open(url, '_blank')}
                title="Click to open full size in new tab"
              />
            </div>
          )}
          
          {/* Show error state for failed images */}
          {imageError && !isPdf && (
            <div className="flex items-center justify-center h-32 bg-gray-50 border rounded text-gray-500">
              <div className="text-center">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Unable to display as image</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(url, '_blank')}
                  className="mt-2"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open File
                </Button>
              </div>
            </div>
          )}
          
          {/* PDF preview for PDF files that failed as images */}
          {imageError && isPdf && (
            <div className="w-full">
              <iframe
                src={`${url}#view=FitH`}
                className="w-full h-96 border rounded"
                title={fileName}
              />
              <p className="text-xs text-gray-500 mt-2">
                If the PDF doesn't display correctly, <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">open it in a new tab</a>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function FileSubmissionViewer({ fileUrls, className = "" }: FileSubmissionViewerProps) {
  const [showAllFiles, setShowAllFiles] = useState(false);
  
  if (!fileUrls || fileUrls.length === 0) {
    return null;
  }
  
  const displayFiles = showAllFiles ? fileUrls : fileUrls.slice(0, 3);
  const remainingCount = fileUrls.length - 3;
  
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <strong className="text-sm">Submitted Files:</strong>
          <Badge variant="secondary" className="text-xs">
            {fileUrls.length} file{fileUrls.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        {fileUrls.length > 3 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAllFiles(!showAllFiles)}
            className="h-7"
          >
            {showAllFiles ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show All ({remainingCount} more)
              </>
            )}
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {displayFiles.map((url, index) => {
          const fileName = getFileName(url);
          const extension = getFileExtension(url);
          
          return (
            <FilePreview
              key={index}
              url={url}
              fileName={fileName}
              extension={extension}
            />
          );
        })}
      </div>
    </div>
  );
}