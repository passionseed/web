/**
 * Step 1: Vision Question with AI Enhancement
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Check } from "lucide-react";
import { WizardStepProps } from "./types";
import { translations } from "./translations";
import { enhanceVision } from "@/lib/ai/north-star-enhancer";
import { toast } from "sonner";

interface VisionStepProps extends WizardStepProps {
  aiUsed: boolean;
  onAiUsed: () => void;
}

export function VisionStep({
  language,
  formData,
  onFormDataChange,
  aiUsed,
  onAiUsed,
}: VisionStepProps) {
  const t = translations[language];
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleEnhanceVision = async () => {
    if (aiUsed) {
      toast.error(t.aiLimitReached);
      return;
    }

    if (!formData.visionQuestion.trim()) {
      toast.error("Please write your vision first");
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await enhanceVision(formData.visionQuestion, language);
      if (result.success && result.data) {
        onFormDataChange({ visionQuestion: result.data as string });
        onAiUsed();
        toast.success(t.aiEnhanced);
      } else {
        toast.error(result.error || t.aiError);
      }
    } catch (error) {
      toast.error(t.aiError);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-8 border-2 border-amber-200 dark:border-amber-800">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🌟</div>
          <p className="text-base text-amber-800 dark:text-amber-200 italic">
            {t.visionIntro}
          </p>
        </div>

        <div className="space-y-4">
          <Label
            htmlFor="vision"
            className="text-xl font-bold text-amber-900 dark:text-amber-100 block text-center"
          >
            {t.visionTitle}
          </Label>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {t.visionSubtitle}
          </p>
          <Textarea
            id="vision"
            placeholder={t.visionPlaceholder}
            value={formData.visionQuestion}
            onChange={(e) =>
              onFormDataChange({ visionQuestion: e.target.value })
            }
            rows={8}
            className="resize-none text-base"
            autoFocus
          />

          {/* AI Enhancement Button */}
          <div className="flex justify-end mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEnhanceVision}
              disabled={
                isAiLoading || aiUsed || !formData.visionQuestion.trim()
              }
              className="gap-2"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.aiEnhancing}
                </>
              ) : aiUsed ? (
                <>
                  <Check className="w-4 h-4" />
                  {t.aiEnhanced}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t.aiEnhance}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
