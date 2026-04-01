import { createClient } from "@/utils/supabase/client";

export type HackathonChallenge = {
  id: string;
  track_id: string;
  num: string;
  title_en: string;
  title_th: string | null;
  hook_en: string | null;
  hook_th: string | null;
  challenge_en: string;
  challenge_th: string | null;
  tangible_equivalent_en: string | null;
  tangible_equivalent_th: string | null;
  tags: string[];
  severity: number | null;
  difficulty: number | null;
  impact: number | null;
  urgency: number | null;
};

export type HackathonTrack = {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  challenges?: HackathonChallenge[];
};

export const getHackathonTracksWithChallenges = async (): Promise<HackathonTrack[]> => {
  const supabase = createClient();
  const { data: tracks, error: tracksError } = await supabase
    .from("hackathon_tracks")
    .select("*")
    .order("display_order", { ascending: true });

  if (tracksError) {
    console.error("Error fetching hackathon tracks:", tracksError);
    return [];
  }

  const { data: challenges, error: challengesError } = await supabase
    .from("hackathon_challenges")
    .select("*")
    .order("num", { ascending: true });

  if (challengesError) {
    console.error("Error fetching hackathon challenges:", challengesError);
    return [];
  }

  return tracks.map((track) => ({
    ...track,
    challenges: challenges.filter((c) => c.track_id === track.id),
  }));
};
