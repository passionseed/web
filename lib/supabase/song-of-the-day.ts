import { createClient } from "@/utils/supabase/client";

export interface SongOfTheDay {
  id: string;
  user_id: string;
  song_url: string;
  song_title: string;
  artist: string;
  date: string;
  created_at: string;
  updated_at: string;
  album_cover_url?: string;
  preview_url?: string;
  spotify_id?: string;
  duration_ms?: number;
  popularity?: number;
}

export interface SongOfTheDayCreateData {
  song_url: string;
  song_title: string;
  artist: string;
  album_cover_url?: string;
  preview_url?: string;
  spotify_id?: string;
  duration_ms?: number;
  popularity?: number;
}

export interface SongOfTheDayUpdateData {
  song_url?: string;
  song_title?: string;
  artist?: string;
  album_cover_url?: string;
  preview_url?: string;
  spotify_id?: string;
  duration_ms?: number;
  popularity?: number;
}

const TABLE_NAME = "song_of_the_day";

/**
 * Get today's song for the authenticated user
 */
export async function getTodaysSong(): Promise<SongOfTheDay | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  const { data: song, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    console.error("Error fetching today's song:", error);
    throw new Error(`Failed to fetch today's song: ${error.message}`);
  }

  return song;
}

/**
 * Create or update today's song for the authenticated user
 */
export async function setTodaysSong(
  data: SongOfTheDayCreateData
): Promise<SongOfTheDay> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  // Try to update existing song for today first
  const { data: existingSong } = await supabase
    .from(TABLE_NAME)
    .select("id")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (existingSong) {
    // Update existing song
    const { data: updatedSong, error } = await supabase
      .from(TABLE_NAME)
      .update({
        song_url: data.song_url,
        song_title: data.song_title,
        artist: data.artist,
        album_cover_url: data.album_cover_url,
        preview_url: data.preview_url,
        spotify_id: data.spotify_id,
        duration_ms: data.duration_ms,
        popularity: data.popularity,
      })
      .eq("id", existingSong.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating today's song:", error);
      throw new Error(`Failed to update today's song: ${error.message}`);
    }

    return updatedSong;
  } else {
    // Create new song
    const { data: newSong, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        user_id: user.id,
        song_url: data.song_url,
        song_title: data.song_title,
        artist: data.artist,
        album_cover_url: data.album_cover_url,
        preview_url: data.preview_url,
        spotify_id: data.spotify_id,
        duration_ms: data.duration_ms,
        popularity: data.popularity,
        date: today,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating today's song:", error);
      throw new Error(`Failed to create today's song: ${error.message}`);
    }

    return newSong;
  }
}

/**
 * Get all songs for the authenticated user (history)
 */
export async function getUserSongHistory(limit = 30): Promise<SongOfTheDay[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: songs, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching song history:", error);
    throw new Error(`Failed to fetch song history: ${error.message}`);
  }

  return songs || [];
}

/**
 * Get song for a specific date
 */
export async function getSongForDate(date: string): Promise<SongOfTheDay | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: song, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error("Error fetching song for date:", error);
    throw new Error(`Failed to fetch song for date: ${error.message}`);
  }

  return song;
}

/**
 * Delete a song by ID
 */
export async function deleteSong(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    console.error("Error deleting song:", error);
    throw new Error(`Failed to delete song: ${error.message}`);
  }
}

/**
 * Check if user can set a song for today
 */
export async function canSetTodaysSong(): Promise<boolean> {
  try {
    const song = await getTodaysSong();
    // User can always set/update their song for today
    return true;
  } catch (error) {
    // If there's an authentication error, user can't set song
    return false;
  }
}

/**
 * Get song statistics for the user
 */
export async function getSongStats(): Promise<{
  totalSongs: number;
  currentStreak: number;
  longestStreak: number;
}> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: songs, error } = await supabase
    .from(TABLE_NAME)
    .select("date")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching song stats:", error);
    throw new Error(`Failed to fetch song stats: ${error.message}`);
  }

  const totalSongs = songs?.length || 0;

  if (totalSongs === 0) {
    return { totalSongs: 0, currentStreak: 0, longestStreak: 0 };
  }

  // Calculate streaks
  const dates = songs!.map((s) => new Date(s.date));
  dates.sort((a, b) => a.getTime() - b.getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate current streak (working backwards from today)
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = new Date(dates[i]);
    date.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === currentStreak) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    
    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);

  return { totalSongs, currentStreak, longestStreak };
}