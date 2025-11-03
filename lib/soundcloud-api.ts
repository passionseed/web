// SoundCloud API integration for audio playback
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

class SoundCloudAPI {
  private clientId = process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID;

  constructor() {
    if (!this.clientId) {
      console.warn('SoundCloud Client ID not found. Audio playback will be limited.');
    }
  }

  async searchTracks(query: string, limit = 10): Promise<SoundCloudResult[]> {
    // Return empty array if no client ID
    if (!this.clientId) {
      console.warn('SoundCloud not configured');
      return [];
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://api.soundcloud.com/tracks?q=${encodedQuery}&client_id=${this.clientId}&limit=${limit}&linked_partitioning=1`
      );

      if (!response.ok) {
        throw new Error('Failed to search SoundCloud');
      }

      const data: SoundCloudSearchResponse = await response.json();
      
      return data.collection
        .filter(track => track.streamable) // Only include streamable tracks
        .map(this.formatTrackResult);
    } catch (error) {
      console.error('Error searching SoundCloud:', error);
      return [];
    }
  }

  async findTrackByArtistAndTitle(artist: string, title: string): Promise<SoundCloudResult | null> {
    // Search for specific track by artist and title
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

  private formatTrackResult(track: SoundCloudTrack): SoundCloudResult {
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

  getStreamUrl(streamUrl: string): string {
    if (!this.clientId) return streamUrl;
    
    // Add client_id to stream URL
    const separator = streamUrl.includes('?') ? '&' : '?';
    return `${streamUrl}${separator}client_id=${this.clientId}`;
  }
}

// Export singleton instance
export const soundCloudAPI = new SoundCloudAPI();