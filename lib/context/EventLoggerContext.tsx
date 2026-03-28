"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { EventType, EventData, UserEvent } from "@/types/events";

// Session storage keys
const SESSION_ID_KEY = "ps_session_id";
const SESSION_TIMESTAMP_KEY = "ps_session_timestamp";
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface EventLoggerContextType {
  sessionId: string | null;
  logEvent: (eventType: EventType, eventData?: EventData) => Promise<void>;
  isLoading: boolean;
}

const EventLoggerContext = createContext<EventLoggerContextType | null>(null);

function generateSessionId(): string {
  return crypto.randomUUID();
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return generateSessionId();
  }

  const existingId = localStorage.getItem(SESSION_ID_KEY);
  const timestampStr = localStorage.getItem(SESSION_TIMESTAMP_KEY);

  // Check if session has expired (24 hours)
  if (existingId && timestampStr) {
    const timestamp = parseInt(timestampStr, 10);
    if (Date.now() - timestamp < SESSION_EXPIRY_MS) {
      return existingId;
    }
  }

  // Create new session
  const newId = generateSessionId();
  localStorage.setItem(SESSION_ID_KEY, newId);
  localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  return newId;
}

export function EventLoggerProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize session on mount
    const id = getOrCreateSessionId();
    setSessionId(id);
    setIsLoading(false);
  }, []);

  const logEvent = useCallback(
    async (eventType: EventType, eventData: EventData = {}) => {
      // Check for new session on each event (in case 24h passed)
      const currentSessionId = getOrCreateSessionId();
      if (currentSessionId !== sessionId) {
        setSessionId(currentSessionId);
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Skip if not authenticated (fail-silent for anonymous users)
        if (!user) {
          return;
        }

        const { error } = await supabase.from("user_events").insert({
          user_id: user.id,
          event_type: eventType,
          event_data: eventData,
          session_id: currentSessionId,
        });

        if (error) {
          // Fail-silent: log error but don't block user flow
          console.error("Failed to log event:", error);
        }
      } catch (error) {
        // Fail-silent: log error but don't block user flow
        console.error("Event logging error:", error);
      }
    },
    [sessionId]
  );

  return (
    <EventLoggerContext.Provider value={{ sessionId, logEvent, isLoading }}>
      {children}
    </EventLoggerContext.Provider>
  );
}

export function useEventLogger() {
  const context = useContext(EventLoggerContext);
  if (!context) {
    throw new Error("useEventLogger must be used within an EventLoggerProvider");
  }
  return context;
}

// Re-export types for convenience
export type { EventType, EventData, UserEvent };