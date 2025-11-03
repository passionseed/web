"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Music, ExternalLink, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { spotifyAPI, type SearchResult } from "@/lib/spotify-api";
import { debounce } from "lodash";

interface Song {
  title: string;
  artist: string;
  url: string;
  albumCover?: string;
  previewUrl?: string;
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
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleClose = () => {
    if (isLoading || isValidating) return;
    onOpenChange(false);
    setGlobalSearchQuery("");
    setSearchResults([]);
    setError("");
  };

  const handleSearchResultSelect = async (result: SearchResult) => {
    setIsValidating(true);
    try {
      const songData: Song = {
        title: result.title,
        artist: result.artist,
        url: result.spotifyUrl || "#",
        albumCover: result.albumCover,
        previewUrl: result.previewUrl,
      };
      
      onSongSelect(songData);
      handleClose();
    } catch (error) {
      console.error('Song selection error:', error);
      setError('Failed to select song. Please try again.');
    } finally {
      setIsValidating(false);
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
        const results = await spotifyAPI.searchTracks(query);
        setSearchResults(results);
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

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search millions of songs worldwide..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            <div className="space-y-3">
              {isSearching && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </div>
              )}

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSearchResultSelect(result)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Album Cover */}
                          <div className="w-12 h-12 bg-muted rounded flex-shrink-0 overflow-hidden">
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

                          {/* Song Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{result.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{result.artist}</div>
                            {result.album && (
                              <div className="text-xs text-muted-foreground truncate">{result.album}</div>
                            )}
                          </div>

                          {/* External Link Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 flex-shrink-0"
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

                          {/* Popularity Badge */}
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {result.popularity}%
                          </Badge>
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
                  <h3 className="font-semibold mb-2">Search for any song, artist, or album</h3>
                  <p className="text-sm text-muted-foreground">
                    Powered by Spotify's global catalog
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-4 border-t flex-shrink-0">
          <strong>Note:</strong> You can only select one song per day. Choose wisely! Your song will be displayed on the beautiful vinyl record.
        </div>
      </DialogContent>
    </Dialog>
  );
}