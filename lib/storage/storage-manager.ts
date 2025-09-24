import { b2 } from '../backblaze';
import {
  ImageProcessor,
  ProcessedImage,
  ImageProcessingOptions,
  ImageProcessingError,
  SUPPORTED_IMAGE_TYPES
} from './image-processor';

export interface UploadResult {
  fileId: string;
  fileName: string;
  url: string;
  blurhash: string;
  width: number;
  height: number;
  size: number;
  format: string;
  key: string; // For deletion
}

export interface UploadOptions extends ImageProcessingOptions {
  generateThumbnail?: boolean;
  metadata?: Record<string, string>;
}

export interface UploadProgress {
  stage: 'validating' | 'processing' | 'uploading' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export class StorageManagerError extends Error {
  constructor(
    message: string,
    public cause?: Error,
    public stage?: string
  ) {
    super(message);
    this.name = 'StorageManagerError';
  }
}

export class StorageManager {
  constructor() {
    // Uses the singleton b2 client from lib/backblaze.ts
  }

  /**
   * Upload an image file to B2 storage with processing
   */
  async uploadImage(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Stage 1: Validation
      onProgress?.({
        stage: 'validating',
        progress: 10,
        message: 'Validating image file...'
      });

      ImageProcessor.validateImage(fileBuffer, mimeType);

      // Stage 2: Processing
      onProgress?.({
        stage: 'processing',
        progress: 30,
        message: 'Processing and optimizing image...'
      });

      const processedImage = await ImageProcessor.processImage(
        fileBuffer,
        fileName,
        options
      );

      // Stage 3: Upload to B2
      onProgress?.({
        stage: 'uploading',
        progress: 60,
        message: 'Uploading to cloud storage...'
      });

      const uploadResponse = await b2.uploadImageBuffer(
        processedImage.buffer,
        processedImage.fileName,
        `image/${processedImage.format}`,
        {
          originalName: fileName,
          blurhash: processedImage.blurhash,
          width: processedImage.width,
          height: processedImage.height,
          ...options.metadata
        }
      );

      // Stage 4: Generate thumbnail if requested
      let thumbnailResult: UploadResult | undefined;
      if (options.generateThumbnail) {
        onProgress?.({
          stage: 'uploading',
          progress: 80,
          message: 'Creating thumbnail...'
        });

        try {
          const thumbnail = await ImageProcessor.createThumbnail(processedImage);
          const thumbnailUpload = await b2.uploadImageBuffer(
            thumbnail.buffer,
            thumbnail.fileName,
            `image/${thumbnail.format}`,
            {
              originalName: fileName,
              blurhash: thumbnail.blurhash,
              width: thumbnail.width,
              height: thumbnail.height,
              isThumbnail: 'true',
              parentFile: processedImage.fileName,
              ...options.metadata
            }
          );

          thumbnailResult = {
            fileId: thumbnailUpload.fileId,
            fileName: thumbnailUpload.fileName,
            url: thumbnailUpload.fileUrl,
            blurhash: thumbnail.blurhash,
            width: thumbnail.width,
            height: thumbnail.height,
            size: thumbnail.size,
            format: thumbnail.format,
            key: thumbnail.fileName
          };
        } catch (error) {
          console.warn('Thumbnail generation failed:', error);
          // Continue without thumbnail - not critical
        }
      }

      // Stage 5: Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      });

      const result: UploadResult = {
        fileId: uploadResponse.fileId,
        fileName: uploadResponse.fileName,
        url: uploadResponse.fileUrl,
        blurhash: processedImage.blurhash,
        width: processedImage.width,
        height: processedImage.height,
        size: processedImage.size,
        format: processedImage.format,
        key: uploadResponse.fileName
      };

      return result;

    } catch (error) {
      const stage = error instanceof ImageProcessingError ? 'processing' : 'uploading';

      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ImageProcessingError) {
        throw new StorageManagerError(error.message, error, stage);
      }

      throw new StorageManagerError(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        stage
      );
    }
  }

  /**
   * Delete an image file from B2 storage
   */
  async deleteImage(fileName: string): Promise<void> {
    try {
      await b2.deleteFile(fileName);
    } catch (error) {
      throw new StorageManagerError(
        `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Replace an existing image with a new one
   */
  async replaceImage(
    oldFileName: string,
    newFileBuffer: Buffer,
    newFileName: string,
    mimeType: string,
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Upload new image first
    const uploadResult = await this.uploadImage(
      newFileBuffer,
      newFileName,
      mimeType,
      options,
      onProgress
    );

    // Delete old image (don't fail the operation if this fails)
    try {
      await this.deleteImage(oldFileName);
    } catch (error) {
      console.warn('Failed to delete old image during replacement:', error);
      // Continue - the new image was uploaded successfully
    }

    return uploadResult;
  }

  /**
   * Get image metadata without downloading
   */
  getImageUrl(fileName: string): string {
    // Construct URL using the same pattern as in the backblaze client
    const endpoint = process.env.B2_ENDPOINT || "s3.us-west-000.backblazeb2.com";
    const bucketName = process.env.B2_BUCKET_NAME!;
    return `https://${bucketName}.${endpoint}/${fileName}`;
  }

  /**
   * Batch upload multiple images
   */
  async uploadMultipleImages(
    files: Array<{ buffer: Buffer; fileName: string; mimeType: string }>,
    options: UploadOptions = {},
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadImage(
          files[i].buffer,
          files[i].fileName,
          files[i].mimeType,
          options,
          (progress) => onProgress?.(i, progress)
        );
        results.push(result);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error : new Error('Unknown error')
        });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new StorageManagerError(
        `All uploads failed. First error: ${errors[0].error.message}`
      );
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} out of ${files.length} uploads failed:`, errors);
    }

    return results;
  }

  /**
   * Check if file type is supported
   */
  static isSupportedImageType(mimeType: string): boolean {
    return SUPPORTED_IMAGE_TYPES.includes(mimeType as any);
  }

  /**
   * Get supported image types
   */
  static getSupportedImageTypes(): readonly string[] {
    return SUPPORTED_IMAGE_TYPES;
  }

  /**
   * Clean up orphaned files (should be called by a scheduled job)
   */
  async cleanupOrphanedFiles(fileKeys: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const key of fileKeys) {
      try {
        // Note: For this to work, we need to store fileId in the database as well
        // For now, we'll implement a basic cleanup that logs what should be deleted
        console.log(`Would delete orphaned file: ${key}`);
        deleted.push(key);
      } catch (error) {
        console.error(`Failed to delete orphaned file ${key}:`, error);
        failed.push(key);
      }
    }

    return { deleted, failed };
  }

  /**
   * Validate upload limits and constraints
   */
  static validateUploadConstraints(
    fileSize: number,
    mimeType: string,
    fileName: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (fileSize > 10 * 1024 * 1024) { // 10MB
      errors.push(`File size too large: ${(fileSize / (1024 * 1024)).toFixed(2)}MB. Maximum: 10MB`);
    }

    // Check file type
    if (!StorageManager.isSupportedImageType(mimeType)) {
      errors.push(`Unsupported file type: ${mimeType}`);
    }

    // Check filename
    if (!fileName || fileName.trim().length === 0) {
      errors.push('Filename is required');
    }

    if (fileName.length > 255) {
      errors.push('Filename too long (max 255 characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const storageManager = new StorageManager();