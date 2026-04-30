"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface ClusterCanvasCluster {
  id: string;
  cluster_index: number;
  label: string | null;
  summary: string | null;
  member_count: number;
  color: string | null;
}

export interface ClusterCanvasPoint {
  assignmentId: string;
  clusterId: string;
  embeddingId: string;
  x: number;
  y: number;
  distance: number | null;
  [key: string]: unknown;
}

export interface ClusterCanvasClustering {
  id: string;
  k: number;
  sample_count: number;
  created_at: string;
  algorithm: string;
}

export interface ClusterCanvasProps {
  title: string;
  fetchUrl: string;
  reclusterUrl: string;
  compact?: boolean;
  /** Extract clustering/clusters/points from the API response */
  parseResponse: (data: unknown) => {
    clustering: ClusterCanvasClustering | null;
    clusters: ClusterCanvasCluster[];
    points: ClusterCanvasPoint[];
  };
  /** Render custom tooltip content for a hovered point */
  renderTooltip: (point: ClusterCanvasPoint) => React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_COLOR = "#94a3b8";

function getTouchDistance(a: React.Touch, b: React.Touch) {
  return Math.sqrt((a.clientX - b.clientX) ** 2 + (a.clientY - b.clientY) ** 2);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ClusterCanvas({
  title,
  fetchUrl,
  reclusterUrl,
  compact = false,
  parseResponse,
  renderTooltip,
}: ClusterCanvasProps) {
  const [parsed, setParsed] = useState<{
    clustering: ClusterCanvasClustering | null;
    clusters: ClusterCanvasCluster[];
    points: ClusterCanvasPoint[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reclustering, setReclustering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<ClusterCanvasPoint | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const pinchDistRef = useRef<number | null>(null);

  /* ---- data fetching ---- */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setParsed(parseResponse(await res.json()));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, parseResponse]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRecluster = useCallback(async () => {
    setReclustering(true);
    setError(null);
    try {
      const res = await fetch(reclusterUrl, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReclustering(false);
    }
  }, [reclusterUrl, fetchData]);

  /* ---- resize observer ---- */

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

  /* ---- bounds & auto-fit ---- */

  const bounds = useMemo(() => {
    if (!parsed || parsed.points.length === 0) return null;
    const xs = parsed.points.map((p) => p.x);
    const ys = parsed.points.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [parsed]);

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

  /* ---- colour map ---- */

  const colorByClusterId = useMemo(() => {
    const map = new Map<string, string>();
    parsed?.clusters.forEach((c) => {
      map.set(c.id, c.color ?? DEFAULT_COLOR);
    });
    return map;
  }, [parsed]);

  /* ---- coordinate mapping ---- */

  const pointToScreen = useCallback(
    (p: ClusterCanvasPoint) => {
      if (!bounds) return { x: 0, y: 0 };
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      return {
        x: canvasSize.width / 2 + (p.x - cx) * transform.scale + transform.x,
        y: canvasSize.height / 2 + (p.y - cy) * transform.scale + transform.y,
      };
    },
    [bounds, canvasSize, transform],
  );

  /* ---- canvas draw ---- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsed || !bounds || canvasSize.width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    for (const p of parsed.points) {
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
  }, [parsed, bounds, canvasSize, transform, selectedClusterId, colorByClusterId, pointToScreen]);

  /* ---- mouse handlers ---- */

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const findNearestPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!parsed || !bounds) return null;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      let nearest: ClusterCanvasPoint | null = null;
      let minDist = Infinity;
      for (const p of parsed.points) {
        const { x, y } = pointToScreen(p);
        const d = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
        if (d < 12 && d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
      return nearest;
    },
    [parsed, bounds, pointToScreen],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      }
      setHoverPoint(findNearestPoint(e.clientX, e.clientY));
    },
    [findNearestPoint],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(1, Math.min(400, prev.scale * factor)),
    }));
  }, []);

  /* ---- touch handlers ---- */

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      draggingRef.current = true;
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      draggingRef.current = false;
      pinchDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && draggingRef.current) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x;
        const dy = e.touches[0].clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setHoverPoint(findNearestPoint(e.touches[0].clientX, e.touches[0].clientY));
      } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        const factor = newDist / pinchDistRef.current;
        pinchDistRef.current = newDist;
        setTransform((prev) => ({
          ...prev,
          scale: Math.max(1, Math.min(400, prev.scale * factor)),
        }));
      }
    },
    [findNearestPoint],
  );

  const handleTouchEnd = useCallback(() => {
    draggingRef.current = false;
    pinchDistRef.current = null;
  }, []);

  /* ---- render ---- */

  const clusterList = parsed?.clusters ?? [];
  const height = compact ? 360 : 640;

  if (loading && !parsed) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!parsed) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error ?? "Failed to load."}</p>
        </CardContent>
      </Card>
    );
  }

  const showEmpty = !parsed.clustering || parsed.points.length === 0;

  return (
    <Card className="w-full relative overflow-hidden" style={{ height }}>
      <CardHeader className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <CardTitle className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="flex flex-col">
            <span className="text-base">{title}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {parsed.clustering
                ? `${parsed.clustering.k} clusters · ${parsed.clustering.sample_count} samples · run ${new Date(
                    parsed.clustering.created_at,
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
              : parsed.clustering
                ? "No data to cluster yet."
                : "No clustering yet."}
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0 pt-[84px]">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height - 84}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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

        {/* Hover popover — content delegated to renderTooltip */}
        {hoverPoint && (
          <div className="absolute bottom-4 right-4 z-10 max-w-sm rounded-lg border bg-background/95 p-3 shadow-lg">
            {renderTooltip(hoverPoint)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
