"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw } from "lucide-react";

type Cluster = {
  id: string;
  cluster_index: number;
  label: string | null;
  summary: string | null;
  member_count: number;
  color: string | null;
};

type Point = {
  assignmentId: string;
  clusterId: string;
  embeddingId: string;
  scope: "hackathon_individual" | "hackathon_team";
  submissionId: string;
  snippet: string;
  x: number;
  y: number;
  distance: number | null;
};

type Clustering = {
  id: string;
  k: number;
  sample_count: number;
  created_at: string;
  algorithm: string;
};

type ResponsePayload = {
  activity: { id: string; title: string | null; submission_scope: string };
  clustering: Clustering | null;
  clusters: Cluster[];
  points: Point[];
};

type Props = {
  activityId: string;
  /** Compact mode trims chrome for embedding inside other admin views. */
  compact?: boolean;
};

const DEFAULT_COLOR = "#94a3b8";

export function SubmissionClusterView({ activityId, compact = false }: Props) {
  const [data, setData] = useState<ResponsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [reclustering, setReclustering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hackathon/activities/${activityId}/clusters`);
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const payload: ResponsePayload = await res.json();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRecluster = useCallback(async () => {
    setReclustering(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hackathon/activities/${activityId}/clusters`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReclustering(false);
    }
  }, [activityId, fetchData]);

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

  const bounds = useMemo(() => {
    if (!data || data.points.length === 0) return null;
    const xs = data.points.map((p) => p.x);
    const ys = data.points.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [data]);

  useEffect(() => {
    if (!bounds || canvasSize.width === 0 || canvasSize.height === 0) return;
    const dataWidth = bounds.maxX - bounds.minX || 1;
    const dataHeight = bounds.maxY - bounds.minY || 1;
    const padding = 40;
    const scaleX = (canvasSize.width - padding * 2) / dataWidth;
    const scaleY = (canvasSize.height - padding * 2) / dataHeight;
    const scale = Math.min(scaleX, scaleY, 80);
    setTransform({ x: 0, y: 0, scale });
  }, [bounds, canvasSize]);

  const colorByClusterId = useMemo(() => {
    const map = new Map<string, string>();
    data?.clusters.forEach((c) => {
      map.set(c.id, c.color ?? DEFAULT_COLOR);
    });
    return map;
  }, [data]);

  const pointToScreen = useCallback(
    (p: Point) => {
      if (!bounds) return { x: 0, y: 0 };
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      return {
        x: canvasSize.width / 2 + (p.x - cx) * transform.scale + transform.x,
        y: canvasSize.height / 2 + (p.y - cy) * transform.scale + transform.y,
      };
    },
    [bounds, canvasSize, transform]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !bounds || canvasSize.width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    for (const p of data.points) {
      const { x, y } = pointToScreen(p);
      const isSelected = !selectedClusterId || selectedClusterId === p.clusterId;
      const color = colorByClusterId.get(p.clusterId) ?? DEFAULT_COLOR;
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? color : `${color}55`;
      ctx.fill();
      ctx.strokeStyle = isSelected ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [data, bounds, canvasSize, transform, selectedClusterId, colorByClusterId, pointToScreen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      }

      if (!data || !bounds) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let nearest: Point | null = null;
      let minDist = Infinity;
      for (const p of data.points) {
        const { x, y } = pointToScreen(p);
        const d = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
        if (d < 12 && d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
      setHoverPoint(nearest);
    },
    [data, bounds, pointToScreen]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({ ...prev, scale: Math.max(1, Math.min(400, prev.scale * factor)) }));
  }, []);

  const clusterList = data?.clusters ?? [];
  const totalSamples = data?.clustering?.sample_count ?? 0;
  const height = compact ? 360 : 640;

  if (loading && !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Submission clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Submission clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error ?? "Failed to load."}</p>
        </CardContent>
      </Card>
    );
  }

  const showEmpty = !data.clustering || data.points.length === 0;

  return (
    <Card className="w-full relative overflow-hidden" style={{ height }}>
      <CardHeader className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <CardTitle className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="flex flex-col">
            <span className="text-base">
              {data.activity.title ?? "Activity"} — Submission clusters
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {data.clustering
                ? `${data.clustering.k} clusters · ${totalSamples} submissions · run ${new Date(
                    data.clustering.created_at
                  ).toLocaleString()}`
                : "No clustering yet — click Recluster to generate."}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRecluster}
              disabled={reclustering}
            >
              {reclustering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Recluster
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-full relative">
        {error && (
          <div className="absolute top-20 left-4 right-4 z-20 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {showEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-10 text-sm text-muted-foreground">
            {reclustering
              ? "Clustering..."
              : data.clustering
              ? "No submissions to cluster yet."
              : "No clustering yet for this activity."}
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0 pt-[84px]">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height - 84}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>

        {/* Cluster legend */}
        <div className="absolute bottom-4 left-4 z-10 flex max-h-[calc(100%-120px)] w-64 flex-col gap-1 overflow-y-auto rounded-lg border bg-background/90 p-3 text-xs shadow-lg">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Clusters
          </div>
          {clusterList.length === 0 && (
            <div className="text-muted-foreground">No clusters yet.</div>
          )}
          {clusterList.map((c) => {
            const isActive = selectedClusterId === c.id;
            return (
              <button
                key={c.id}
                onClick={() =>
                  setSelectedClusterId((prev) => (prev === c.id ? null : c.id))
                }
                className={`flex items-center gap-2 rounded px-1 py-1 text-left transition-colors ${
                  isActive ? "bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: c.color ?? DEFAULT_COLOR }}
                />
                <span className="flex-1 truncate">
                  {c.label ?? `Cluster ${c.cluster_index + 1}`}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {c.member_count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hover popover */}
        {hoverPoint && (
          <div className="absolute bottom-4 right-4 z-10 max-w-sm rounded-lg border bg-background/95 p-3 shadow-lg">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {hoverPoint.scope === "hackathon_team" ? "Team" : "Individual"} submission
            </div>
            <p className="text-xs leading-relaxed">
              {hoverPoint.snippet || <span className="italic">No text</span>}
            </p>
            {hoverPoint.distance !== null && (
              <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                distance {hoverPoint.distance.toFixed(3)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
