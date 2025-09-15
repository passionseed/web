"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

interface OptimizedImageProps extends Omit<ImageProps, "src"> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  blurDataURL?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
  quality?: number;
}

/**
 * Optimized image component with automatic format detection,
 * error handling, and performance optimizations
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  blurDataURL,
  loading = "lazy",
  priority = false,
  quality = 85,
  className = "",
  ...props
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use fallback if main image fails
  const imageSrc = hasError && fallbackSrc ? fallbackSrc : src;

  // Default blur placeholder
  const defaultBlurDataURL = 
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative ${isLoading ? 'animate-pulse bg-gray-200' : ''}`}>
      <Image
        src={imageSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        loading={loading}
        priority={priority}
        quality={quality}
        placeholder={blurDataURL || defaultBlurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL || defaultBlurDataURL}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        {...props}
      />
      
      {/* Loading state overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <div className="text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Image not available</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for responsive image sizes based on screen size
 */
export function useResponsiveImageSizes(baseWidth = 400) {
  return `(max-width: 640px) ${Math.floor(baseWidth * 0.75)}px, (max-width: 1024px) ${Math.floor(baseWidth * 0.9)}px, ${baseWidth}px`;
}

/**
 * Generate image srcset for different screen densities
 */
export function generateImageSrcSet(baseUrl: string, widths: number[] = [400, 800, 1200]) {
  return widths
    .map((width) => `${baseUrl}?w=${width}&q=85 ${width}w`)
    .join(", ");
}