import { Project } from "./project";

export type EmotionType = 
  | 'happy' | 'excited' | 'grateful' | 'content' | 'hopeful'
  | 'sad' | 'anxious' | 'frustrated' | 'overwhelmed' | 'tired'
  | 'neutral' | 'calm' | 'proud' | 'motivated' | 'creative'
  | 'confused' | 'stuck' | 'bored' | 'stressed' | 'energized'
  | 'angry' | 'pensive' | 'peaceful' | 'nostalgic' | 'inspired';

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  user_id: string;
}

export interface ReflectionBase {
  id: string;
  user_id: string;
  content: string;
  emotion: EmotionType;
  created_at: string;
  updated_at: string;
}

export interface ReflectionMetrics {
  id: string;
  reflection_id: string;
  satisfaction: number;
  progress: number;
  challenge: number;
  created_at: string;
  updated_at: string;
}

export interface ReflectionWithMetrics extends ReflectionBase {
  metrics: ReflectionMetrics;
  project: Project;
  reason: string;
  contentPreview: string;
  satisfaction: number;
  progress: number;
  challenge: number;
}

export interface MonthlyInsight {
  id: string;
  user_id: string;
  year: number;
  month: number;
  top_emotion: EmotionType | null;
  top_emotion_count: number;
  most_used_tag: Tag | null;
  progress_notes: string | null;
  created_at: string;
}

export interface ReflectionFormData {
  projectId: string;
  content: string; // "What I did today"
  reason: string; // "Why I feel that way"
  progress: number;
  satisfaction: number;
  challenge: number;
  emotion: EmotionType;
}

export interface ReflectionCalendarDay {
  date: string;
  emotion: EmotionType | null;
  hasReflection: boolean;
  tags: string[];
}

export interface ReflectionTimelineNode extends Omit<ReflectionBase, 'content'> {
  id: string;
  date: string;
  emotion: EmotionType;
  contentPreview: string;
  project: { id: string; name: string };
  metrics: {
    satisfaction: number;
    progress: number;
    challenge: number;
  };
  satisfaction: number;
  progress: number;
  challenge: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export type ReflectionWithSatisfaction = ReflectionTimelineNode & {
  satisfaction: number;
  metrics: {
    satisfaction: number;
    progress: number;
    challenge: number;
  };
  contentPreview: string;
  tags: Tag[];
  emotion: EmotionType;
  date: string;
};
