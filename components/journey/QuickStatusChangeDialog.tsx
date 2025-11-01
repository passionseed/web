"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";
import { NorthStar, NorthStarStatus } from "@/types/journey";
import { cn } from "@/lib/utils";

interface QuickStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  northStar: NorthStar | null;
  newStatus: NorthStarStatus;
  onConfirm: () => void;
}

interface StatusTransitionConfig {
  title: string;
  icon: string;
  message: string;
  themeColors: {
    bg: string;
    border: string;
    text: string;
    buttonBg: string;
    buttonHover: string;
  };
  showInput: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  warningBadge?: string;
  confirmButtonText: string;
}

function getStatusLabel(status: NorthStarStatus): string {
  const labels: Record<NorthStarStatus, string> = {
    active: "Active",
    on_hold: "On Hold",
    archived: "Archived",
    achieved: "Achieved",
  };
  return labels[status];
}

function getStatusColor(status: NorthStarStatus): string {
  const colors: Record<NorthStarStatus, string> = {
    active: "text-blue-600 dark:text-blue-400",
    on_hold: "text-yellow-600 dark:text-yellow-400",
    archived: "text-gray-600 dark:text-gray-400",
    achieved: "text-green-600 dark:text-green-400",
  };
  return colors[status];
}

function getTransitionConfig(
  currentStatus: NorthStarStatus,
  newStatus: NorthStarStatus
): StatusTransitionConfig {
  // Pause: active → on_hold
  if (currentStatus === "active" && newStatus === "on_hold") {
    return {
      title: "⏸️ Pause North Star",
      icon: "⏸️",
      message:
        "Taking a break from this North Star? It will remain visible but dimmed. You can resume anytime.",
      themeColors: {
        bg: "from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20",
        border: "border-yellow-200 dark:border-yellow-800",
        text: "text-yellow-800 dark:text-yellow-200",
        buttonBg: "bg-yellow-600 hover:bg-yellow-700",
        buttonHover: "hover:bg-yellow-700",
      },
      showInput: true,
      inputLabel: "Reason for pausing (optional)",
      inputPlaceholder: "Why are you pausing this North Star?",
      confirmButtonText: "Pause North Star",
    };
  }

  // Resume: on_hold → active
  if (currentStatus === "on_hold" && newStatus === "active") {
    return {
      title: "▶️ Resume North Star",
      icon: "▶️",
      message:
        "Welcome back! This North Star will return to full brightness and become active again.",
      themeColors: {
        bg: "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
        border: "border-blue-200 dark:border-blue-800",
        text: "text-blue-800 dark:text-blue-200",
        buttonBg: "bg-blue-600 hover:bg-blue-700",
        buttonHover: "hover:bg-blue-700",
      },
      showInput: false,
      confirmButtonText: "Resume North Star",
    };
  }

  // Archive: any → archived
  if (newStatus === "archived") {
    return {
      title: "⚫ Archive North Star",
      icon: "⚫",
      message:
        "This North Star will become a 'white dwarf' - dimmed and desaturated but still visible. You can reignite it later if needed.",
      themeColors: {
        bg: "from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20",
        border: "border-gray-300 dark:border-gray-700",
        text: "text-gray-700 dark:text-gray-300",
        buttonBg: "bg-gray-600 hover:bg-gray-700",
        buttonHover: "hover:bg-gray-700",
      },
      showInput: false,
      warningBadge: "This will dim the star",
      confirmButtonText: "Archive North Star",
    };
  }

  // Reignite: archived → active
  if (currentStatus === "archived" && newStatus === "active") {
    return {
      title: "🔥 Reignite North Star",
      icon: "🔥",
      message:
        "Bringing this North Star back to life! It will return to full color and vibrancy, ready to guide you again.",
      themeColors: {
        bg: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
        border: "border-amber-300 dark:border-amber-700",
        text: "text-amber-800 dark:text-amber-200",
        buttonBg: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
        buttonHover: "hover:from-amber-600 hover:to-orange-600",
      },
      showInput: false,
      confirmButtonText: "Reignite North Star",
    };
  }

  // Achievement: any → achieved
  if (newStatus === "achieved") {
    return {
      title: "✨ Mark as Achieved",
      icon: "✨",
      message:
        "Congratulations! This North Star has been fulfilled. Take a moment to reflect on what you accomplished.",
      themeColors: {
        bg: "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
        border: "border-green-200 dark:border-green-800",
        text: "text-green-800 dark:text-green-200",
        buttonBg: "bg-green-600 hover:bg-green-700",
        buttonHover: "hover:bg-green-700",
      },
      showInput: true,
      inputLabel: "Achievement reflection (optional)",
      inputPlaceholder: "What did you achieve? How does it feel?",
      confirmButtonText: "Mark as Achieved",
    };
  }

  // Default fallback
  return {
    title: "Change Status",
    icon: "🔄",
    message: `Change this North Star status to ${getStatusLabel(newStatus)}.`,
    themeColors: {
      bg: "from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20",
      border: "border-gray-200 dark:border-gray-800",
      text: "text-gray-800 dark:text-gray-200",
      buttonBg: "bg-gray-600 hover:bg-gray-700",
      buttonHover: "hover:bg-gray-700",
    },
    showInput: false,
    confirmButtonText: "Confirm",
  };
}

export function QuickStatusChangeDialog({
  open,
  onOpenChange,
  northStar,
  newStatus,
  onConfirm,
}: QuickStatusChangeDialogProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!northStar) return null;

  const config = getTransitionConfig(northStar.status, newStatus);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      setNote("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {config.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Change North Star status from {getStatusLabel(northStar.status)} to{" "}
            {getStatusLabel(newStatus)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Themed message box */}
          <div
            className={cn(
              "rounded-xl p-6 border-2",
              `bg-gradient-to-br ${config.themeColors.bg}`,
              config.themeColors.border
            )}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{config.icon}</div>
              <p className={cn("text-sm italic", config.themeColors.text)}>
                {config.message}
              </p>
            </div>

            {config.warningBadge && (
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-medium">
                  ⚠️ {config.warningBadge}
                </span>
              </div>
            )}
          </div>

          {/* Current North Star Display */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                North Star
              </Label>
              <p className="font-semibold text-base mt-1">{northStar.title}</p>
            </div>

            {/* Status Transition Arrow */}
            <div className="flex items-center gap-3 justify-center py-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    getStatusColor(northStar.status)
                  )}
                >
                  {getStatusLabel(northStar.status)}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    getStatusColor(newStatus)
                  )}
                >
                  {getStatusLabel(newStatus)}
                </span>
              </div>
            </div>
          </div>

          {/* Optional Input Field */}
          {config.showInput && (
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm">
                {config.inputLabel}
              </Label>
              <Textarea
                id="note"
                placeholder={config.inputPlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={cn(config.themeColors.buttonBg)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              config.confirmButtonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
