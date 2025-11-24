"use client";

import { useState, useMemo } from "react";
import { CurriculumGraph } from "@/components/csii/CurriculumGraph";
import { CourseDetailPanel } from "@/components/csii/CourseDetailPanel";
import { CategoryLegend } from "@/components/csii/CategoryLegend";
import { FilterControls } from "@/components/csii/FilterControls";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  buildCurriculumGraph,
  getCategoryColors,
  filterGraphData,
} from "@/lib/csii/curriculum-data";
import { CSIICourse } from "@/types/csii";

export default function CSIIClientPage() {
  const [selectedCourse, setSelectedCourse] = useState<CSIICourse | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [chargeStrength, setChargeStrength] = useState(-100);
  const [linkDistance, setLinkDistance] = useState(50);

  // Build graph data
  const fullGraphData = useMemo(() => buildCurriculumGraph(), []);
  const categoryColors = useMemo(() => getCategoryColors(), []);

  // Apply filters
  const filteredGraphData = useMemo(
    () => filterGraphData(fullGraphData, selectedCategories, searchQuery),
    [fullGraphData, selectedCategories, searchQuery]
  );

  const handleNodeClick = (course: CSIICourse) => {
    setSelectedCourse(course);
  };

  const handleClosePanel = () => {
    setSelectedCourse(null);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSearchQuery("");
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">CSII Curriculum Graph</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Explore course relationships - courses in similar fields cluster together
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Area */}
        <div className="flex-1 flex flex-col">
          {/* Filter Controls */}
          <FilterControls
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategories={selectedCategories}
            onClearFilters={handleClearFilters}
            totalCourses={fullGraphData.nodes.length}
            filteredCourses={filteredGraphData.nodes.length}
          />

          {/* Graph */}
          <div className="flex-1 relative">
            <CurriculumGraph
              data={filteredGraphData}
              onNodeClick={handleNodeClick}
              selectedCourseId={selectedCourse?.id}
              chargeStrength={chargeStrength}
              linkDistance={linkDistance}
            />
          </div>

          {/* Force Controls & Legend */}
          <div className="border-t bg-background">
            {/* Force Sliders */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-6">
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Repulsion Force
                    </Label>
                    <span className="text-xs font-mono">{chargeStrength}</span>
                  </div>
                  <Slider
                    value={[chargeStrength]}
                    onValueChange={([value]) => setChargeStrength(value)}
                    min={-300}
                    max={-10}
                    step={10}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Link Distance
                    </Label>
                    <span className="text-xs font-mono">{linkDistance}</span>
                  </div>
                  <Slider
                    value={[linkDistance]}
                    onValueChange={([value]) => setLinkDistance(value)}
                    min={20}
                    max={200}
                    step={10}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Legend */}
            <CategoryLegend
              categories={categoryColors}
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
            />
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCourse && (
          <CourseDetailPanel
            course={selectedCourse}
            onClose={handleClosePanel}
          />
        )}
      </div>

      {/* Description Footer */}
      <div className="border-t bg-muted/30 px-6 py-4">
        <h3 className="font-medium text-sm mb-2">About this visualization</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This graph visualizes the CSII curriculum structure using force-directed layout.
          Courses are represented as nodes, colored by their category (e.g., Core Technology, Health and Wellbeing).
          Nodes are connected when courses share similarities - same category, related fields, shared instructors, or same semester.
          Stronger connections pull courses closer together, naturally forming clusters of related subjects.
          Use the <strong>Repulsion Force</strong> slider to spread nodes apart or bring them closer,
          and the <strong>Link Distance</strong> slider to adjust connection lengths.
          Click on any node to see course details, or use the search and category filters to explore specific areas.
        </p>
      </div>
    </div>
  );
}
