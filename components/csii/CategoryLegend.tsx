"use client";

import { CategoryColor } from "@/types/csii";
import { cn } from "@/lib/utils";

interface CategoryLegendProps {
  categories: CategoryColor[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
}

export function CategoryLegend({
  categories,
  selectedCategories,
  onCategoryToggle,
}: CategoryLegendProps) {
  return (
    <div className="border-t bg-background px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Categories
        </span>
        {selectedCategories.length > 0 && (
          <span className="text-xs text-muted-foreground">
            ({selectedCategories.length} selected)
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(({ category, color, count }) => {
          const isSelected =
            selectedCategories.length === 0 ||
            selectedCategories.includes(category);

          return (
            <button
              key={category}
              onClick={() => onCategoryToggle(category)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
                "hover:bg-muted",
                isSelected
                  ? "opacity-100"
                  : "opacity-40 hover:opacity-70"
              )}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="truncate max-w-32">{category}</span>
              <span className="text-muted-foreground">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
