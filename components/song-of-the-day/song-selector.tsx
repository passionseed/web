"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, ExternalLink, Search, Play, Pause, Loader2 } from "lucide-react";
import { debounce } from "lodash";
import { toast } from "sonner";

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

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumCover?: string;
  spotifyUrl?: string;
  previewUrl?: string; // From Spotify, often null
}

interface SongSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSongSelect: (song: Song) => void;
  isLoading?: boolean;
}

export function SongSelector({ 
  open, 
  onOpenChange, 
  onSongSelect, 
  isLoading = false 
}: SongSelectorProps) {
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Audio preview state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  const handleClose = () => {
    if (isLoading || isProcessing) return;
    stopAudio();
    onOpenChange(false);
    setGlobalSearchQuery("");
    setSearchResults([]);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingPreviewId(null);
  };

  const playPreview = (e: React.MouseEvent, previewUrl: string, id: string) => {
    e.stopPropagation();
    
    if (playingPreviewId === id) {
      stopAudio();
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const newAudio = new Audio(previewUrl);
    newAudio.volume = 0.5;
    newAudio.play().catch(e => console.error("Playback failed", e));
    newAudio.onended = () => setPlayingPreviewId(null);
    
    audioRef.current = newAudio;
    setPlayingPreviewId(id);
  };

  useEffect(() => {
    if (!open) stopAudio();
  }, [open]);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  const handleSearchResultSelect = async (result: SearchResult) => {
    setIsProcessing(true);
    stopAudio();
    
    try {
      // Process the song: Get stats from Spotify + Preview from Deezer
      const response = await fetch('/api/music/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotifyId: result.id,
          title: result.title,
          artist: result.artist,
          albumCover: result.albumCover,
          spotifyUrl: result.spotifyUrl
        })
      });

      if (!response.ok) throw new Error('Failed to process song');
      
      const processedData = await response.json();
      
      const songData: Song = {
        title: processedData.title,
        artist: processedData.artist,
        url: processedData.spotifyUrl || "#",
        albumCover: processedData.albumCover,
        previewUrl: processedData.previewUrl, // From Deezer
        audioFeatures: processedData.audioFeatures // From Spotify
      };
      
      onSongSelect(songData);
      handleClose();
    } catch (error) {
      console.error('Song processing error:', error);
      toast.error('Failed to process song. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Use Spotify Search API
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        setSearchResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(globalSearchQuery);
  }, [globalSearchQuery, debouncedSearch]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Choose Your Song of the Day
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 relative">
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Processing Song...</p>
              <p className="text-sm text-muted-foreground">Fetching stats & preview</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search songs on Spotify..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="pl-10"
                disabled={isProcessing}
              />
            </div>

            {/* Search Results */}
            <div className="space-y-3">
              {isSearching && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Searching Spotify...</p>
                </div>
              )}

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <Card
                      key={result.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => handleSearchResultSelect(result)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Album Cover */}
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                              {result.albumCover ? (
                                <img
                                  src={result.albumCover}
                                  alt={`${result.title} album cover`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            
                            {/* Spotify Preview (if available) */}
                            {result.previewUrl && (
                              <button
                                onClick={(e) => playPreview(e, result.previewUrl!, result.id)}
                                className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded ${playingPreviewId === result.id ? 'opacity-100' : ''}`}
                              >
                                {playingPreviewId === result.id ? (
                                  <Pause className="w-6 h-6 text-white drop-shadow-md" />
                                ) : (
                                  <Play className="w-6 h-6 text-white drop-shadow-md" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Song Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{result.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{result.artist}</div>
                          </div>

                          {/* External Link Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (result.spotifyUrl) {
                                window.open(result.spotifyUrl, '_blank');
                              }
                            }}
                            title="Open in Spotify"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : globalSearchQuery.trim() && !isSearching ? (
                <div className="text-center py-12">
                  <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No songs found for "{globalSearchQuery}"
                  </p>
                </div>
              ) : !globalSearchQuery.trim() && !isSearching ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Search for any song</h3>
                  <p className="text-sm text-muted-foreground">
                    Powered by Spotify
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-4 border-t flex-shrink-0">
          <strong>Note:</strong> We use Spotify for search and stats, and Deezer for previews.
        </div>
      </DialogContent>
    </Dialog>
  );
}