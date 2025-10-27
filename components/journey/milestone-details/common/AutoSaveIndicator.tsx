/**
 * AutoSaveIndicator - Visual feedback for milestone auto-save status
 *
 * Displays a subtle indicator showing:
 * - "Saving..." (animated spinner) when save is in progress
 * - "Saved" (with checkmark) when save completes
 * - "Error saving" (with alert icon) if save fails
 * - Hidden when idle
 *
 * Auto-fades out after successful save.
 */

"use client";

import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export interface AutoSaveIndicatorProps {
  status: SyncStatus;
  message?: string;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  message,
  className,
}: AutoSaveIndicatorProps) {
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "flex items-center gap-2 text-xs font-medium",
            status === "saving" && "text-blue-400",
            status === "saved" && "text-green-400",
            status === "error" && "text-red-400",
            className
          )}
        >
          {/* Icon */}
          {status === "saving" && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          )}
          {status === "saved" && (
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {status === "error" && (
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          )}

          {/* Message */}
          <span>
            {status === "saving" && "Saving..."}
            {status === "saved" && (message || "Saved")}
            {status === "error" && (message || "Error saving")}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
