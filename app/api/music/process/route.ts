import { NextResponse } from 'next/server';

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getSpotifyAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data: SpotifyToken = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

  return cachedToken;
}

async function getAudioFeatures(trackId: string, token: string) {
  const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error(`Spotify Audio Features Error (${response.status}):`, text);
    return null;
  }
  return response.json();
}

async function findDeezerPreview(title: string, artist: string) {
  try {
    const query = `${title} ${artist}`;
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data[0].preview;
    }
    return null;
  } catch (error) {
    console.error('Deezer search error:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spotifyId, title, artist, albumCover, spotifyUrl } = body;

    if (!spotifyId || !title || !artist) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Get Spotify Token
    const token = await getSpotifyAccessToken();

    // 2. Fetch Audio Features from Spotify
    const audioFeatures = await getAudioFeatures(spotifyId, token);

    // 3. Find Preview URL from Deezer
    const previewUrl = await findDeezerPreview(title, artist);

    return NextResponse.json({
      title,
      artist,
      albumCover,
      spotifyUrl,
      previewUrl,
      audioFeatures: audioFeatures ? {
        danceability: audioFeatures.danceability,
        energy: audioFeatures.energy,
        valence: audioFeatures.valence,
        tempo: audioFeatures.tempo,
      } : null
    });

  } catch (error) {
    console.error('Music processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
