"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface AdminStats {
  total_users: number;
  total_students: number;
  total_instructors: number;
  total_admins: number;
  total_classrooms: number;
  total_maps: number;
  recent_activity_count: number;
}

const METRICS = [
  { key: "total_users", label: "Registered users" },
  { key: "total_instructors", label: "Instructors" },
  { key: "total_classrooms", label: "Classrooms" },
  { key: "total_maps", label: "Learning maps" },
] as const;

export function AdminStatsOverview({
  onStatsLoaded,
}: {
  onStatsLoaded?: (stats: AdminStats) => void;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadStats() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch("/api/admin/stats", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to fetch statistics");
        const data: AdminStats = await response.json();
        if (controller.signal.aborted) return;
        setStats(data);
        onStatsLoaded?.(data);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadStats();
    return () => controller.abort();
  }, [attempt, onStatsLoaded]);

  if (error) {
    return (
      <div className="admin-stats-error" role="status">
        <p>Statistics are unavailable. You can still open any admin tool.</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="admin-quiet-link"
        >
          <RefreshCw size={15} aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Platform statistics"
      aria-busy={loading}
      className="admin-stats"
    >
      {loading && (
        <span className="sr-only" role="status">
          Loading platform statistics
        </span>
      )}
      <dl className="admin-stats-grid">
        {METRICS.map(({ key, label }) => (
          <div key={key} className="admin-stat">
            <dt>{label}</dt>
            <dd>
              {loading ? (
                <span className="admin-stat-skeleton" />
              ) : (
                stats?.[key].toLocaleString()
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
