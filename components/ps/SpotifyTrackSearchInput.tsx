"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Search, Loader2, X, ExternalLink } from "lucide-react";
import { debounce } from "@/lib/utils";
import { spotifyAPI, SearchResult } from "@/lib/spotify-api";
import { getVinylColorsFromCover, VinylColorScheme } from "@/utils/color-extraction";

interface TrackData {
    id: string;
    name: string;
    artist: string;
    albumCover: string;
    previewUrl: string | null;
    spotifyUrl: string;
    themeColor?: VinylColorScheme;
}

interface SpotifyTrackSearchInputProps {
    defaultTrackId?: string;
    defaultTrackName?: string;
    defaultArtistName?: string;
    defaultAlbumCover?: string;
    defaultPreviewUrl?: string;
    onTrackSelect?: (track: TrackData | null) => void;
}

export function SpotifyTrackSearchInput({
    defaultTrackId,
    defaultTrackName,
    defaultArtistName,
    defaultAlbumCover,
    defaultPreviewUrl,
    onTrackSelect,
}: SpotifyTrackSearchInputProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<TrackData | null>(
        defaultTrackId
            ? {
                id: defaultTrackId,
                name: defaultTrackName || "",
                artist: defaultArtistName || "",
                albumCover: defaultAlbumCover || "",
                previewUrl: defaultPreviewUrl || null,
                spotifyUrl: `https://open.spotify.com/track/${defaultTrackId}`,
            }
            : null
    );

    const searchRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const debouncedSearch = useCallback(
        debounce(async (searchQuery: string) => {
            if (!searchQuery.trim()) {
                setResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const searchResults = await spotifyAPI.searchTracks(searchQuery, 10);
                setResults(searchResults);
            } catch (error) {
                console.error("Search error:", error);
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500),
        []
    );

    useEffect(() => {
        if (query) {
            debouncedSearch(query);
        } else {
            setResults([]);
        }
    }, [query, debouncedSearch]);

    const handleTrackSelect = async (result: SearchResult) => {
        const trackData: TrackData = {
            id: result.id,
            name: result.title,
            artist: result.artist,
            albumCover: result.albumCover,
            previewUrl: result.previewUrl,
            spotifyUrl: result.spotifyUrl,
        };

        // Extract theme color from album cover
        if (result.albumCover) {
            try {
                const themeColor = await getVinylColorsFromCover(result.albumCover);
                trackData.themeColor = themeColor;
            } catch (error) {
                console.error("Failed to extract theme color:", error);
            }
        }

        setSelectedTrack(trackData);
        setQuery("");
        setShowResults(false);
        setResults([]);
        onTrackSelect?.(trackData);
    };

    const handleClearTrack = () => {
        setSelectedTrack(null);
        setQuery("");
        setResults([]);
        onTrackSelect?.(null);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Spotify Track</Label>

                {/* Selected Track Display */}
                {selectedTrack ? (
                    <Card>
                        <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                                {/* Album Cover */}
                                <div className="w-12 h-12 flex-shrink-0 bg-muted rounded overflow-hidden">
                                    {selectedTrack.albumCover ? (
                                        <img
                                            src={selectedTrack.albumCover}
                                            alt={`${selectedTrack.name} album cover`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Music className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Track Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{selectedTrack.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {selectedTrack.artist}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => window.open(selectedTrack.spotifyUrl, "_blank")}
                                        title="Open in Spotify"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={handleClearTrack}
                                        title="Clear selection"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Search Input */
                    <div className="relative" ref={searchRef}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                type="text"
                                placeholder="Search for a track on Spotify..."
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                                className="pl-10"
                            />
                        </div>

                        {/* Search Results Dropdown */}
                        {showResults && (query || isSearching) && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                                {isSearching ? (
                                    <div className="p-4 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Searching Spotify...</p>
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="py-1">
                                        {results.map((result) => (
                                            <button
                                                key={result.id}
                                                type="button"
                                                onClick={() => handleTrackSelect(result)}
                                                className="w-full px-3 py-2 hover:bg-muted transition-colors text-left flex items-center gap-3"
                                            >
                                                {/* Album Cover */}
                                                <div className="w-10 h-10 flex-shrink-0 bg-muted rounded overflow-hidden">
                                                    {result.albumCover ? (
                                                        <img
                                                            src={result.albumCover}
                                                            alt={`${result.title} album cover`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Music className="w-5 h-5 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Track Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">{result.title}</div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {result.artist}
                                                        {result.album && ` • ${result.album}`}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : query ? (
                                    <div className="p-4 text-center">
                                        <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">No tracks found</p>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {/* Hidden form fields for form submission */}
                <input type="hidden" name="spotify_track_id" value={selectedTrack?.id || ""} />
                <input type="hidden" name="spotify_track_name" value={selectedTrack?.name || ""} />
                <input type="hidden" name="spotify_artist_name" value={selectedTrack?.artist || ""} />
                <input type="hidden" name="preview_url" value={selectedTrack?.previewUrl || ""} />
                <input
                    type="hidden"
                    name="spotify_album_cover_url"
                    value={selectedTrack?.albumCover || ""}
                />
                <input
                    type="hidden"
                    name="theme_color"
                    value={selectedTrack?.themeColor ? JSON.stringify(selectedTrack.themeColor) : ""}
                />
            </div>

            {/* Helper text */}
            {!selectedTrack && (
                <p className="text-xs text-muted-foreground">
                    Search and select a track from Spotify. Leave empty if no track is needed.
                </p>
            )}
        </div>
    );
}
