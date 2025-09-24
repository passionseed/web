"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { decode } from "blurhash";

interface OptimizedImageProps {
  src?: string;
  blurhash?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface BlurhashCanvasProps {
  hash: string;
  width: number;
  height: number;
  className?: string;
}

export function BlurhashCanvas({
  hash,
  width,
  height,
  className,
}: BlurhashCanvasProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) {
      setDataUrl(null);
      return;
    }

    try {
      const pixels = decode(hash, width, height);

      // Create canvas and draw pixels
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn('Could not get canvas context');
        return;
      }

      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);

      // Convert to data URL
      const url = canvas.toDataURL();
      setDataUrl(url);
    } catch (error) {
      console.error('Error decoding blurhash:', error);
      setDataUrl(null);
    }
  }, [hash, width, height]);

  if (!hash || !dataUrl) {
    return (
      <div className={`bg-gray-200 ${className || ""}`} style={{ width, height }} />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Loading..."
      width={width}
      height={height}
      className={`blur-sm ${className || ""}`}
      style={{ filter: "blur(4px)" }}
    />
  );
}

export function OptimizedImage({
  src,
  blurhash,
  alt,
  width,
  height,
  className = "",
  fallbackSrc,
  priority = false,
  sizes,
  fill = false,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Reset state when src changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setCurrentSrc(src);
  }, [src]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setImageError(true);

    // Try fallback source if available
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setImageError(false); // Reset error state to retry with fallback
      return;
    }

    const error = new Error(`Failed to load image: ${currentSrc}`);
    onError?.(error);
  }, [fallbackSrc, currentSrc, onError]);

  // If no src is provided, show placeholder
  if (!currentSrc) {
    return (
      <div
        className={`bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${className}`}
        style={fill ? {} : { width, height }}
      >
        <div className="text-gray-500 text-sm">No image</div>
      </div>
    );
  }

  // If image failed to load and no fallback, show error state
  if (imageError) {
    return (
      <div
        className={`bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center ${className}`}
        style={fill ? {} : { width, height }}
      >
        <div className="text-red-600 text-sm text-center px-2">
          <div>Failed to load image</div>
          {currentSrc && (
            <div className="text-xs mt-1 opacity-70 truncate">
              {currentSrc.split("/").pop()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={fill ? {} : { width, height }}
    >
      {/* Blurhash placeholder - shown while image loads */}
      {blurhash && !imageLoaded && (
        <div className="absolute inset-0 z-10">
          {fill ? (
            <div className="w-full h-full">
              <BlurhashCanvas
                hash={blurhash}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <BlurhashCanvas
              hash={blurhash}
              width={width || 32}
              height={height || 32}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Fallback gray placeholder if no blurhash */}
      {!blurhash && !imageLoaded && (
        <div className="absolute inset-0 z-10 bg-gray-200 animate-pulse" />
      )}

      {/* Actual image */}
      <div
        className={`transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
      >
        {fill ? (
          <Image
            src={currentSrc}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <Image
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            priority={priority}
            className="object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>

      {/* Loading indicator for when there's no blurhash */}
      {!blurhash && !imageLoaded && !imageError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// Variant specifically for map cover images
export function MapCoverImage({
  src,
  blurhash,
  alt,
  className = "",
  ...props
}: Omit<OptimizedImageProps, "width" | "height" | "fill">) {
  return (
    <OptimizedImage
      src={src}
      blurhash={blurhash}
      alt={alt}
      fill
      className={className}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      {...props}
    />
  );
}

// Hook for preloading images
export function useImagePreloader(srcs: string[]) {
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const preloadImage = (src: string) => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          setPreloadedImages((prev) => new Set([...prev, src]));
          resolve(src);
        };
        img.onerror = reject;
        img.src = src;
      });
    };

    // Preload all images
    const preloadPromises = srcs.map((src) =>
      preloadImage(src).catch((error) => {
        console.warn(`Failed to preload image: ${src}`, error);
        return null;
      })
    );

    Promise.allSettled(preloadPromises);
  }, [srcs]);

  return {
    isPreloaded: (src: string) => preloadedImages.has(src),
    preloadedCount: preloadedImages.size,
    totalCount: srcs.length,
  };
}
