/**
 * SyncStatusIndicator - Visual feedback for position sync status
 *
 * Displays a subtle indicator in the bottom-right corner showing:
 * - "Saving..." (animated) when sync is in progress
 * - "All changes saved" (with checkmark) when sync completes
 * - Error state if sync fails
 *
 * Auto-hides after successful sync completes.
 */

"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  message?: string;
  className?: string;
}

export function SyncStatusIndicator({
  status,
  message,
  className,
}: SyncStatusIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show indicator when saving, saved, or error
    if (status === "saving" || status === "saved" || status === "error") {
      setVisible(true);
    }

    // Auto-hide after 2 seconds when status is "saved"
    if (status === "saved") {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Auto-hide after 5 seconds on error
    if (status === "error") {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }

    // Hide immediately when idle
    if (status === "idle") {
      setVisible(false);
    }
  }, [status]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "fixed bottom-4 right-4 z-50",
            "flex items-center gap-2",
            "px-4 py-2 rounded-lg shadow-lg",
            "text-sm font-medium",
            "backdrop-blur-sm",
            status === "saving" &&
              "bg-blue-900/80 border border-blue-700 text-blue-100",
            status === "saved" &&
              "bg-green-900/80 border border-green-700 text-green-100",
            status === "error" &&
              "bg-red-900/80 border border-red-700 text-red-100",
            className
          )}
        >
          {/* Icon */}
          {status === "saving" && (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          )}
          {status === "saved" && (
            <Check className="w-4 h-4" aria-hidden="true" />
          )}
          {status === "error" && (
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
          )}

          {/* Message */}
          <span>
            {status === "saving" && "Saving..."}
            {status === "saved" && (message || "All changes saved")}
            {status === "error" && (message || "Failed to save changes")}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
