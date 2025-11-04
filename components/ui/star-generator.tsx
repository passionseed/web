"use client";

import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Shuffle } from "lucide-react";
import {
  StarConfig,
  generateStarPath,
  randomizeStarConfig,
} from "@/lib/utils/svg-star";

interface StarGeneratorProps {
  config: StarConfig;
  onConfigChange: (config: StarConfig) => void;
  color: string;
  glowColor: string;
  className?: string;
}

export function StarGenerator({
  config,
  onConfigChange,
  color,
  glowColor,
  className = "",
}: StarGeneratorProps) {
  const starSVG = useMemo(() => generateStarPath(config), [config]);

  const handleCoreSizeChange = (values: number[]) => {
    onConfigChange({ ...config, coreSize: values[0] });
  };

  const handleFlareCountChange = (values: number[]) => {
    onConfigChange({ ...config, flareCount: Math.round(values[0]) });
  };

  const handleRotationChange = (values: number[]) => {
    onConfigChange({ ...config, rotation: values[0] });
  };

  const handleSharpnessChange = (values: number[]) => {
    onConfigChange({ ...config, innerRadiusRatio: values[0] });
  };

  const handleGlowChange = (values: number[]) => {
    onConfigChange({ ...config, glowIntensity: values[0] });
  };

  const handleRandomize = () => {
    onConfigChange(randomizeStarConfig());
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Preview */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Glow effect */}
          <div
            className="absolute inset-0 blur-2xl opacity-40 animate-pulse"
            style={{
              background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              animationDuration: "3s",
              opacity: config.glowIntensity / 20, // Scale opacity based on glow intensity
            }}
          />

          {/* Star SVG */}
          <svg
            width="180"
            height="180"
            viewBox={starSVG.viewBox}
            className="relative drop-shadow-2xl"
            style={{
              filter: `drop-shadow(0 0 ${config.glowIntensity * 2}px ${glowColor}80)`,
            }}
          >
            <defs>
              <linearGradient
                id="star-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={glowColor} />
              </linearGradient>
              <filter id="star-glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d={starSVG.path}
              fill="url(#star-gradient)"
              filter="url(#star-glow)"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Star Shape Controls Section */}
        <div className="space-y-4 pb-4 border-b">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Star Shape Controls
          </h3>

          {/* Star Density Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="core-size" className="text-sm font-medium">
                Star Density
              </Label>
              <span className="text-sm text-muted-foreground">
                {config.coreSize}
              </span>
            </div>
            <Slider
              id="core-size"
              min={30}
              max={100}
              step={1}
              value={[config.coreSize]}
              onValueChange={handleCoreSizeChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Controls the overall size and density of your star
            </p>
          </div>

          {/* Flare Count Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="flare-count" className="text-sm font-medium">
                Star Points
              </Label>
              <span className="text-sm text-muted-foreground">
                {config.flareCount}
              </span>
            </div>
            <Slider
              id="flare-count"
              min={4}
              max={12}
              step={1}
              value={[config.flareCount]}
              onValueChange={handleFlareCountChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Number of points on your star
            </p>
          </div>

          {/* Point Sharpness Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sharpness" className="text-sm font-medium">
                Point Sharpness
              </Label>
              <span className="text-sm text-muted-foreground">
                {(config.innerRadiusRatio * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              id="sharpness"
              min={0.3}
              max={0.7}
              step={0.05}
              value={[config.innerRadiusRatio]}
              onValueChange={handleSharpnessChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower values create sharper, more pointed stars
            </p>
          </div>

          {/* Rotation Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rotation" className="text-sm font-medium">
                Rotation
              </Label>
              <span className="text-sm text-muted-foreground">
                {config.rotation}°
              </span>
            </div>
            <Slider
              id="rotation"
              min={0}
              max={360}
              step={5}
              value={[config.rotation]}
              onValueChange={handleRotationChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Rotate your star (0-360 degrees)
            </p>
          </div>
        </div>

        {/* Visual Effects Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Visual Effects
          </h3>

          {/* Glow Intensity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="glow" className="text-sm font-medium">
                Glow Intensity
              </Label>
              <span className="text-sm text-muted-foreground">
                {config.glowIntensity}
              </span>
            </div>
            <Slider
              id="glow"
              min={0}
              max={10}
              step={1}
              value={[config.glowIntensity]}
              onValueChange={handleGlowChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Adjust the glow and radiance effect
            </p>
          </div>
        </div>

        {/* Randomize Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleRandomize}
          className="w-full"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Randomize Star Shape
        </Button>
      </div>
    </div>
  );
}

/**
 * Standalone Star SVG Component for rendering
 */
interface StarSVGProps {
  config: StarConfig;
  color: string;
  glowColor: string;
  size?: number;
  className?: string;
}

export function StarSVG({
  config,
  color,
  glowColor,
  size = 64,
  className = "",
}: StarSVGProps) {
  const starSVG = useMemo(() => generateStarPath(config), [config]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={starSVG.viewBox}
      className={className}
      style={{
        filter: `drop-shadow(0 0 ${size * 0.15 * (config.glowIntensity / 5)}px ${glowColor}80)`,
      }}
    >
      <defs>
        <linearGradient
          id={`star-gradient-${config.seed}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={glowColor} />
        </linearGradient>
        <filter id={`star-glow-${config.seed}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={starSVG.path}
        fill={`url(#star-gradient-${config.seed})`}
        filter={`url(#star-glow-${config.seed})`}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
