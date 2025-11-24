"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FilterControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategories: string[];
  onClearFilters: () => void;
  totalCourses: number;
  filteredCourses: number;
}

export function FilterControls({
  searchQuery,
  onSearchChange,
  selectedCategories,
  onClearFilters,
  totalCourses,
  filteredCourses,
}: FilterControlsProps) {
  const hasFilters = searchQuery || selectedCategories.length > 0;
  const isFiltered = filteredCourses !== totalCourses;

  return (
    <div className="border-b px-4 py-3 flex items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search courses, instructors..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Course count */}
      <div className="text-sm text-muted-foreground">
        {isFiltered ? (
          <>
            Showing <span className="font-medium">{filteredCourses}</span> of{" "}
            {totalCourses} courses
          </>
        ) : (
          <>
            <span className="font-medium">{totalCourses}</span> courses
          </>
        )}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
