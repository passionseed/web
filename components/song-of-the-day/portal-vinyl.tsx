"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Disc3, Play, Pause, Music2, Activity, Zap, Heart } from "lucide-react";
import { getVinylColorsFromCover, VinylColorScheme } from "@/utils/color-extraction";
import { SongSelector } from "@/components/song-of-the-day/song-selector";
import {
  getTodaysSong,
  setTodaysSong,
  type SongOfTheDayCreateData,
} from "@/lib/supabase/song-of-the-day";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Song {
  title: string;
  artist: string;
  url: string;
  albumCover?: string;
  previewUrl?: string;
  audioFeatures?: {
    danceability: number;
    energy: number;
    valence: number;
    tempo: number;
  };
}

export function PortalVinyl() {
  const { user } = useAuth();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [vinylColors, setVinylColors] = useState<VinylColorScheme | null>(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vinylRef = useRef<HTMLDivElement>(null);

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
          audioFeatures: song.audio_features,
        });
      }
    } catch (error) {
      console.error("Error loading today's song:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Handle audio playback
  useEffect(() => {
    if (currentSong?.previewUrl) {
      audioRef.current = new Audio(currentSong.previewUrl);
      audioRef.current.volume = 0.5;
      audioRef.current.onended = () => setIsPlaying(false);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentSong?.previewUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentSong?.previewUrl || !audioRef.current) {
      if (!currentSong?.previewUrl) {
        toast.error("No preview available for this song");
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => {
        console.error("Playback failed", e);
        toast.error("Failed to play preview");
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleSongSelect = async (song: Song) => {
    try {
      setIsSaving(true);
      
      // Stop current playback if any
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }

      setCurrentSong(song);
      
      const songData: SongOfTheDayCreateData = {
        song_url: song.url,
        song_title: song.title,
        artist: song.artist,
        album_cover_url: song.albumCover,
        preview_url: song.previewUrl,
        audio_features: song.audioFeatures,
      };

      await setTodaysSong(songData);
      
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
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-black p-[2px] cursor-pointer group hover:scale-[1.01] transition-all duration-500 shadow-xl"
        onClick={() => !isPlaying && setIsSelectorOpen(true)}
      >
        {/* Animated gradient border effect */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 opacity-0 transition-opacity duration-700 blur-xl",
          isPlaying ? "opacity-40 animate-pulse" : "group-hover:opacity-30"
        )} />

        <div className="relative bg-zinc-950/90 backdrop-blur-sm rounded-3xl p-6 h-full min-h-[340px] border border-white/5">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

          <CardContent className="relative z-10 p-0 flex flex-col md:flex-row items-center gap-8 h-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-zinc-400 text-sm tracking-widest uppercase">Loading Vinyl...</p>
              </div>
            ) : (
              <>
                {/* Left Side - Player Controls & Info */}
                <div className="flex-1 space-y-6 w-full text-center md:text-left z-20">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <div className={cn(
                      "p-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-500",
                      isPlaying && "bg-purple-500/20 border-purple-500/30"
                    )}>
                      <Music2 className={cn(
                        "h-5 w-5 text-zinc-400 transition-colors duration-300",
                        isPlaying && "text-purple-400"
                      )} />
                    </div>
                    <span className="text-zinc-400 text-sm font-medium tracking-[0.2em] uppercase">
                      Song of the Day
                    </span>
                  </div>
                  
                  {currentSong ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-white font-bold text-3xl md:text-4xl leading-tight line-clamp-2 tracking-tight drop-shadow-lg">
                          {currentSong.title}
                        </h3>
                        <p className="text-zinc-400 text-lg md:text-xl font-medium tracking-wide line-clamp-1">
                          {currentSong.artist}
                        </p>
                      </div>

                      {/* Audio Features Stats */}
                      {currentSong.audioFeatures && (
                        <div className="flex items-center justify-center md:justify-start gap-4 py-2">
                          <div className="flex flex-col items-center gap-1" title="Energy">
                            <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-500">
                              <Zap className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                              {Math.round(currentSong.audioFeatures.energy * 100)}%
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1" title="Danceability">
                            <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                              <Activity className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                              {Math.round(currentSong.audioFeatures.danceability * 100)}%
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1" title="Mood (Valence)">
                            <div className="p-2 rounded-full bg-pink-500/10 text-pink-500">
                              <Heart className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                              {Math.round(currentSong.audioFeatures.valence * 100)}%
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                        <button
                          onClick={togglePlay}
                          className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all duration-300 transform active:scale-95",
                            isPlaying 
                              ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:bg-purple-600"
                              : "bg-white text-black hover:bg-zinc-200"
                          )}
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-4 h-4 fill-current" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-current" />
                              <span>Preview</span>
                            </>
                          )}
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSelectorOpen(true);
                          }}
                          className="px-4 py-2.5 rounded-full text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                        >
                          Change Song
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <p className="text-white text-2xl font-bold">
                          Silence is golden...
                        </p>
                        <p className="text-zinc-400">
                          But music is better. Pick a song for today!
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSelectorOpen(true);
                        }}
                        className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors"
                      >
                        Select Song
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Side - Turntable */}
                <div className="relative flex-shrink-0 w-[280px] h-[280px] md:w-[320px] md:h-[320px] flex items-center justify-center perspective-1000">
                  {/* Turntable Base/Platter */}
                  <div className="absolute inset-4 rounded-full bg-zinc-900 shadow-2xl border border-zinc-800" />
                  
                  {/* Vinyl Record */}
                  <div
                    ref={vinylRef}
                    className={cn(
                      "relative w-[240px] h-[240px] md:w-[280px] md:h-[280px] rounded-full shadow-2xl overflow-hidden transition-transform duration-[2000ms] ease-linear will-change-transform",
                      isPlaying ? "animate-[spin_4s_linear_infinite]" : "" // Using CSS animation for continuous spin
                    )}
                    style={{
                      animationPlayState: isPlaying ? 'running' : 'paused',
                    }}
                  >
                    {/* Vinyl Texture & Grooves */}
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={
                        vinylColors?.bg 
                          ? { 
                              background: vinylColors.bg,
                              opacity: 0.9,
                              backgroundBlendMode: 'multiply'
                            }
                          : currentSong?.albumCover 
                            ? { background: 'radial-gradient(circle at 30% 30%, #2a2a2a, #1a1a1a, #000)' }
                            : { background: '#111' }
                      }
                    />
                    
                    {/* Realistic Grooves */}
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute rounded-full border border-white/5"
                        style={{
                          top: `${10 + i * 6}%`,
                          bottom: `${10 + i * 6}%`,
                          left: `${10 + i * 6}%`,
                          right: `${10 + i * 6}%`,
                        }}
                      />
                    ))}

                    {/* Light Reflection (Dynamic) */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent rounded-full pointer-events-none" />
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,white_10deg,transparent_20deg)] opacity-10 rounded-full animate-[spin_8s_linear_infinite_reverse]" />

                    {/* Center Label */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full shadow-lg overflow-hidden border-4 border-zinc-900 z-10">
                      {currentSong?.albumCover ? (
                        <img 
                          src={currentSong.albumCover} 
                          alt="Album Center" 
                          className={cn(
                            "w-full h-full object-cover",
                            isPlaying && "animate-[spin_4s_linear_infinite]"
                          )} 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-800" />
                      )}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full border border-zinc-700" />
                    </div>
                  </div>

                  {/* Tonearm */}
                  <div 
                    className={cn(
                      "absolute top-0 right-4 w-8 h-48 origin-top transition-transform duration-1000 ease-in-out z-20 pointer-events-none drop-shadow-2xl",
                      isPlaying ? "rotate-[25deg]" : "rotate-0"
                    )}
                    style={{ transformOrigin: '16px 16px' }}
                  >
                    {/* Pivot Base */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-b from-zinc-300 to-zinc-500 shadow-lg border border-zinc-400" />
                    
                    {/* Arm */}
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-3 h-32 bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-400 rounded-full shadow-md" />
                    
                    {/* Head shell */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-6 h-10 bg-zinc-800 rounded-md rotate-[-10deg] shadow-lg border border-zinc-700">
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-white/80" /> {/* Needle */}
                    </div>
                  </div>

                  {/* Album Cover Display (Floating) */}
                  {currentSong?.albumCover && (
                    <div className={cn(
                      "absolute bottom-4 right-4 w-28 h-28 rounded-lg shadow-2xl border-2 border-white/10 overflow-hidden transition-all duration-500 z-30",
                      isPlaying ? "scale-105 rotate-3 shadow-purple-500/30" : "scale-100 rotate-0"
                    )}>
                      <img
                        src={currentSong.albumCover}
                        alt="Cover Art"
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