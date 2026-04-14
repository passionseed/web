import { NextRequest, NextResponse } from 'next/server';

interface AppleMusicTrack {
  id: string;
  type: 'songs';
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
    previews: Array<{
      url: string;
    }>;
    durationInMillis: number;
    url: string;
  };
}

interface AppleMusicSearchResponse {
  results: {
    songs?: {
      data: AppleMusicTrack[];
    };
  };
}

export interface AppleMusicResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumCover: string | null;
  previewUrl: string | null;
  appleMusicUrl: string;
  durationMs: number;
}

function formatTrackResult(track: AppleMusicTrack): AppleMusicResult {
  // Extract high-quality album artwork
  let albumCover = null;
  if (track.attributes.artwork) {
    albumCover = track.attributes.artwork.url
      .replace('{w}', '500')
      .replace('{h}', '500');
  }

  return {
    id: track.id,
    title: track.attributes.name,
    artist: track.attributes.artistName,
    album: track.attributes.albumName,
    albumCover,
    previewUrl: track.attributes.previews?.[0]?.url || null,
    appleMusicUrl: track.attributes.url,
    durationMs: track.attributes.durationInMillis,
  };
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

    const token = process.env.APPLE_MUSIC_TOKEN;

    if (!token) {
      console.warn('Apple Music token not configured');
      return NextResponse.json({ results: [] });
    }

    try {
      // Build search query
      const searchQuery = query || `${artist} ${title}`;
      const encodedQuery = encodeURIComponent(searchQuery);
      
      const response = await fetch(
        `https://api.music.apple.com/v1/catalog/us/search?term=${encodedQuery}&types=songs&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Apple Music API error: ${response.status} ${response.statusText}`);
        return NextResponse.json({ results: [] });
      }

      const data: AppleMusicSearchResponse = await response.json();
      
      if (!data.results.songs?.data) {
        return NextResponse.json({ results: [] });
      }

      const results = data.results.songs.data.map(formatTrackResult);

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
          return NextResponse.json({ results: [titleMatch] }, {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
          });
        }
      }
      
      return NextResponse.json({ results }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    } catch (error) {
      console.error('Error searching Apple Music:', error);
      return NextResponse.json({ results: [] });
    }
  } catch (error) {
    console.error('Apple Music search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}