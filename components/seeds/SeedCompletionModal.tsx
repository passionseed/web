"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, CheckCircle2, Award, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { CertificatePreviewModal } from "./certificates/CertificatePreviewModal";
import {
  getCertificateConfig,
  buildCertificateData,
  checkCertificateEligibility,
  getIssuedCertificate,
  createIssuedCertificate,
} from "@/lib/supabase/certificates";
import { awardBadge, hasUserEarnedBadge } from "@/lib/supabase/badges";
import { createClient } from "@/utils/supabase/client";
import type { CertificateData, SeedCertificateConfig } from "@/types/seeds";
import type { UserBadge } from "@/types/badges";
import { toast } from "sonner";

interface SeedCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedTitle: string;
  seedId?: string;
  roomId?: string;
  completionId?: string;
  userId?: string;
  userName?: string;
  completionDate?: string;
  onContinue?: () => void;
}

export function SeedCompletionModal({
  open,
  onOpenChange,
  seedTitle,
  seedId,
  roomId,
  completionId,
  userId,
  userName,
  completionDate,
  onContinue,
}: SeedCompletionModalProps) {
  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [loadingCertificate, setLoadingCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [certificateConfig, setCertificateConfig] = useState<Partial<SeedCertificateConfig> | null>(null);
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [certificateId, setCertificateId] = useState<string | undefined>();
  const [badgeAwarded, setBadgeAwarded] = useState<UserBadge | null>(null);

  useEffect(() => {
    if (open && seedId) {
      checkCertificateAvailability();
      awardBadgeIfNeeded();
    }
  }, [open, seedId]);

  const checkCertificateAvailability = async () => {
    if (!seedId) {
      setCertificateEnabled(false);
      return;
    }
    const config = await getCertificateConfig(seedId);
    setCertificateEnabled(config?.enabled || false);
  };

  const awardBadgeIfNeeded = async () => {
    if (!userId || !seedId || !seedTitle || !roomId || !completionId || !completionDate) {
      return;
    }

    // Check if badge already earned
    const alreadyEarned = await hasUserEarnedBadge(userId, seedId);
    if (alreadyEarned) {
      return;
    }

    // Award the badge
    const badge = await awardBadge(
      userId,
      seedId,
      seedTitle,
      roomId,
      completionId,
      completionDate
    );

    if (badge) {
      setBadgeAwarded(badge);
      // Show toast notification
      toast.success("🏅 Badge earned!", {
        description: `You've earned the ${badge.badge_data.badge_name} badge!`,
      });
    }
  };

  const handleContinue = () => {
    onOpenChange(false);
    onContinue?.();
  };

  const handleGetCertificate = async () => {
    // Validate required data
    if (!seedId || !roomId || !userId || !userName || !completionId || !completionDate) {
      toast.error("Missing required data to generate certificate");
      return;
    }

    setLoadingCertificate(true);
    try {
      // Check eligibility
      const isEligible = await checkCertificateEligibility(userId, seedId, roomId);
      if (!isEligible) {
        toast.error("You are not eligible for a certificate");
        return;
      }

      // Check if certificate already issued
      let existingCert = await getIssuedCertificate(userId, seedId, roomId);

      if (!existingCert) {
        // Get certificate config
        const config = await getCertificateConfig(seedId);
        if (!config || !config.enabled) {
          toast.error("Certificates are not enabled for this seed");
          return;
        }

        // Build certificate data
        const certData = buildCertificateData(config, userName, seedTitle, completionDate);

        // Create certificate record
        existingCert = await createIssuedCertificate(
          userId,
          seedId,
          roomId,
          completionId,
          certData
        );

        setCertificateData(certData);
        setCertificateId(existingCert.id);
        setCertificateConfig(config);
      } else {
        setCertificateData(existingCert.certificate_data);
        setCertificateId(existingCert.id);

        // Fetch config even if certificate exists, to ensure latest template/style is used (custom templates)
        // If it's a template-based cert, config might be optional, but for custom uploads we need it.
        const config = await getCertificateConfig(seedId);
        if (config) setCertificateConfig(config);
      }

      setShowCertificatePreview(true);
    } catch (error: any) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate");
    } finally {
      setLoadingCertificate(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-neutral-900 via-neutral-900 to-yellow-900/20"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
                <Trophy className="w-24 h-24 text-yellow-500 relative" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <DialogTitle className="text-4xl font-bold text-center bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                Congratulations!
              </DialogTitle>
              <DialogDescription className="text-center text-xl text-neutral-300 mt-2">
                You've completed the seed!
              </DialogDescription>
            </motion.div>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6 py-6"
          >
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                <h3 className="text-lg font-semibold text-white">Seed Completed</h3>
              </div>
              <p className="text-neutral-300 text-lg">
                <span className="font-semibold text-white">{seedTitle}</span>
              </p>
            </div>

            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-white">Achievement Unlocked!</h4>
                  <p className="text-neutral-300">
                    You've successfully navigated through all the challenges and reached the end.
                    Your progress has been saved and you can continue exploring the map if you'd like.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={handleContinue}
                size="lg"
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold text-lg py-6"
              >
                Continue Exploring
              </Button>

              {certificateEnabled && (
                <Button
                  onClick={handleGetCertificate}
                  disabled={loadingCertificate}
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-semibold text-lg py-6 gap-2"
                >
                  {loadingCertificate ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Award className="w-5 h-5" />
                      Get Your Certificate
                    </>
                  )}
                </Button>
              )}

              <p className="text-sm text-neutral-400 text-center">
                You can close this popup and keep working on the map
              </p>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {certificateData && (
        <CertificatePreviewModal
          open={showCertificatePreview}
          onOpenChange={setShowCertificatePreview}
          certificateData={certificateData}
          certificateId={certificateId}
          config={certificateConfig || undefined}
        />
      )}
    </>
  );
}
