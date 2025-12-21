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
  ChevronLeft,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDirectionFinder } from "./direction-finder/direction-finder-context";

interface UniversityPickerProps {
  universities: University[]; // Initial list (can be browse list)
  selectedUniversities: University[];
  onSelectionChange: (universities: University[]) => void;
  maxSelections: number;
  onSearch?: (query: string, level?: string) => Promise<University[]>;
}

interface UniversityWithPriority extends University {
  priorityRank?: number;
}

const CATEGORIES = [
  {
    id: "engineering",
    th: "วิศวกรรมศาสตร์",
    en: "Engineering",
    search: "Bachelor of Engineering",
  },
  {
    id: "science",
    th: "วิทยาศาสตร์",
    en: "Science",
    search: "Bachelor of Science",
  },
  { id: "arts", th: "ศิลปศาสตร์", en: "Arts", search: "Bachelor of Arts" },
  {
    id: "business",
    th: "บริหารธุรกิจ",
    en: "Business",
    search: "Bachelor of Business",
  },
  {
    id: "education",
    th: "ครุศาสตร์/ศึกษาศาสตร์",
    en: "Education",
    search: "Bachelor of Education",
  },
  {
    id: "medicine",
    th: "แพทยศาสตร์",
    en: "Medicine",
    search: "Doctor of Medicine",
  },
  {
    id: "nursing",
    th: "พยาบาลศาสตร์",
    en: "Nursing",
    search: "Bachelor of Nursing",
  },
  {
    id: "architecture",
    th: "สถาปัตยกรรม",
    en: "Architecture",
    search: "Bachelor of Architecture",
  },
  { id: "law", th: "นิติศาสตร์", en: "Law", search: "Bachelor of Laws" },
  {
    id: "communication",
    th: "นิเทศศาสตร์",
    en: "Communication Arts",
    search: "Bachelor of Communication",
  },
  {
    id: "agriculture",
    th: "เกษตรศาสตร์",
    en: "Agriculture",
    search: "Bachelor of Agriculture",
  },
  {
    id: "fine-arts",
    th: "วิจิตรศิลป์",
    en: "Fine Arts",
    search: "Bachelor of Fine Arts",
  },
  {
    id: "economics",
    th: "เศรษฐศาสตร์",
    en: "Economics",
    search: "Bachelor of Economics",
  },
  {
    id: "pol-sci",
    th: "รัฐศาสตร์",
    en: "Political Science",
    search: "Bachelor of Political Science",
  },
  {
    id: "dentistry",
    th: "ทันตแพทยศาสตร์",
    en: "Dentistry",
    search: "Doctor of Dental Surgery",
  },
  {
    id: "pharmacy",
    th: "เภสัชศาสตร์",
    en: "Pharmacy",
    search: "Doctor of Pharmacy",
  },
  {
    id: "allied-health",
    th: "สหเวชศาสตร์",
    en: "Allied Health Sciences",
    search: "Bachelor of Science",
  }, // Usually B.Sc
  {
    id: "psychology",
    th: "จิตวิทยา",
    en: "Psychology",
    search: "Bachelor of Science",
  }, // Often B.Sc or B.A
  {
    id: "public-health",
    th: "สาธารณสุขศาสตร์",
    en: "Public Health",
    search: "Bachelor of Public Health",
  },
  {
    id: "veterinary",
    th: "สัตวแพทยศาสตร์",
    en: "Veterinary Science",
    search: "Doctor of Veterinary Medicine",
  },
  { id: "others", th: "อื่นๆ / ค้นหา", en: "Others / Search", search: "" },
];

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
  const [groupedUniversities, setGroupedUniversities] = useState<
    Record<string, University[]>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<"categories" | "list">("categories");
  const { language } = useLanguage();

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

  // Grouping Effect
  useEffect(() => {
    const groups: Record<string, University[]> = {};

    displayedUniversities.forEach((uni) => {
      let category = uni.category || "Other";
      if (uni.is_international) {
        category = `International - ${category}`;
      }

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(uni);
    });

    setGroupedUniversities(groups);
  }, [displayedUniversities]);

  const performSearch = async (query: string, level: string) => {
    if (!onSearch) return;

    setIsSearching(true);
    try {
      if (!query.trim()) {
        setDisplayedUniversities(initialUniversities);
      } else {
        const results = await onSearch(
          query,
          level === "all" ? undefined : level
        );
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
      performSearch(query, selectedLevel);
    }, 500),
    [onSearch, initialUniversities, selectedLevel]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleLevelChange = (value: string) => {
    setSelectedLevel(value);
    if (searchQuery) {
      performSearch(searchQuery, value);
    }
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

  const handleCategoryClick = (category: (typeof CATEGORIES)[0]) => {
    setSearchQuery(category.search);
    setSelectedLevel("all"); // Reset or set default
    performSearch(category.search, "all");
    setView("list");
  };

  const handleBackToCategories = () => {
    setSearchQuery("");
    setDisplayedUniversities([]);
    setView("categories");
  };

  // Gate: Check Direction Finder Result
  const { hasResult, isLoading: isDirectionLoading } = useDirectionFinder();

  if (isDirectionLoading) {
    return (
      <div className="p-12 text-center text-slate-500">Checking profile...</div>
    );
  }

  if (!hasResult) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center sm:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-4 max-w-md mx-auto">
          <div className="rounded-full bg-blue-500/10 p-4 mb-2">
            <Sparkles className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            Unlock Smart Recommendations
          </h3>
          <p className="text-slate-400">
            To see tailored university and curriculum recommendations, we need
            to know a bit about you first. Take our quick 5-minute assessment to
            find your North Star.
          </p>
          <Button
            size="lg"
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() =>
              (window.location.href = "/education/direction-finder")
            }
          >
            Start Assessment
          </Button>
        </div>
        {/* Blur effect for the content behind (simulated) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 blur-md grayscale"
          aria-hidden="true"
        >
          {/* We could render a fake list here but simple blocked state is cleaner */}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === "categories" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((category) => (
            <Card
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className="cursor-pointer hover:bg-slate-800 transition-colors border-0 bg-slate-800/50 backdrop-blur-sm group py-8"
            >
              <CardContent className="flex flex-col items-center justify-center text-center p-4 gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-2">
                  {category.id === "others" ? (
                    <MoreHorizontal className="w-6 h-6 text-blue-400" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-slate-100 group-hover:text-blue-200">
                  {language === "th" ? category.th : category.en}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === "th" ? category.en : category.th}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Search Bar */}
          {onSearch && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBackToCategories}
                className="h-[60px] w-[60px] shrink-0 border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  placeholder="Search for curriculum, university, or program..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 py-6 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 text-lg rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all w-full"
                />
                {/* Level Filter */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <Select
                    value={selectedLevel}
                    onValueChange={handleLevelChange}
                  >
                    <SelectTrigger className="w-[140px] h-9 bg-slate-800 border-slate-600 text-xs">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === "th" ? "ทุกระดับ" : "All Levels"}
                      </SelectItem>
                      <SelectItem value="ปริญญาตรี">
                        {language === "th" ? "ปริญญาตรี" : "Bachelor"}
                      </SelectItem>
                      <SelectItem value="ปริญญาโท">
                        {language === "th" ? "ปริญญาโท" : "Master"}
                      </SelectItem>
                      <SelectItem value="ปริญญาเอก">
                        {language === "th" ? "ปริญญาเอก" : "PhD"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isSearching && (
                  <div className="absolute right-40 top-4">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  </div>
                )}
              </div>
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

          {/* Grouped Grid */}
          <div className="space-y-8">
            {Object.entries(groupedUniversities)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, universities]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-xl font-semibold text-blue-200 border-b border-blue-500/20 pb-2">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {universities.map((university) => {
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
                            whileHover={{
                              y: -5,
                              transition: { duration: 0.2 },
                            }}
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
                                      <div className="flex gap-2">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-[10px] font-mono tracking-wider border-slate-700 bg-slate-900/50",
                                            selected
                                              ? "text-blue-300 border-blue-500/30"
                                              : "text-slate-400"
                                          )}
                                        >
                                          {isCurriculum
                                            ? language === "th"
                                              ? "หลักสูตร"
                                              : "PROGRAM"
                                            : language === "th"
                                              ? "มหาวิทยาลัย"
                                              : "UNIVERSITY"}
                                        </Badge>
                                        {university.is_international && (
                                          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                                            INTER
                                          </Badge>
                                        )}
                                      </div>
                                      {university.admission_requirements &&
                                        !isNaN(
                                          Number(
                                            university.admission_requirements
                                          )
                                        ) && (
                                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {
                                              university.admission_requirements
                                            }{" "}
                                            Seats
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
                                        {language === "th"
                                          ? university.name_th ||
                                            university.name
                                          : university.short_name ||
                                            university.name}
                                      </h4>

                                      {/* Secondary Language Name */}
                                      {language === "th" &&
                                        university.name_en && (
                                          <p className="text-xs text-slate-500 mb-2 font-medium">
                                            {university.name_en}
                                          </p>
                                        )}

                                      <p className="text-slate-400 text-sm font-medium flex items-start gap-1.5 break-words">
                                        {isCurriculum ? (
                                          <>
                                            <GraduationCap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            <span className="line-clamp-2">
                                              {language === "th"
                                                ? university.university_name_th ||
                                                  university.short_name_th ||
                                                  university.name
                                                : university.university_name_en ||
                                                  university.name}
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
                                        {/* Don't reuse name_th here as description if we already showed it as title */}
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
                </div>
              ))}
          </div>

          {displayedUniversities.length === 0 && searchQuery && (
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

          {displayedUniversities.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                {language === "th" ? "ค้นหาหลักสูตร" : "Search for Programs"}
              </h3>
              <p className="text-slate-400 max-w-xs mx-auto">
                {language === "th"
                  ? "พิมพ์ชื่อคณะ สาขา หรือมหาวิทยาลัยที่คุณสนใจ"
                  : "Type a faculty, major, or university name to start searching."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
