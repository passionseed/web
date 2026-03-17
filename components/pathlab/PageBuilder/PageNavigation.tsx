"use client";

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageNavigationProps {
  currentDay: number;
  totalDays: number;
  onDayChange: (day: number) => void;
  onAddDay: () => void;
  className?: string;
}

export function PageNavigation({
  currentDay,
  totalDays,
  onDayChange,
  onAddDay,
  className,
}: PageNavigationProps) {
  const hasPrevious = currentDay > 1;
  const hasNext = currentDay < totalDays;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDayChange(currentDay - 1)}
        disabled={!hasPrevious}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            onClick={() => onDayChange(day)}
            className={cn(
              "h-8 min-w-[32px] px-2 rounded text-sm font-medium transition-colors",
              day === currentDay
                ? "bg-blue-600 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            )}
          >
            {day}
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDayChange(currentDay + 1)}
        disabled={!hasNext}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="h-4 w-px bg-neutral-700 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onAddDay}
        className="h-8 gap-1 px-2 text-neutral-400 hover:text-white"
      >
        <Plus className="h-4 w-4" />
        <span className="text-xs">Add Page</span>
      </Button>
    </div>
  );
}
