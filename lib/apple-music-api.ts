// Apple Music API integration for preview playback
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

class AppleMusicAPI {
  private baseUrl = 'https://api.music.apple.com/v1';
  private token: string | null = null;

  constructor() {
    // Initialize MusicKit if available
    this.initializeMusicKit();
  }

  private async initializeMusicKit() {
    // Check if MusicKit is loaded
    if (typeof window !== 'undefined' && (window as any).MusicKit) {
      try {
        const musicKit = (window as any).MusicKit;
        
        // Configure MusicKit with your credentials
        await musicKit.configure({
          developerToken: process.env.NEXT_PUBLIC_APPLE_MUSIC_TOKEN,
          app: {
            name: 'Song of the Day',
            build: '1.0.0'
          }
        });

        this.token = process.env.NEXT_PUBLIC_APPLE_MUSIC_TOKEN || null;
        console.log('Apple Music initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize Apple Music:', error);
      }
    }
  }

  async searchTracks(query: string, limit = 10): Promise<AppleMusicResult[]> {
    // Return empty array if no token
    if (!this.token) {
      console.warn('Apple Music token not available');
      return [];
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `${this.baseUrl}/catalog/us/search?term=${encodedQuery}&types=songs&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Music-User-Token': await this.getMusicUserToken(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Apple Music API error: ${response.status}`);
      }

      const data: AppleMusicSearchResponse = await response.json();
      
      if (!data.results.songs?.data) {
        return [];
      }

      return data.results.songs.data.map(this.formatTrackResult);
    } catch (error) {
      console.error('Error searching Apple Music:', error);
      return [];
    }
  }

  async findTrackByArtistAndTitle(artist: string, title: string): Promise<AppleMusicResult | null> {
    // Search for specific track
    const query = `${artist} ${title}`;
    const results = await this.searchTracks(query, 5);
    
    if (results.length === 0) return null;

    // Try to find the best match
    const lowerArtist = artist.toLowerCase();
    const lowerTitle = title.toLowerCase();

    // Look for exact matches first
    const exactMatch = results.find(track => 
      track.artist.toLowerCase().includes(lowerArtist) && 
      track.title.toLowerCase().includes(lowerTitle)
    );

    if (exactMatch) return exactMatch;

    // Fall back to title match
    const titleMatch = results.find(track =>
      track.title.toLowerCase().includes(lowerTitle)
    );

    if (titleMatch) return titleMatch;

    // Return first result if no good matches
    return results[0];
  }

  private formatTrackResult(track: AppleMusicTrack): AppleMusicResult {
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

  private async getMusicUserToken(): Promise<string> {
    // For preview playback, we don't need user token
    // Return empty string for public access
    return '';
  }

  async getTrackById(id: string): Promise<AppleMusicResult | null> {
    if (!this.token) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/catalog/us/songs/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const track = data.data[0];
      
      if (!track) return null;

      return this.formatTrackResult(track);
    } catch (error) {
      console.error('Error fetching Apple Music track by ID:', error);
      return null;
    }
  }

  // Check if Apple Music is available
  isAvailable(): boolean {
    return !!this.token;
  }
}

// Export singleton instance
export const appleMusicAPI = new AppleMusicAPI();