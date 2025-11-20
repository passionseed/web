"use client";

import { useState, useEffect } from 'react';
import { University } from '@/types/education';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UniversityPickerProps {
  universities: University[];
  selectedUniversities: University[];
  onSelectionChange: (universities: University[]) => void;
  maxSelections: number;
}

interface UniversityWithPriority extends University {
  priorityRank?: number;
}

export function UniversityPicker({
  universities,
  selectedUniversities,
  onSelectionChange,
  maxSelections
}: UniversityPickerProps) {
  const [selectedWithPriority, setSelectedWithPriority] = useState<UniversityWithPriority[]>([]);

  // Initialize selected universities with priority ranks
  useEffect(() => {
    const withPriority = selectedUniversities.map((uni, index) => ({
      ...uni,
      priorityRank: index + 1
    }));
    setSelectedWithPriority(withPriority);
  }, [selectedUniversities]);

  const handleUniversityClick = (university: University) => {
    if (isSelected(university.id)) {
      // Remove university
      const filtered = selectedWithPriority.filter(u => u.id !== university.id);
      // Reorder priority ranks
      const reordered = filtered.map((uni, index) => ({
        ...uni,
        priorityRank: index + 1
      }));
      setSelectedWithPriority(reordered);
      onSelectionChange(reordered.map(u => ({ ...u, priorityRank: undefined })));
    } else {
      // Add university if under limit
      if (selectedWithPriority.length < maxSelections) {
        const newSelection = {
          ...university,
          priorityRank: selectedWithPriority.length + 1
        };
        const updated = [...selectedWithPriority, newSelection];
        setSelectedWithPriority(updated);
        onSelectionChange(updated.map(u => ({ ...u, priorityRank: undefined })));
      }
    }
  };

  const isSelected = (universityId: string) => {
    return selectedWithPriority.some(u => u.id === universityId);
  };

  const getPriorityRank = (universityId: string) => {
    return selectedWithPriority.find(u => u.id === universityId)?.priorityRank;
  };

  const getPriorityText = (rank: number) => {
    switch (rank) {
      case 1: return '1st Choice';
      case 2: return '2nd Choice';
      case 3: return '3rd Choice';
      default: return `${rank}th Choice`;
    }
  };

  const getPriorityColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500 text-black';
      case 2: return 'bg-gray-400 text-white';
      case 3: return 'bg-orange-600 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const reorderSelection = (universityId: string, newRank: number) => {
    if (newRank < 1 || newRank > selectedWithPriority.length) return;

    const university = selectedWithPriority.find(u => u.id === universityId);
    if (!university) return;

    const filtered = selectedWithPriority.filter(u => u.id !== universityId);
    filtered.splice(newRank - 1, 0, university);

    const reordered = filtered.map((uni, index) => ({
      ...uni,
      priorityRank: index + 1
    }));

    setSelectedWithPriority(reordered);
    onSelectionChange(reordered.map(u => ({ ...u, priorityRank: undefined })));
  };

  return (
    <div className="space-y-6">
      {/* Selection Summary */}
      {selectedWithPriority.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-3">
            Your University Choices ({selectedWithPriority.length}/{maxSelections})
          </h3>
          <div className="space-y-2">
            {selectedWithPriority
              .sort((a, b) => (a.priorityRank || 0) - (b.priorityRank || 0))
              .map((uni) => (
                <div key={uni.id} className="flex items-center justify-between bg-slate-700 rounded p-3">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("text-xs font-bold", getPriorityColor(uni.priorityRank || 1))}>
                      {getPriorityText(uni.priorityRank || 1)}
                    </Badge>
                    <span className="font-medium text-white">{uni.name}</span>
                    <span className="text-slate-400 text-sm">
                      {uni.city}, {uni.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {uni.priorityRank && uni.priorityRank > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reorderSelection(uni.id, (uni.priorityRank || 1) - 1)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      >
                        ↑
                      </Button>
                    )}
                    {uni.priorityRank && uni.priorityRank < selectedWithPriority.length && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reorderSelection(uni.id, (uni.priorityRank || 1) + 1)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      >
                        ↓
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUniversityClick(uni)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* University Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {universities.map((university) => {
          const selected = isSelected(university.id);
          const priorityRank = getPriorityRank(university.id);
          
          return (
            <Card
              key={university.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-lg",
                selected 
                  ? "ring-2 ring-blue-500 bg-slate-800 border-blue-500" 
                  : "hover:ring-1 hover:ring-slate-600 bg-slate-900 border-slate-700",
                selectedWithPriority.length >= maxSelections && !selected && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => handleUniversityClick(university)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header with selection indicator */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg leading-tight">
                        {university.name}
                      </h3>
                      {university.short_name && (
                        <p className="text-slate-400 text-sm">
                          {university.short_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {selected && (
                        <Badge className={cn("text-xs font-bold", getPriorityColor(priorityRank || 1))}>
                          {getPriorityText(priorityRank || 1)}
                        </Badge>
                      )}
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                        selected 
                          ? "bg-blue-500 border-blue-500" 
                          : "border-slate-600"
                      )}>
                        {selected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {university.city && university.state 
                        ? `${university.city}, ${university.state}`
                        : university.country}
                    </span>
                  </div>

                  {/* Description */}
                  {university.description && (
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {university.description}
                    </p>
                  )}

                  {/* Admission Requirements */}
                  {university.admission_requirements && (
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-xs text-slate-300 font-medium mb-1">
                        Admission Requirements:
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {university.admission_requirements}
                      </p>
                    </div>
                  )}

                  {/* Website link */}
                  {university.website_url && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(university.website_url, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Visit Website
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {universities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">
            No universities available. Please contact an administrator to add universities.
          </p>
        </div>
      )}
    </div>
  );
}