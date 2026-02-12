"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Zap, DollarSign, Clock } from "lucide-react";
import { AVAILABLE_MODELS } from "@/lib/ai/modelRegistry";
import { toast } from "sonner";

interface ModelComparisonDialogProps {
  onRegenerate: (modelIds: string[]) => Promise<void>;
  disabled?: boolean;
}

export function ModelComparisonDialog({
  onRegenerate,
  disabled = false,
}: ModelComparisonDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "gemini-3-flash-preview",
  ]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Debug logging
  console.log('ModelComparisonDialog rendered', { isOpen, disabled });

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleRegenerate = async () => {
    if (selectedModels.length === 0) {
      toast.error("Please select at least one model");
      return;
    }

    if (selectedModels.length > 3) {
      toast.error("Maximum 3 models can be compared at once");
      return;
    }

    setIsRegenerating(true);
    try {
      await onRegenerate(selectedModels);
      toast.success(
        `Generated results with ${selectedModels.length} model${selectedModels.length > 1 ? "s" : ""}`
      );
      setIsOpen(false);
    } catch (error) {
      console.error("Regeneration failed:", error);
      toast.error("Failed to regenerate results");
    } finally {
      setIsRegenerating(false);
    }
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case "fastest":
        return <Zap className="w-3 h-3 text-green-400" />;
      case "fast":
        return <Zap className="w-3 h-3 text-blue-400" />;
      case "medium":
        return <Clock className="w-3 h-3 text-yellow-400" />;
      case "slow":
        return <Clock className="w-3 h-3 text-orange-400" />;
      default:
        return null;
    }
  };

  const getCostIcon = (cost: string) => {
    switch (cost) {
      case "lowest":
        return <DollarSign className="w-3 h-3 text-green-400" />;
      case "low":
        return <DollarSign className="w-3 h-3 text-blue-400" />;
      case "medium":
        return <DollarSign className="w-3 h-3 text-yellow-400" />;
      case "high":
        return <DollarSign className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('Dialog onOpenChange:', open);
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => console.log('Compare Models button clicked')}
          className="gap-2 border-amber-500/30 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Compare Models</span>
          <span className="sm:hidden">Models</span>
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="z-[9998]" />
        <DialogContent
          className="max-w-2xl max-h-[90vh] bg-slate-900 border-slate-700 text-slate-200 z-[9999]"
        >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Model Comparison
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select 1-3 models to regenerate the direction profile and compare
            results. Great for A/B testing different AI models.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Count */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <span className="text-sm text-slate-300">
              Selected: {selectedModels.length}/3 models
            </span>
            {selectedModels.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedModels([])}
                className="text-xs text-slate-500 hover:text-red-400"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Model List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(AVAILABLE_MODELS).map(([provider, models]) => (
                <div key={provider} className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    {provider}
                  </h3>
                  <div className="space-y-2">
                    {models.map((model) => {
                      const isSelected = selectedModels.includes(model.id);
                      const isDisabled =
                        !isSelected && selectedModels.length >= 3;

                      return (
                        <div
                          key={model.id}
                          onClick={() =>
                            !isDisabled && toggleModel(model.id)
                          }
                          className={`
                            flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer
                            ${
                              isSelected
                                ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
                                : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50"
                            }
                            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {model.name}
                              </span>
                              {model.id ===
                                "gemini-3-flash-preview" && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-blue-500/30 text-blue-300"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                {getSpeedIcon(model.speed)}
                                {model.speed}
                              </span>
                              <span className="flex items-center gap-1">
                                {getCostIcon(model.cost)}
                                {model.cost}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {model.id}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={selectedModels.length === 0 || isRegenerating}
              className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate ({selectedModels.length})
                </>
              )}
            </Button>
          </div>

          {/* Warning */}
          {selectedModels.length > 1 && (
            <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-lg text-xs text-amber-200">
              ⚠️ Comparing {selectedModels.length} models will take longer and
              cost more. Results will be displayed side-by-side.
            </div>
          )}
        </div>
      </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
