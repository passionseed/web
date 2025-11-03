"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Disc3 } from "lucide-react";
import { getVinylColorsFromCover, VinylColorScheme } from "@/utils/color-extraction";
import { SongSelector } from "@/components/song-of-the-day/song-selector";
import {
  getTodaysSong,
  setTodaysSong,
  type SongOfTheDayCreateData,
} from "@/lib/supabase/song-of-the-day";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Song {
  title: string;
  artist: string;
  url: string;
  albumCover?: string;
  previewUrl?: string;
}

export function PortalVinyl() {
  const { user } = useAuth();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [vinylColors, setVinylColors] = useState<VinylColorScheme | null>(null);

  // Load today's song on mount
  useEffect(() => {
    if (user) {
      loadTodaysSong();
    }
  }, [user, loadTodaysSong]);

  // Extract vinyl colors when song changes
  useEffect(() => {
    if (currentSong?.albumCover) {
      getVinylColorsFromCover(currentSong.albumCover)
        .then(colors => setVinylColors(colors))
        .catch(error => {
          console.error('Failed to extract vinyl colors:', error);
          setVinylColors(null);
        });
    } else {
      setVinylColors(null);
    }
  }, [currentSong?.albumCover]);

  const loadTodaysSong = useCallback(async () => {
    try {
      setIsLoading(true);
      const song = await getTodaysSong();
      if (song) {
        setCurrentSong({
          title: song.song_title,
          artist: song.artist,
          url: song.song_url,
          albumCover: song.album_cover_url,
          previewUrl: song.preview_url,
        });
      }
    } catch (error) {
      console.error("Error loading today's song:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSongSelect = async (song: Song) => {
    try {
      setIsSaving(true);
      
      const songData: SongOfTheDayCreateData = {
        song_url: song.url,
        song_title: song.title,
        artist: song.artist,
        album_cover_url: song.albumCover,
        preview_url: song.previewUrl,
      };

      await setTodaysSong(songData);
      setCurrentSong(song);
      
      toast.success("Song of the day updated! 🎵");
    } catch (error) {
      console.error("Error saving song:", error);
      toast.error("Failed to save song. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Card 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 p-[2px] cursor-pointer group hover:scale-[1.02] transition-transform"
        onClick={() => setIsSelectorOpen(true)}
      >
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 h-full min-h-[320px]">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-2xl" />

          <CardContent className="relative z-10 p-0 flex items-center gap-8 h-full">
            {isLoading ? (
              <div className="flex flex-col items-center w-full">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-purple-200 text-sm">Loading...</p>
              </div>
            ) : (
              <>
                {/* Left Side - Title and Song Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <Disc3 className="h-6 w-6 text-purple-400" />
                    <span className="text-purple-200 text-lg font-semibold tracking-wider uppercase">
                      Song of the Day
                    </span>
                  </div>
                  
                  {currentSong ? (
                    <>
                      <h3 className="text-white font-bold text-2xl leading-tight line-clamp-3">
                        {currentSong.title}
                      </h3>
                      <p className="text-purple-200/80 text-lg line-clamp-2">
                        {currentSong.artist}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-purple-200 text-xl font-medium">
                        Choose Your Song
                      </p>
                      <p className="text-purple-200/60 text-base">
                        Click to select today's soundtrack
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Side - Vinyl Record */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-48 h-48 md:w-56 md:h-56 rounded-full shadow-2xl relative overflow-hidden animate-[spin_20s_linear_infinite] cursor-pointer"
                    onClick={() => setIsSelectorOpen(true)}
                  >
                    {/* Vinyl Background */}
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={
                        vinylColors?.bg 
                          ? { 
                              background: vinylColors.bg,
                              opacity: 0.85,
                              backgroundBlendMode: 'multiply'
                            }
                          : currentSong?.albumCover 
                            ? { background: 'radial-gradient(circle at 30% 30%, rgba(120, 60, 180, 0.8), rgba(80, 40, 120, 0.9), rgba(40, 20, 60, 1))' }
                            : { background: 'radial-gradient(circle at 30% 30%, rgba(20, 20, 20, 0.9), rgba(10, 10, 10, 0.95), rgba(0, 0, 0, 1))' }
                      }
                    />
                    
                    {/* Additional overlay for depth */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-black/20 via-transparent to-black/40" />

                    {/* Vinyl Grooves */}
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
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-lg"
                      style={
                        currentSong && vinylColors?.labelStyle
                          ? vinylColors.labelStyle
                          : {
                              background: "linear-gradient(135deg, #dc2626, #991b1b)",
                              borderColor: "#dc2626",
                            }
                      }
                    >
                      <div className="w-5 h-5 bg-black rounded-full shadow-inner" />
                    </div>

                    {/* Vinyl Reflection */}
                    <div className="absolute top-4 left-4 w-12 h-12 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm" />
                  </div>

                  {/* Album Cover (positioned next to vinyl) */}
                  {currentSong?.albumCover && (
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-lg shadow-lg overflow-hidden border-2 border-white/20">
                      <img
                        src={currentSong.albumCover}
                        alt={`${currentSong.title} album cover`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Song Selector Modal */}
      <SongSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSongSelect={handleSongSelect}
        isLoading={isSaving}
      />
    </>
  );
}