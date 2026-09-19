"use client";

import { useEffect, useCallback } from "react";

interface TrackPageViewOptions {
  page_path: string;
  participant_id?: string | null;
  session_id?: string;
}

/**
 * Hook to track hackathon page views for analytics
 * Tracks unique visitors, referrers, and engagement metrics
 */
export function useHackathonAnalytics() {
  const trackPageView = useCallback(async (options: TrackPageViewOptions) => {
    try {
      await fetch("/api/hackathon/track-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_path: options.page_path,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
          participant_id: options.participant_id || null,
          session_id: options.session_id || null,
        }),
      });
    } catch (error) {
      // Silently fail - analytics shouldn't break the user experience
      console.debug("Failed to track page view:", error);
    }
  }, []);

  const trackEvent = useCallback(async (eventType: string, eventData?: Record<string, unknown>) => {
    try {
      await fetch("/api/hackathon/track-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: eventType,
          event_data: eventData || {},
          page_path: typeof window !== "undefined" ? window.location.pathname : "",
        }),
      });
    } catch (error) {
      console.debug("Failed to track event:", error);
    }
  }, []);

  return { trackPageView, trackEvent };
}

/**
 * Hook to automatically track page views on component mount
 * Use this in page components to track visits
 */
export function useTrackPageView(pagePath: string, participantId?: string | null) {
  const { trackPageView } = useHackathonAnalytics();

  useEffect(() => {
    trackPageView({
      page_path: pagePath,
      participant_id: participantId,
    });
  }, [pagePath, participantId, trackPageView]);
}
