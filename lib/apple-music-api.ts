// Apple Music API integration routed through server endpoints
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
  async searchTracks(query: string, limit = 10): Promise<AppleMusicResult[]> {
    if (!query.trim()) return [];

    try {
      const response = await fetch(
        `/api/apple-music/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch {
      return [];
    }
  }

  async findTrackByArtistAndTitle(
    artist: string,
    title: string
  ): Promise<AppleMusicResult | null> {
    if (!artist.trim() || !title.trim()) return null;

    try {
      const response = await fetch(
        `/api/apple-music/search?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}&limit=5`
      );

      if (!response.ok) return null;
      const data = await response.json();
      const results: AppleMusicResult[] = data.results || [];
      return results[0] || null;
    } catch {
      return null;
    }
  }

  async getTrackById(id: string): Promise<AppleMusicResult | null> {
    if (!id) return null;

    try {
      const response = await fetch(
        `/api/apple-music/search?q=${encodeURIComponent(id)}&limit=1`
      );
      if (!response.ok) return null;

      const data = await response.json();
      const results: AppleMusicResult[] = data.results || [];
      return results[0] || null;
    } catch {
      return null;
    }
  }

  isAvailable(): boolean {
    return true;
  }
}

export const appleMusicAPI = new AppleMusicAPI();
