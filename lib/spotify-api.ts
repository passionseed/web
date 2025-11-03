// Client-side Spotify API interface
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

class SpotifyAPI {
  async searchTracks(query: string, limit = 20): Promise<SearchResult[]> {
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to search tracks');
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching tracks:', error);
      return [];
    }
  }

  async getTrackById(id: string): Promise<SearchResult | null> {
    try {
      const response = await fetch(`/api/spotify/search?q=track:${id}&limit=1`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.results[0] || null;
    } catch (error) {
      console.error('Error fetching track by ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const spotifyAPI = new SpotifyAPI();