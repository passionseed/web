"use client";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

// Define EmotionIntensity type
type EmotionIntensity = "very low" | "low" | "medium" | "high" | "very high";

// Define EmotionType with all possible emotion values
export type EmotionType =
  | "amazed"
  | "excited"
  | "surprised"
  | "passionate"
  | "happy"
  | "joyful"
  | "brave"
  | "proud"
  | "confident"
  | "hopeful"
  | "amused"
  | "satisfied"
  | "relieved"
  | "grateful"
  | "content"
  | "calm"
  | "peaceful"
  | "neutral"
  | "indifferent"
  | "contemplative"
  | "sad"
  | "anxious"
  | "frustrated"
  | "angry"
  | "overwhelmed"
  | "tired"
  | "confused"
  | "stuck"
  | "bored"
  | "stressed"
  | "energized";

const EMOTION_GROUPS = [
  {
    category: "Very Pleasant",
    emotions: [
      { value: "amazed", emoji: "😲", label: "Amazed" },
      { value: "excited", emoji: "😃", label: "Excited" },
      { value: "surprised", emoji: "😮", label: "Surprised" },
      { value: "passionate", emoji: "❤️", label: "Passionate" },
      { value: "happy", emoji: "😊", label: "Happy" },
      { value: "joyful", emoji: "😄", label: "Joyful" },
      { value: "brave", emoji: "🦁", label: "Brave" },
      { value: "proud", emoji: "🦚", label: "Proud" },
      { value: "confident", emoji: "😎", label: "Confident" },
      { value: "hopeful", emoji: "✨", label: "Hopeful" },
      { value: "amused", emoji: "😆", label: "Amused" },
      { value: "satisfied", emoji: "😌", label: "Satisfied" },
      { value: "relieved", emoji: "😌", label: "Relieved" },
      { value: "grateful", emoji: "🙏", label: "Grateful" },
      { value: "content", emoji: "😊", label: "Content" },
      { value: "calm", emoji: "😌", label: "Calm" },
      { value: "peaceful", emoji: "☮️", label: "Peaceful" },
    ],
  },
  {
    category: "Neutral",
    emotions: [
      { value: "neutral", emoji: "😐", label: "Neutral" },
      { value: "indifferent", emoji: "😶", label: "Indifferent" },
      { value: "contemplative", emoji: "🤔", label: "Contemplative" },
    ],
  },
  {
    category: "Unpleasant",
    emotions: [
      { value: "sad", emoji: "😢", label: "Sad" },
      { value: "anxious", emoji: "😟", label: "Anxious" },
      { value: "frustrated", emoji: "😤", label: "Frustrated" },
      { value: "angry", emoji: "😠", label: "Angry" },
      { value: "overwhelmed", emoji: "😵‍💫", label: "Overwhelmed" },
      { value: "tired", emoji: "😴", label: "Tired" },
      { value: "confused", emoji: "😕", label: "Confused" },
      { value: "stuck", emoji: "🧗", label: "Stuck" },
      { value: "bored", emoji: "🥱", label: "Bored" },
      { value: "stressed", emoji: "😫", label: "Stressed" },
    ],
  },
];

const INTENSITY_LEVELS: EmotionIntensity[] = [
  "very low",
  "low",
  "medium",
  "high",
  "very high",
];

interface EmotionPickerV2Props {
  value?: {
    emotion: EmotionType;
    intensity: number; // 1-5 scale
  };
  onChange: (value: { emotion: EmotionType; intensity: number }) => void;
  className?: string;
}

export function EmotionPickerV2({
  value,
  onChange,
  className,
}: EmotionPickerV2Props) {
  const selectedEmotion = value?.emotion;
  const selectedIntensity = value?.intensity ?? 3; // Default to medium intensity

  const handleEmotionSelect = (emotion: EmotionType) => {
    onChange({
      emotion,
      intensity: selectedIntensity,
    });
  };

  const handleIntensityChange = (newIntensity: number) => {
    if (selectedEmotion) {
      onChange({
        emotion: selectedEmotion,
        intensity: newIntensity,
      });
    }
  };

  const getEmotionByValue = (value: string) => {
    for (const group of EMOTION_GROUPS) {
      const emotion = group.emotions.find((e) => e.value === value);
      if (emotion) return emotion;
    }
    return null;
  };

  const selectedEmotionData = selectedEmotion
    ? getEmotionByValue(selectedEmotion)
    : null;

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <h2 className="text-lg font-medium text-center mb-6">
        Choose how you're feeling right now
      </h2>

      {/* Emotion Display */}
      <div className="relative w-40 h-40 mx-auto mb-6">
        {/* Outer circle */}
        <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
          {/* Inner circle with gradient */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            {selectedEmotionData ? (
              <div className="text-4xl">{selectedEmotionData.emoji}</div>
            ) : (
              <div className="text-gray-400 text-sm text-center px-4">
                Select an emotion
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Emotion Label */}
      {selectedEmotionData && (
        <div className="text-center mb-8">
          <div className="text-2xl font-semibold">
            {selectedEmotionData.label}
          </div>
          <div className="text-sm text-muted-foreground">
            {EMOTION_GROUPS.find((group) =>
              group.emotions.some((e) => e.value === selectedEmotion)
            )?.category || ""}
          </div>
        </div>
      )}

      {/* Intensity Slider */}
      {selectedEmotionData && (
        <div className="mb-8 px-4">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Very Unpleasant</span>
            <span className="text-muted-foreground">Very Pleasant</span>
          </div>
          <Slider
            value={[selectedIntensity]}
            min={1}
            max={5}
            step={1}
            onValueChange={([val]) => handleIntensityChange(val)}
            className="w-full"
          />
          <div className="mt-2 text-center text-sm text-muted-foreground">
            {INTENSITY_LEVELS[selectedIntensity - 1]}
          </div>
        </div>
      )}

      {/* Emotion Grid */}
      <div className="space-y-4">
        {EMOTION_GROUPS.map((group) => (
          <div key={group.category} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {group.category}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {group.emotions.map((emotion) => (
                <button
                  key={emotion.value}
                  type="button"
                  onClick={() =>
                    handleEmotionSelect(emotion.value as EmotionType)
                  }
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all h-16",
                    "hover:bg-accent hover:border-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    selectedEmotion === emotion.value
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-border"
                  )}
                >
                  <span className="text-2xl">{emotion.emoji}</span>
                  <span className="text-xs mt-1">{emotion.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
