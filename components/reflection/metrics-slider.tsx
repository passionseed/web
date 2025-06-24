import { Slider as ShadcnSlider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MetricsSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  emoji?: string;
}

export function MetricsSlider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  className,
  emoji,
}: MetricsSliderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-lg">{emoji}</span>}
          <Label htmlFor={label.toLowerCase()} className="text-sm font-medium">
            {label}
          </Label>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {value} / {max}
        </span>
      </div>
      <ShadcnSlider
        id={label.toLowerCase()}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([val]) => onChange(val)}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}
