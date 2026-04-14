import { NextRequest, NextResponse } from 'next/server';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  duration_ms: number;
  popularity: number;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumCover: string;
  previewUrl: string | null;
  spotifyUrl: string;
  durationMs: number;
  popularity: number;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  // Check if current token is still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Spotify token error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      throw new Error(`Failed to get Spotify access token: ${response.status} ${response.statusText}`);
    }

    const data: SpotifyToken = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early

    return cachedToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
}

function formatTrackResult(track: SpotifyTrack): SearchResult {
  const albumCover = track.album.images.find(img => img.height >= 300)?.url || 
                   track.album.images[0]?.url || 
                   '';

  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    albumCover,
    previewUrl: track.preview_url,
    spotifyUrl: track.external_urls.spotify,
    durationMs: track.duration_ms,
    popularity: track.popularity,
  };
}

function getMockSearchResults(query: string): SearchResult[] {
  // Mock data for when Spotify API is not available
  const mockResults: SearchResult[] = [
    {
      id: 'mock-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      albumCover: 'https://i.scdn.co/image/ab67616d0000b273ef1db92dcfdcceff89c70b7f',
      previewUrl: null,
      spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUK7cJu9c9EfTD',
      durationMs: 200040,
      popularity: 95,
    },
    {
      id: 'mock-2',
      title: 'Watermelon Sugar',
      artist: 'Harry Styles',
      album: 'Fine Line',
      albumCover: 'https://i.scdn.co/image/ab67616d0000b2735484b8aa9d344ab0ba4b7e7c',
      previewUrl: null,
      spotifyUrl: 'https://open.spotify.com/track/6UelLqGlWMcVH1E5c4H7lY',
      durationMs: 174000,
      popularity: 92,
    },
    {
      id: 'mock-3',
      title: 'Good 4 U',
      artist: 'Olivia Rodrigo',
      album: 'SOUR',
      albumCover: 'https://i.scdn.co/image/ab67616d0000b2734b8b3d7d654cb5ad2a67a2fd',
      previewUrl: null,
      spotifyUrl: 'https://open.spotify.com/track/4ZtFanR9U6ndgddUvNcjcG',
      durationMs: 178147,
      popularity: 94,
    },
  ];

  // Filter mock results based on query
  if (query.trim()) {
    return mockResults.filter(track => 
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase())
    );
  }

  return mockResults;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Return mock data if Spotify is not configured
    const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ results: getMockSearchResults(query) });
    }

    try {
      const token = await getAccessToken();
      const encodedQuery = encodeURIComponent(query);
      
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search Spotify');
      }

      const data: SpotifySearchResponse = await response.json();
      const results = data.tracks.items.map(formatTrackResult);
      
      return NextResponse.json({ results }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    } catch (error) {
      console.error('Error searching Spotify:', error);
      // Fallback to mock data if API fails
      return NextResponse.json({ results: getMockSearchResults(query) });
    }
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
