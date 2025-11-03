"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVinylColorsFromCover, VinylColorScheme } from "@/utils/color-extraction";

interface VinylPlayerProps {
  song?: {
    title: string;
    artist: string;
    url: string;
    albumCover?: string;
    previewUrl?: string;
  } | null;
  onSelectSong: () => void;
  className?: string;
}

export function VinylPlayer({ song, onSelectSong, className }: VinylPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vinylColors, setVinylColors] = useState<VinylColorScheme | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [song]);

  // Extract vinyl colors when song changes
  useEffect(() => {
    if (song?.albumCover) {
      getVinylColorsFromCover(song.albumCover)
        .then(colors => setVinylColors(colors))
        .catch(error => {
          console.error('Failed to extract vinyl colors:', error);
          setVinylColors(null);
        });
    } else {
      setVinylColors(null);
    }
  }, [song?.albumCover]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !song) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Use preview URL if available, otherwise fall back to main URL
        const audioUrl = song.previewUrl || song.url;
        if (audio.src !== audioUrl) {
          audio.src = audioUrl;
        }
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center space-y-6", className)}>
      {/* Main Container */}
      <div className="relative flex flex-col items-center">
        <div className="relative flex justify-center items-center mb-8 group">
          {/* Album Cover Card (Left side) */}
          {song?.albumCover && (
            <div className="relative z-20 cursor-pointer mr-8" onClick={onSelectSong}>
              <div className="w-80 rounded-xl shadow-2xl overflow-hidden">
                <img
                  src={song.albumCover}
                  alt={`${song.title} album cover`}
                  className="w-full h-80 object-cover"
                />
              </div>
            </div>
          )}

          {/* Vinyl Record (Centered when no song, right side when song exists) */}
          <div className={cn("relative z-10 transition-transform duration-300", song?.albumCover && "-ml-32", !song && "hover:scale-105")}>
            <div
              className={cn(
                "w-72 h-72 rounded-full shadow-2xl relative overflow-hidden cursor-pointer animate-[spin_40s_linear_infinite]"
              )}
              onClick={onSelectSong}
            >
            {/* Vinyl Background - moody and dramatic like Apple Maps */}
            <div 
              className="absolute inset-0 rounded-full"
              style={
                vinylColors?.bg 
                  ? { 
                      background: vinylColors.bg,
                      opacity: 0.85,
                      backgroundBlendMode: 'multiply'
                    }
                  : song?.albumCover 
                    ? { background: 'radial-gradient(circle at 30% 30%, rgba(120, 60, 180, 0.8), rgba(80, 40, 120, 0.9), rgba(40, 20, 60, 1))' }
                    : { background: 'radial-gradient(circle at 30% 30%, rgba(20, 20, 20, 0.9), rgba(10, 10, 10, 0.95), rgba(0, 0, 0, 1))' }
              }
            />
            
            {/* Additional overlay for depth */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-black/20 via-transparent to-black/40" />

            {/* Vinyl Grooves - using extracted groove colors */}
            <div 
              className="absolute inset-4 rounded-full border opacity-60"
              style={
                vinylColors?.grooveStyle
                  ? vinylColors.grooveStyle
                  : { borderColor: "rgba(255, 255, 255, 0.3)" }
              }
            />
            <div 
              className="absolute inset-8 rounded-full border opacity-50"
              style={
                vinylColors?.grooveStyle
                  ? vinylColors.grooveStyle
                  : { borderColor: "rgba(255, 255, 255, 0.25)" }
              }
            />
            <div 
              className="absolute inset-12 rounded-full border opacity-40"
              style={
                vinylColors?.grooveStyle
                  ? vinylColors.grooveStyle
                  : { borderColor: "rgba(255, 255, 255, 0.2)" }
              }
            />
            <div 
              className="absolute inset-16 rounded-full border opacity-30"
              style={
                vinylColors?.grooveStyle
                  ? vinylColors.grooveStyle
                  : { borderColor: "rgba(255, 255, 255, 0.15)" }
              }
            />
            <div 
              className="absolute inset-20 rounded-full border opacity-20"
              style={
                vinylColors?.grooveStyle
                  ? vinylColors.grooveStyle
                  : { borderColor: "rgba(255, 255, 255, 0.1)" }
              }
            />

            {/* Center Label */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 flex items-center justify-center shadow-lg"
              style={
                song && vinylColors?.labelStyle
                  ? vinylColors.labelStyle
                  : {
                      background: "linear-gradient(135deg, #dc2626, #991b1b)",
                      borderColor: "#dc2626",
                    }
              }
            >
              <div className="w-6 h-6 bg-black rounded-full shadow-inner" />
            </div>

            {/* Vinyl Reflection */}
            <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm" />

            {/* Curved text - always visible */}
            <div className="absolute inset-0 opacity-80">
              <svg className="w-full h-full" viewBox="0 0 288 288">
                <defs>
                  <path
                    id="circle-path"
                    d="M 144,144 m -130,0 a 130,130 0 1,1 260,0 a 130,130 0 1,1 -260,0"
                  />
                </defs>
                <text className="text-white/70 font-thin tracking-widest uppercase fill-white/70" style={{fontSize: '10px'}}>
                  <textPath href="#circle-path" startOffset="0%">
                    {song 
                      ? `${song.title} • ${song.artist} • ${song.title} • ${song.artist} • ${song.title} • ${song.artist} • ${song.title} • ${song.artist} •`
                      : "CLICK TO CHOOSE SONG • CLICK TO CHOOSE SONG • CLICK TO CHOOSE SONG • CLICK TO CHOOSE SONG • CLICK TO CHOOSE SONG • CLICK TO CHOOSE SONG •"
                    }
                  </textPath>
                </text>
              </svg>
            </div>

          </div>
          </div>
        </div>

      </div>


      {/* Hidden Audio Element */}
      {song && (
        <audio
          ref={audioRef}
          src={song.previewUrl || song.url}
          preload="metadata"
          className="hidden"
        />
      )}
    </div>
  );
}