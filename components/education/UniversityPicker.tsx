"use client";

import { useState, useEffect, useCallback } from "react";
import { University } from "@/types/education";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  MapPin,
  Check,
  Search,
  Loader2,
  Sparkles,
  GraduationCap,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { motion, AnimatePresence } from "framer-motion";

interface UniversityPickerProps {
  universities: University[]; // Initial list (can be browse list)
  selectedUniversities: University[];
  onSelectionChange: (universities: University[]) => void;
  maxSelections: number;
  onSearch?: (query: string) => Promise<University[]>;
}

interface UniversityWithPriority extends University {
  priorityRank?: number;
}

export function UniversityPicker({
  universities: initialUniversities,
  selectedUniversities,
  onSelectionChange,
  maxSelections,
  onSearch,
}: UniversityPickerProps) {
  const [selectedWithPriority, setSelectedWithPriority] = useState<
    UniversityWithPriority[]
  >([]);
  const [displayedUniversities, setDisplayedUniversities] =
    useState<University[]>(initialUniversities);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Initialize selected universities with priority ranks
  useEffect(() => {
    const withPriority = selectedUniversities.map((uni, index) => ({
      ...uni,
      priorityRank: index + 1,
    }));
    setSelectedWithPriority(withPriority);
  }, [selectedUniversities]);

  // Update displayed if initial changes (and not searching)
  useEffect(() => {
    if (!searchQuery && !isSearching) {
      setDisplayedUniversities(initialUniversities);
    }
  }, [initialUniversities]);

  const performSearch = async (query: string) => {
    if (!onSearch) return;

    setIsSearching(true);
    try {
      if (!query.trim()) {
        setDisplayedUniversities(initialUniversities);
      } else {
        const results = await onSearch(query);
        setDisplayedUniversities(results);
      }
    } catch (error) {
      console.error("Search failed", error);
      setDisplayedUniversities([]);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, 500),
    [onSearch, initialUniversities]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleUniversityClick = (university: University) => {
    if (isSelected(university.id)) {
      const filtered = selectedWithPriority.filter(
        (u) => u.id !== university.id
      );
      const reordered = filtered.map((uni, index) => ({
        ...uni,
        priorityRank: index + 1,
      }));
      setSelectedWithPriority(reordered);
      onSelectionChange(
        reordered.map((u) => ({ ...u, priorityRank: undefined }))
      );
    } else {
      if (selectedWithPriority.length < maxSelections) {
        const newSelection = {
          ...university,
          priorityRank: selectedWithPriority.length + 1,
        };
        const updated = [...selectedWithPriority, newSelection];
        setSelectedWithPriority(updated);
        onSelectionChange(
          updated.map((u) => ({ ...u, priorityRank: undefined }))
        );
      }
    }
  };

  const isSelected = (universityId: string) => {
    return selectedWithPriority.some((u) => u.id === universityId);
  };

  const getPriorityRank = (universityId: string) => {
    return selectedWithPriority.find((u) => u.id === universityId)
      ?.priorityRank;
  };

  const reorderSelection = (universityId: string, newRank: number) => {
    if (newRank < 1 || newRank > selectedWithPriority.length) return;
    const university = selectedWithPriority.find((u) => u.id === universityId);
    if (!university) return;
    const filtered = selectedWithPriority.filter((u) => u.id !== universityId);
    filtered.splice(newRank - 1, 0, university);
    const reordered = filtered.map((uni, index) => ({
      ...uni,
      priorityRank: index + 1,
    }));
    setSelectedWithPriority(reordered);
    onSelectionChange(
      reordered.map((u) => ({ ...u, priorityRank: undefined }))
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      {onSearch && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <Input
            placeholder="Search for curriculum, university, or program..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 py-6 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 text-lg rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
          {isSearching && (
            <div className="absolute right-4 top-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            </div>
          )}
        </div>
      )}

      {/* Selected Items (Compact) */}
      <AnimatePresence>
        {selectedWithPriority.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {selectedWithPriority
              .sort((a, b) => (a.priorityRank || 0) - (b.priorityRank || 0))
              .map((uni) => (
                <motion.div
                  key={uni.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-blue-600/20 border border-blue-500/30 rounded-full pl-3 pr-2 py-1.5 flex items-center gap-2"
                >
                  <span className="flex items-center justify-center bg-blue-500 text-white text-[10px] h-4 w-4 rounded-full font-bold">
                    {uni.priorityRank}
                  </span>
                  <span className="text-sm font-medium text-blue-100 max-w-[200px] truncate">
                    {uni.short_name || uni.name}
                  </span>
                  <button
                    onClick={() => handleUniversityClick(uni)}
                    className="hover:bg-blue-500/20 rounded-full p-0.5 ml-1 transition-colors"
                  >
                    <Check className="w-3 h-3 text-blue-300" />
                  </button>
                </motion.div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {displayedUniversities.map((university) => {
            const selected = isSelected(university.id);
            const priorityRank = getPriorityRank(university.id);
            const isCurriculum = university.id.includes("curr");

            return (
              <motion.div
                layout
                key={university.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                onClick={() => handleUniversityClick(university)}
              >
                <Card
                  className={cn(
                    "h-full cursor-pointer relative overflow-hidden group border-0 bg-slate-800/50 backdrop-blur-sm",
                    selected
                      ? "ring-2 ring-blue-500 bg-blue-900/20"
                      : "hover:bg-slate-800 transition-colors"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0 left-0 w-1 h-full transition-all duration-300",
                      selected
                        ? "bg-blue-500"
                        : "bg-transparent group-hover:bg-slate-600"
                    )}
                  />

                  <CardContent className="p-5 pl-6">
                    <div className="flex flex-col h-full justify-between gap-4">
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="flex justify-between items-start gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-mono tracking-wider border-slate-700 bg-slate-900/50",
                              selected
                                ? "text-blue-300 border-blue-500/30"
                                : "text-slate-400"
                            )}
                          >
                            {isCurriculum ? "PROGRAM" : "UNIVERSITY"}
                          </Badge>
                          {university.admission_requirements &&
                            !isNaN(
                              Number(university.admission_requirements)
                            ) && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {university.admission_requirements} Seats
                              </Badge>
                            )}
                        </div>

                        {/* Title & Subtitle */}
                        <div className="min-w-0">
                          <h4
                            className={cn(
                              "font-bold text-lg leading-snug mb-1 transition-colors break-words",
                              selected
                                ? "text-blue-200"
                                : "text-slate-100 group-hover:text-white"
                            )}
                          >
                            {university.short_name || university.name}
                          </h4>
                          <p className="text-slate-400 text-sm font-medium flex items-start gap-1.5 break-words">
                            {isCurriculum ? (
                              <>
                                <GraduationCap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">
                                  {university.name}
                                </span>
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                {university.city || "Thailand"}
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Footer / Description */}
                      {university.description && (
                        <div className="pt-3 border-t border-slate-700/50 mt-1">
                          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                            {university.description}
                          </p>
                        </div>
                      )}

                      {/* Selection Overlay Effect */}
                      {selected && (
                        <div className="absolute top-3 right-3">
                          <div className="bg-blue-500 rounded-full p-1 shadow-lg shadow-blue-500/20 animate-in zoom-in duration-200">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {displayedUniversities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No results found
          </h3>
          <p className="text-slate-400 max-w-xs mx-auto">
            We couldn't find any programs matching "{searchQuery}". Try
            searching for a university name or faculty.
          </p>
        </div>
      )}
    </div>
  );
}
