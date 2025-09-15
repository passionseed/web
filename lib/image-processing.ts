/**
 * Client-side image processing utilities for compression and resizing
 */

interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'webp' | 'png';
}

interface ProcessedImage {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Resize and compress an image file on the client side
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        canvas.width = width;
        canvas.height = height;

        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'));
              return;
            }

            // Create new file with processed data
            const processedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, `.${format}`),
              {
                type: `image/${format}`,
                lastModified: Date.now(),
              }
            );

            const result: ProcessedImage = {
              file: processedFile,
              originalSize: file.size,
              compressedSize: blob.size,
              compressionRatio: Math.round((1 - blob.size / file.size) * 100),
              dimensions: { width, height }
            };

            console.log('🎨 [Image Processing] Compression complete:', {
              original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
              compressed: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
              savings: `${result.compressionRatio}%`,
              dimensions: `${width}x${height}`
            });

            resolve(result);
          },
          `image/${format}`,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create multiple image sizes for responsive loading
 */
export async function createImageVariants(
  file: File,
  options: { quality?: number; format?: 'jpeg' | 'webp' | 'png' } = {}
): Promise<{
  thumbnail: ProcessedImage;
  medium: ProcessedImage;
  large: ProcessedImage;
}> {
  const { quality = 0.8, format = 'jpeg' } = options;

  const [thumbnail, medium, large] = await Promise.all([
    processImage(file, { maxWidth: 400, maxHeight: 400, quality, format }),
    processImage(file, { maxWidth: 800, maxHeight: 800, quality, format }),
    processImage(file, { maxWidth: 1920, maxHeight: 1080, quality, format })
  ]);

  return { thumbnail, medium, large };
}

/**
 * Generate a blur placeholder from an image
 */
export async function generateBlurPlaceholder(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create very small canvas for blur effect
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Small size for blur effect
        canvas.width = 20;
        canvas.height = 20;

        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, 20, 20);

        // Convert to base64 data URL
        const dataURL = canvas.toDataURL('image/jpeg', 0.1);
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for blur placeholder'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  const maxSize = 50 * 1024 * 1024; // 50MB before processing
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
    };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type '${file.type}'. Please use JPG, PNG, GIF, or WebP` 
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (!validExtensions.some(ext => fileName.endsWith(ext))) {
    return {
      valid: false,
      error: "Invalid file extension. Please use .jpg, .jpeg, .png, .gif, or .webp",
    };
  }

  return { valid: true };
}