import { NextRequest, NextResponse } from 'next/server';

interface SoundCloudTrack {
  id: number;
  title: string;
  user: {
    username: string;
  };
  stream_url?: string;
  permalink_url: string;
  artwork_url?: string;
  duration: number;
  playback_count: number;
  downloadable: boolean;
  streamable: boolean;
}

interface SoundCloudSearchResponse {
  collection: SoundCloudTrack[];
  next_href?: string;
}

export interface SoundCloudResult {
  id: string;
  title: string;
  artist: string;
  streamUrl: string | null;
  permalink: string;
  artwork: string | null;
  duration: number;
  playCount: number;
  streamable: boolean;
}

function formatTrackResult(track: SoundCloudTrack): SoundCloudResult {
  return {
    id: track.id.toString(),
    title: track.title,
    artist: track.user.username,
    streamUrl: track.stream_url || null,
    permalink: track.permalink_url,
    artwork: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : null,
    duration: track.duration,
    playCount: track.playback_count,
    streamable: track.streamable,
  };
}

function getStreamUrl(streamUrl: string, clientId: string): string {
  if (!clientId) return streamUrl;
  
  // Add client_id to stream URL
  const separator = streamUrl.includes('?') ? '&' : '?';
  return `${streamUrl}${separator}client_id=${clientId}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const artist = searchParams.get('artist');
    const title = searchParams.get('title');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query && !(artist && title)) {
      return NextResponse.json({ error: 'Query or artist+title parameters required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json({ results: [] });
    }

    try {
      // Build search query
      const searchQuery = query || `${artist} ${title}`;
      const encodedQuery = encodeURIComponent(searchQuery);
      
      const response = await fetch(
        `https://api.soundcloud.com/tracks?q=${encodedQuery}&client_id=${clientId}&limit=${limit}&linked_partitioning=1`
      );

      if (!response.ok) {
        throw new Error('Failed to search SoundCloud');
      }

      const data: SoundCloudSearchResponse = await response.json();
      
      const results = data.collection
        .filter(track => track.streamable) // Only include streamable tracks
        .map(formatTrackResult)
        .map(track => ({
          ...track,
          streamUrl: track.streamUrl ? getStreamUrl(track.streamUrl, clientId) : null
        }));

      // If searching by artist and title, try to find best match
      if (artist && title && results.length > 0) {
        const lowerArtist = artist.toLowerCase();
        const lowerTitle = title.toLowerCase();

        // Look for exact matches first
        const exactMatch = results.find(track => 
          track.artist.toLowerCase().includes(lowerArtist) && 
          track.title.toLowerCase().includes(lowerTitle)
        );

        if (exactMatch) {
          return NextResponse.json({ results: [exactMatch] });
        }

        // Fall back to title match
        const titleMatch = results.find(track =>
          track.title.toLowerCase().includes(lowerTitle)
        );

        if (titleMatch) {
          return NextResponse.json({ results: [titleMatch] });
        }
      }
      
      return NextResponse.json({ results });
    } catch (error) {
      console.error('Error searching SoundCloud:', error);
      return NextResponse.json({ results: [] });
    }
  } catch (error) {
    console.error('SoundCloud search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}