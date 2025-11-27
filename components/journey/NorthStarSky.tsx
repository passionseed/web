/**
 * NorthStarSky - A stunning, fixed overlay for North Stars
 * Renders North Stars as floating guides in the "sky"
 */

import React from "react";
import { NorthStar, NorthStarStatus } from "@/types/journey";
import { StarSVG } from "@/components/ui/star-generator";
import { StarConfig } from "@/lib/utils/svg-star";
import { NORTH_STAR_COLORS } from "@/constants/sdg";
import { GraduationCap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface NorthStarSkyProps {
  northStars: NorthStar[];
  onEditNorthStar: (northStar: NorthStar) => void;
  onViewNorthStarDetails: (northStarId: string) => void;
}

export function NorthStarSky({
  northStars,
  onEditNorthStar,
  onViewNorthStarDetails,
}: NorthStarSkyProps) {
  if (northStars.length === 0) return null;

  return (
    <div className="absolute top-0 left-0 right-0 h-[300px] z-10 pointer-events-none overflow-hidden">
      {/* Sky Gradient Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-transparent"
        style={{
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
        }}
      />

      {/* Twinkling Background Stars */}
      <div className="absolute inset-0 opacity-50">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* North Stars Container */}
      <div className="relative w-full h-full flex justify-center items-start pt-8 gap-16 pointer-events-auto">
        {northStars.map((northStar) => (
          <SkyNorthStar
            key={northStar.id}
            northStar={northStar}
            onEdit={() => onEditNorthStar(northStar)}
            onClick={() => onViewNorthStarDetails(northStar.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface SkyNorthStarProps {
  northStar: NorthStar;
  onEdit: () => void;
  onClick: () => void;
}

function SkyNorthStar({ northStar, onEdit, onClick }: SkyNorthStarProps) {
  const colorData = NORTH_STAR_COLORS.find((c) => c.value === northStar.north_star_color);
  const isUniversity = northStar.north_star_shape === 'university';

  // Star Config
  const starConfig: StarConfig = {
    coreSize: 40,
    flareCount: 5,
    seed: northStar.id,
    rotation: 0,
    innerRadiusRatio: 0.5,
    glowIntensity: 1,
    ...northStar.metadata?.starConfig
  };

  return (
    <div 
      className="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110 duration-500"
      onClick={onClick}
    >
      {/* Glow Effect */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"
        style={{ backgroundColor: colorData?.color || '#FFD700' }}
      />

      {/* Star Visual */}
      <div className="relative z-10 mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
        {isUniversity ? (
          <div className="bg-blue-900/80 p-4 rounded-full border border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <GraduationCap className="w-10 h-10 text-blue-200" />
          </div>
        ) : (
          <StarSVG
            config={starConfig}
            color={colorData?.color || "#FFD700"}
            glowColor={colorData?.glow || "#FFA500"}
            size={80}
          />
        )}
      </div>

      {/* Title */}
      <div className="text-center max-w-[200px]">
        <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md group-hover:text-blue-200 transition-colors">
          {northStar.title}
        </h3>
        <p className="text-slate-400 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
          Click to view details
        </p>
      </div>

      {/* Edit Button (Hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="absolute -top-2 -right-2 p-1.5 bg-white/10 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/20"
      >
        <ExternalLink className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}
