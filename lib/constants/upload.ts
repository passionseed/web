/**
 * Shared upload validation constants
 * Single source of truth for file upload rules across client and server
 */

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 40 * 1024 * 1024; // 40MB
export const MAX_GENERAL_SIZE = 10 * 1024 * 1024; // 10MB

// Maximum file name length
export const MAX_FILE_NAME_LENGTH = 255;

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
]);

export const ALLOWED_GENERAL_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/json",
  "text/csv",
]);

// Dangerous file extensions to block
export const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".scr",
  ".vbs",
  ".js",
  ".msi",
  ".app",
  ".deb",
  ".rpm",
  ".php",
  ".php5",
  ".phtml",
  ".html",
  ".htm",
  ".xhtml",
  ".sh",
  ".bash",
  ".pl",
  ".cgi",
  ".py",
  ".pyc",
  ".pyd",
  ".rb",
  ".asp",
  ".aspx",
  ".jsp",
  ".jar",
  ".class",
  ".dll",
  ".so",
  ".bin",
  ".svg",
];

// Upload configuration
export const MAX_CONCURRENT_UPLOADS = 3;
export const UPLOAD_TIMEOUT = 5 * 60 * 1000; // 5 minutes
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for resumable uploads

/**
 * Validate file size
 */
export function validateFileSize(
  fileSize: number,
  maxSize: number
): { valid: boolean; error?: string } {
  if (fileSize === 0) {
    return { valid: false, error: "File is empty" };
  }

  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate file name
 */
export function validateFileName(
  fileName: string
): { valid: boolean; error?: string } {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: "File name is required" };
  }

  if (fileName.length > MAX_FILE_NAME_LENGTH) {
    return { valid: false, error: "File name too long" };
  }

  // Check for dangerous extensions
  const lowerName = fileName.toLowerCase();
  if (DANGEROUS_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return {
      valid: false,
      error: "File type not allowed for security reasons",
    };
  }

  return { valid: true };
}

/**
 * Validate MIME type
 */
export function validateMimeType(
  mimeType: string,
  allowedTypes: Set<string>
): { valid: boolean; error?: string } {
  if (!mimeType) {
    return { valid: false, error: "File type is required" };
  }

  if (!allowedTypes.has(mimeType)) {
    return {
      valid: false,
      error: `File type '${mimeType}' is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Comprehensive file validation
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  mimeType: string,
  allowedTypes: Set<string>,
  maxSize: number
): { valid: boolean; error?: string } {
  // Validate file name
  const nameValidation = validateFileName(fileName);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  // Validate file size
  const sizeValidation = validateFileSize(fileSize, maxSize);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Validate MIME type
  const typeValidation = validateMimeType(mimeType, allowedTypes);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  return { valid: true };
}
