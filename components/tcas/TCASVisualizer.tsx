"use client";

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Node = {
  id: string;
  name: string;
  faculty: string;
  university: string;
  x: number;
  y: number;
  color?: string;
};

type Categories = {
  faculties: string[];
  universities: string[];
};

const FACULTY_COLORS: Record<string, string> = {
  "คณะวิศวกรรมศาสตร์": "#3b82f6",
  "คณะแพทยศาสตร์": "#ef4444",
  "คณะวิทยาศาสตร์": "#10b981",
  "คณะอักษรศาสตร์": "#f59e0b",
  "คณะนิติศาสตร์": "#6366f1",
  "คณะรัฐศาสตร์": "#ec4899",
  "คณะพาณิชยศาสตร์และการบัญชี": "#8b5cf6",
  "คณะสถาปัตยกรรมศาสตร์": "#14b8a6",
};

const DEFAULT_COLOR = "#94a3b8";

export function TCASVisualizer() {
  const [data, setData] = useState<{ nodes: Node[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categories, setCategories] = useState<Categories>({ faculties: [], universities: [] });
  const [categoryType, setCategoryType] = useState<string>("popular");
  const [categoryValue, setCategoryValue] = useState<string>("popular");
  const [hoverNode, setHoverNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Pan and zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/tcas/categories")
      .then((res) => res.json())
      .then((d) => {
        setCategories(d);
        setInitialLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch categories:", err);
        setInitialLoading(false);
      });
  }, []);

  // Fetch projection data when category changes
  useEffect(() => {
    if (!categoryType || !categoryValue) {
      setData({ nodes: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const url = `/api/tcas/projection?category=${categoryType}&value=${encodeURIComponent(categoryValue)}`;
    fetch(url)
      .then((res) => res.json())
      .then((d) => {
        const nodesWithColors = d.nodes.map((n: Node) => ({
          ...n,
          color: FACULTY_COLORS[n.faculty] || DEFAULT_COLOR,
        }));
        setData({ nodes: nodesWithColors });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch projection:", err);
        setLoading(false);
      });
  }, [categoryType, categoryValue]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const categoryOptions = useMemo(() => {
    if (categoryType === "faculty") return categories.faculties;
    if (categoryType === "university") return categories.universities;
    return [];
  }, [categoryType, categories]);

  const filteredNodes = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.nodes;
    const lowerQuery = searchQuery.toLowerCase();
    return data.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(lowerQuery) ||
        n.university.toLowerCase().includes(lowerQuery) ||
        n.faculty.toLowerCase().includes(lowerQuery)
    );
  }, [data, searchQuery]);

  // Compute data bounds for auto-fit
  const dataBounds = useMemo(() => {
    if (filteredNodes.length === 0) return null;
    const xs = filteredNodes.map(n => n.x);
    const ys = filteredNodes.map(n => n.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [filteredNodes]);

  // Auto-fit zoom when data changes
  useEffect(() => {
    if (!dataBounds || canvasSize.width === 0 || canvasSize.height === 0) return;
    
    const { minX, maxX, minY, maxY } = dataBounds;
    const dataWidth = maxX - minX || 1;
    const dataHeight = maxY - minY || 1;
    
    // Calculate scale to fit data in canvas with padding
    const padding = 50;
    const scaleX = (canvasSize.width - padding * 2) / dataWidth;
    const scaleY = (canvasSize.height - padding * 2) / dataHeight;
    const scale = Math.min(scaleX, scaleY, 2); // Cap at 2x zoom
    
    setTransform({ x: 0, y: 0, scale });
  }, [dataBounds, canvasSize]);

  const handleCategoryTypeChange = useCallback(
    (value: string) => {
      setCategoryType(value);
      setSearchQuery("");
      if (value === "popular") {
        setCategoryValue("popular");
        return;
      }
      if (value === "faculty" && categories.faculties.length > 0) {
        setCategoryValue(categories.faculties[0]);
        return;
      }
      if (value === "university" && categories.universities.length > 0) {
        setCategoryValue(categories.universities[0]);
        return;
      }
      setCategoryValue("");
    },
    [categories]
  );

  const handleCategoryValueChange = useCallback((value: string) => {
    setCategoryValue(value);
    setSearchQuery("");
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas (transparent to show card background)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    if (filteredNodes.length === 0 || !dataBounds) return;

    const { minX, maxX, minY, maxY } = dataBounds;
    const dataWidth = maxX - minX || 1;
    const dataHeight = maxY - minY || 1;

    // Draw nodes
    filteredNodes.forEach((node) => {
      // Transform from data space to screen space
      const screenX = canvasSize.width / 2 + (node.x - (minX + maxX) / 2) * transform.scale + transform.x;
      const screenY = canvasSize.height / 2 + (node.y - (minY + maxY) / 2) * transform.scale + transform.y;

      // Draw node with glow effect
      ctx.beginPath();
      ctx.arc(screenX, screenY, Math.max(3, 5 * Math.min(transform.scale, 2)), 0, Math.PI * 2);
      ctx.fillStyle = node.color || DEFAULT_COLOR;
      ctx.fill();
      
      // Add subtle border
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [filteredNodes, canvasSize, transform, dataBounds]);

  // Mouse handlers for pan/zoom
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(10, prev.scale * zoomFactor)),
    }));
  }, []);

  // Find hovered node
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    handleMouseMove(e);
    
    if (!dataBounds || filteredNodes.length === 0) {
      setHoverNode(null);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { minX, maxX, minY, maxY } = dataBounds;

    // Find closest node
    let closest: Node | null = null;
    let closestDist = Infinity;

    filteredNodes.forEach((node) => {
      const screenX = canvasSize.width / 2 + (node.x - (minX + maxX) / 2) * transform.scale + transform.x;
      const screenY = canvasSize.height / 2 + (node.y - (minY + maxY) / 2) * transform.scale + transform.y;
      const dist = Math.sqrt((screenX - mouseX) ** 2 + (screenY - mouseY) ** 2);
      
      if (dist < 15 && dist < closestDist) {
        closest = node;
        closestDist = dist;
      }
    });

    setHoverNode(closest);
  }, [handleMouseMove, dataBounds, filteredNodes, canvasSize, transform]);

  const totalPrograms = data?.nodes.length ?? 0;
  const activeScopeLabel = useMemo(() => {
    if (categoryType === "popular") return "Popular view";
    if (categoryType === "faculty") return categoryValue ? `Faculty · ${categoryValue}` : "Faculty view";
    if (categoryType === "university") return categoryValue ? `University · ${categoryValue}` : "University view";
    return "Current view";
  }, [categoryType, categoryValue]);

  const scopeStatusText = `${activeScopeLabel} · ${totalPrograms} ${totalPrograms === 1 ? "program" : "programs"}`;
  const searchStatusText = searchQuery ? `Filtered by "${searchQuery}"` : undefined;
  const isInitialLoad = initialLoading || (loading && !data);
  const showFilterLoading = loading && !!data;
  const emptyMessage = searchQuery
    ? `No programs match "${searchQuery}" within the current view.`
    : "No programs currently available for this view.";

  if (isInitialLoad) {
    return (
      <Card className="w-full h-[600px]">
        <CardHeader>
          <CardTitle>TCAS Program Semantic Map</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  if (!categoryType || !categoryValue) {
    return (
      <Card className="w-full h-[600px]">
        <CardHeader>
          <CardTitle>TCAS Program Semantic Map</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a category to view programs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-[700px] relative overflow-hidden">
      <CardHeader className="absolute top-0 left-0 z-10 bg-background/80 backdrop-blur-sm w-full border-b">
        <CardTitle className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col">
            <span>TCAS Program Semantic Map</span>
            <span className="text-sm font-normal text-muted-foreground">
              {scopeStatusText}
            </span>
            {searchStatusText && (
              <span className="text-xs font-light text-muted-foreground">
                {searchStatusText}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <Select value={categoryType} onValueChange={handleCategoryTypeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="university">University</SelectItem>
              </SelectContent>
            </Select>

            {categoryType === "popular" ? (
              <div className="px-3 py-2 rounded-lg border border-muted-foreground/30 text-sm text-muted-foreground">
                Popular 300 programs
              </div>
            ) : (
              <Select value={categoryValue} onValueChange={handleCategoryValueChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt.length > 30 ? opt.substring(0, 30) + "..." : opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-full relative">
        {showFilterLoading && (
          <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" />
            <div className="relative px-4 py-2 rounded-full border border-muted-foreground/40 bg-background/90 text-sm text-muted-foreground">
              Updating view...
            </div>
          </div>
        )}
        {filteredNodes.length === 0 && !loading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10 bg-background/90 p-3 rounded-lg border shadow-lg text-xs space-y-1">
          <div className="font-bold mb-2">Faculties</div>
          {Object.entries(FACULTY_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span>{name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEFAULT_COLOR }} />
            <span>Others</span>
          </div>
        </div>

        {/* Hover Detail */}
        {hoverNode && (
          <div className="absolute bottom-4 left-4 z-10 bg-background/90 p-4 rounded-lg border shadow-lg max-w-xs">
            <div className="font-bold text-sm">{hoverNode.name}</div>
            <div className="text-xs text-primary">{hoverNode.faculty}</div>
            <div className="text-xs text-muted-foreground">{hoverNode.university}</div>
          </div>
        )}

        {/* Zoom controls hint */}
        <div className="absolute top-4 right-4 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Scroll to zoom · Drag to pan
        </div>
      </CardContent>
    </Card>
  );
}