import { encode } from 'blurhash';
import crypto from 'crypto';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
  blurhash: string;
  fileName: string;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  blurhashComponents?: [number, number]; // [x, y] components for blurhash
}

export class ImageProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

// Supported image MIME types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff'
] as const;

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export class ImageProcessor {
  /**
   * Validate image file type and size
   */
  static validateImage(buffer: Buffer, mimeType: string): void {
    if (!SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType)) {
      throw new ImageProcessingError(
        `Unsupported image format: ${mimeType}. Supported formats: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
      );
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new ImageProcessingError(
        `Image file too large: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Basic magic number validation
    if (!this.isValidImageBuffer(buffer)) {
      throw new ImageProcessingError('Invalid image file: corrupted or not a valid image');
    }
  }

  /**
   * Check if buffer contains valid image data by examining magic numbers
   */
  private static isValidImageBuffer(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;

    // Check common image format magic numbers
    const magicNumbers = [
      [0xFF, 0xD8, 0xFF], // JPEG
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0x52, 0x49, 0x46, 0x46], // WEBP (starts with RIFF)
      [0x47, 0x49, 0x46], // GIF
      [0x42, 0x4D], // BMP
      [0x49, 0x49, 0x2A, 0x00], // TIFF (little endian)
      [0x4D, 0x4D, 0x00, 0x2A], // TIFF (big endian)
    ];

    return magicNumbers.some(magic =>
      magic.every((byte, index) => buffer[index] === byte)
    );
  }

  /**
   * Process image: resize, optimize, and generate blurhash
   * Note: This is a server-side only function due to sharp dependency
   */
  static async processImage(
    inputBuffer: Buffer,
    originalFileName: string,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    try {
      // Dynamic import of sharp (server-side only)
      const sharp = await import('sharp').catch(() => {
        throw new ImageProcessingError(
          'Image processing is only available on the server. Install sharp: npm install sharp'
        );
      });

      const {
        maxWidth = 1200,
        maxHeight = 800,
        quality = 85,
        format = 'webp',
        blurhashComponents = [4, 3]
      } = options;

      // Get image metadata
      const sharpInstance = sharp.default(inputBuffer);
      const metadata = await sharpInstance.metadata();

      if (!metadata.width || !metadata.height) {
        throw new ImageProcessingError('Unable to read image dimensions');
      }

      // Calculate new dimensions while maintaining aspect ratio
      const aspectRatio = metadata.width / metadata.height;
      let newWidth = metadata.width;
      let newHeight = metadata.height;

      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        newHeight = Math.round(newWidth / aspectRatio);
      }

      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = Math.round(newHeight * aspectRatio);
      }

      // Process the image
      const processedBuffer = await sharpInstance
        .resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat(format, {
          quality,
          progressive: true,
          effort: 6 // Higher effort for better compression
        })
        .toBuffer();

      // Generate blurhash from a smaller version for better performance
      const blurhashBuffer = await sharp.default(inputBuffer)
        .resize(32, 32, { fit: 'inside' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const blurhash = encode(
        new Uint8ClampedArray(blurhashBuffer.data),
        blurhashBuffer.info.width,
        blurhashBuffer.info.height,
        blurhashComponents[0],
        blurhashComponents[1]
      );

      // Generate unique filename
      const fileHash = crypto.createHash('md5').update(processedBuffer).digest('hex').substring(0, 8);
      const timestamp = Date.now();
      const sanitizedName = originalFileName
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[^a-zA-Z0-9_-]/g, '_') // Sanitize
        .substring(0, 50); // Limit length

      const fileName = `${sanitizedName}_${timestamp}_${fileHash}.${format}`;

      return {
        buffer: processedBuffer,
        width: newWidth,
        height: newHeight,
        format,
        size: processedBuffer.length,
        blurhash,
        fileName
      };

    } catch (error) {
      if (error instanceof ImageProcessingError) {
        throw error;
      }
      throw new ImageProcessingError(
        `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate blurhash from base64 image (client-side compatible)
   */
  static async generateBlurhashFromBase64(
    base64Data: string,
    components: [number, number] = [4, 3]
  ): Promise<string> {
    if (typeof window === 'undefined') {
      throw new ImageProcessingError('This function is for client-side use only');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new ImageProcessingError('Could not get canvas context'));
            return;
          }

          // Resize to small dimensions for blurhash
          const size = 32;
          canvas.width = size;
          canvas.height = size;

          ctx.drawImage(img, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);

          const blurhash = encode(
            imageData.data,
            size,
            size,
            components[0],
            components[1]
          );

          resolve(blurhash);
        } catch (error) {
          reject(new ImageProcessingError(
            `Failed to generate blurhash: ${error instanceof Error ? error.message : 'Unknown error'}`
          ));
        }
      };

      img.onerror = () => {
        reject(new ImageProcessingError('Failed to load image for blurhash generation'));
      };

      img.src = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
    });
  }

  /**
   * Create thumbnail version of processed image
   */
  static async createThumbnail(
    processedImage: ProcessedImage,
    maxSize: number = 150
  ): Promise<ProcessedImage> {
    try {
      const sharp = await import('sharp').catch(() => {
        throw new ImageProcessingError('Thumbnail generation requires sharp (server-side only)');
      });

      const thumbnailBuffer = await sharp.default(processedImage.buffer)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat('webp', { quality: 75 })
        .toBuffer();

      const metadata = await sharp.default(thumbnailBuffer).metadata();

      return {
        ...processedImage,
        buffer: thumbnailBuffer,
        width: metadata.width || maxSize,
        height: metadata.height || maxSize,
        size: thumbnailBuffer.length,
        fileName: processedImage.fileName.replace(/\.(\w+)$/, '_thumb.$1')
      };

    } catch (error) {
      throw new ImageProcessingError(
        `Failed to create thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract dominant colors from image (for future enhancements)
   */
  static async extractDominantColors(
    buffer: Buffer,
    colorCount: number = 5
  ): Promise<Array<{r: number, g: number, b: number, hex: string}>> {
    try {
      const sharp = await import('sharp').catch(() => {
        throw new ImageProcessingError('Color extraction requires sharp (server-side only)');
      });

      // Resize to small image for faster processing
      const smallBuffer = await sharp.default(buffer)
        .resize(50, 50, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = smallBuffer.data;
      const colorMap = new Map<string, number>();

      // Sample colors and count frequency
      for (let i = 0; i < pixels.length; i += 4) {
        const r = Math.floor(pixels[i] / 25) * 25;
        const g = Math.floor(pixels[i + 1] / 25) * 25;
        const b = Math.floor(pixels[i + 2] / 25) * 25;
        const key = `${r},${g},${b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }

      // Get most frequent colors
      return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount)
        .map(([colorKey]) => {
          const [r, g, b] = colorKey.split(',').map(Number);
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          return { r, g, b, hex };
        });

    } catch (error) {
      throw new ImageProcessingError(
        `Failed to extract colors: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}