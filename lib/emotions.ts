// Emotion-related utility functions

export type EmotionType = 
  | 'happy' 
  | 'sad' 
  | 'angry' 
  | 'anxious' 
  | 'excited' 
  | 'grateful' 
  | 'proud' 
  | 'hopeful' 
  | 'content' 
  | 'neutral' 
  | 'tired' 
  | 'overwhelmed' 
  | 'frustrated' 
  | 'bored' 
  | 'inspired' 
  | 'motivated' 
  | 'confused' 
  | 'pensive' 
  | 'peaceful' 
  | 'nostalgic';

export const emotionColors: Record<EmotionType, [string, string]> = {
  happy: ['bg-yellow-100', 'border-yellow-300'],
  sad: ['bg-blue-100', 'border-blue-300'],
  angry: ['bg-red-100', 'border-red-300'],
  anxious: ['bg-purple-100', 'border-purple-300'],
  excited: ['bg-pink-100', 'border-pink-300'],
  grateful: ['bg-green-100', 'border-green-300'],
  proud: ['bg-amber-100', 'border-amber-300'],
  hopeful: ['bg-sky-100', 'border-sky-300'],
  content: ['bg-emerald-100', 'border-emerald-300'],
  neutral: ['bg-gray-100', 'border-gray-300'],
  tired: ['bg-indigo-100', 'border-indigo-300'],
  overwhelmed: ['bg-violet-100', 'border-violet-300'],
  frustrated: ['bg-orange-100', 'border-orange-300'],
  bored: ['bg-slate-100', 'border-slate-300'],
  inspired: ['bg-fuchsia-100', 'border-fuchsia-300'],
  motivated: ['bg-rose-100', 'border-rose-300'],
  confused: ['bg-cyan-100', 'border-cyan-300'],
  pensive: ['bg-teal-100', 'border-teal-300'],
  peaceful: ['bg-blue-50', 'border-blue-200'],
  nostalgic: ['bg-amber-50', 'border-amber-200'],
};

export const emotionEmojis: Record<EmotionType, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  anxious: '😰',
  excited: '🤩',
  grateful: '🙏',
  proud: '😌',
  hopeful: '🤞',
  content: '😌',
  neutral: '😐',
  tired: '😴',
  overwhelmed: '😵',
  frustrated: '😤',
  bored: '🥱',
  inspired: '✨',
  motivated: '💪',
  confused: '😕',
  pensive: '🤔',
  peaceful: '☮️',
  nostalgic: '🕰️',
};

export const getEmotionColor = (emotion: string): string => {
  const normalizedEmotion = emotion.toLowerCase() as EmotionType;
  return emotionColors[normalizedEmotion]?.join(' ') || 'bg-gray-100 border-gray-300';
};

export const getEmojiForEmotion = (emotion: string): string => {
  const normalizedEmotion = emotion.toLowerCase() as EmotionType;
  return emotionEmojis[normalizedEmotion] || '❓';
};
