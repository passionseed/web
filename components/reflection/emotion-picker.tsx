import { cn } from "@/lib/utils";
import { EmotionType } from "@/types/reflection";

const EMOTIONS = [
  { value: "happy" as const, emoji: "😊", label: "Happy" },
  { value: "excited" as const, emoji: "🎉", label: "Excited" },
  { value: "grateful" as const, emoji: "🙏", label: "Grateful" },
  { value: "content" as const, emoji: "😌", label: "Content" },
  { value: "hopeful" as const, emoji: "🌟", label: "Hopeful" },
  { value: "sad" as const, emoji: "😢", label: "Sad" },
  { value: "anxious" as const, emoji: "😟", label: "Anxious" },
  { value: "frustrated" as const, emoji: "😤", label: "Frustrated" },
  { value: "overwhelmed" as const, emoji: "😵‍💫", label: "Overwhelmed" },
  { value: "tired" as const, emoji: "😴", label: "Tired" },
  { value: "neutral" as const, emoji: "😐", label: "Neutral" },
  { value: "calm" as const, emoji: "😌", label: "Calm" },
  { value: "proud" as const, emoji: "🦁", label: "Proud" },
  { value: "motivated" as const, emoji: "💪", label: "Motivated" },
  { value: "creative" as const, emoji: "🎨", label: "Creative" },
  { value: "confused" as const, emoji: "😕", label: "Confused" },
  { value: "stuck" as const, emoji: "🧗", label: "Stuck" },
  { value: "bored" as const, emoji: "🥱", label: "Bored" },
  { value: "stressed" as const, emoji: "😫", label: "Stressed" },
  { value: "energized" as const, emoji: "⚡", label: "Energized" },
];

interface EmotionPickerProps {
  value?: EmotionType;
  onChange: (emotion: EmotionType) => void;
  className?: string;
}

export function EmotionPicker({
  value,
  onChange,
  className,
}: EmotionPickerProps) {
  return (
    <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-5", className)}>
      {EMOTIONS.map((emotion) => (
        <button
          key={emotion.value}
          type="button"
          onClick={() => onChange(emotion.value)}
          className={cn(
            "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
            "hover:bg-accent hover:border-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            value === emotion.value
              ? "bg-primary/10 border-primary"
              : "bg-background border-border"
          )}
        >
          <span className="text-2xl mb-1">{emotion.emoji}</span>
          <span className="text-xs text-muted-foreground">{emotion.label}</span>
        </button>
      ))}
    </div>
  );
}
