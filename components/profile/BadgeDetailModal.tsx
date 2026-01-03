"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Award, Calendar, BookOpen, Download, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { UserBadgeWithSeed } from "@/types/badges";
import type { CertificateData, SeedCertificateConfig, PercentileData } from "@/types/seeds";
import { BadgeTemplate } from "@/components/seeds/badges/BadgeTemplate";
import { CertificatePreviewModal } from "@/components/seeds/certificates/CertificatePreviewModal";
import { getCertificateConfig, getIssuedCertificate, createIssuedCertificate, buildCertificateData } from "@/lib/supabase/certificates";
import { getUserSeedPercentile } from "@/lib/supabase/seed-leaderboard";

interface BadgeDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    badge: UserBadgeWithSeed | null;
    userId: string;
}

export function BadgeDetailModal({
    open,
    onOpenChange,
    badge,
    userId,
}: BadgeDetailModalProps) {
    const [showCertificatePreview, setShowCertificatePreview] = useState(false);
    const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
    const [certificateConfig, setCertificateConfig] = useState<Partial<SeedCertificateConfig> | null>(null);
    const [certificateId, setCertificateId] = useState<string | undefined>();
    const [loadingCertificate, setLoadingCertificate] = useState(false);
    const [percentileData, setPercentileData] = useState<PercentileData | null>(null);
    const [loadingPercentile, setLoadingPercentile] = useState(false);



    // Fetch percentile data when badge modal opens
    useEffect(() => {
        if (open && badge && badge.room_id) {
            loadPercentileData();
        }
    }, [open, badge?.room_id]);

    const loadPercentileData = async () => {
        if (!badge || !badge.room_id) return;

        setLoadingPercentile(true);
        try {
            const data = await getUserSeedPercentile(userId, badge.room_id);
            setPercentileData(data);
        } catch (error) {
            console.error("Error loading percentile data:", error);
        } finally {
            setLoadingPercentile(false);
        }
    };

    const handleViewCertificate = async () => {
        setLoadingCertificate(true);
        try {
            // Check if certificate exists
            let existingCert = await getIssuedCertificate(
                userId,
                badge.seed_id,
                badge.room_id || ""
            );

            if (!existingCert) {
                // Check if certificates are enabled for this seed
                const certConfig = await getCertificateConfig(badge.seed_id);
                if (!certConfig || !certConfig.enabled) {
                    toast.error("Certificates are not enabled for this seed");
                    return;
                }

                // Generate certificate
                const userName = "Student"; // Would need to get from profile
                const certData = buildCertificateData(
                    certConfig,
                    userName,
                    badge.badge_data.seed_title,
                    badge.badge_data.completion_date
                );

                existingCert = await createIssuedCertificate(
                    userId,
                    badge.seed_id,
                    badge.room_id || "",
                    badge.completion_id || "",
                    certData
                );

                setCertificateData(certData);
                setCertificateId(existingCert.id);
                setCertificateConfig(certConfig);
            } else {
                setCertificateData(existingCert.certificate_data);
                setCertificateId(existingCert.id);

                // Fetch and set config to ensure custom template is used
                const config = await getCertificateConfig(badge.seed_id);
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

    if (!badge) return null;

    const earnedDate = new Date(badge.earned_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const handleDownloadBadge = async () => {
        // This would download the badge image
        // For now, just show a toast
        toast.success("Badge download feature coming soon!");
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="max-w-2xl max-h-[90vh] border-2 border-yellow-500/50 bg-gradient-to-br from-neutral-900 via-neutral-900 to-yellow-900/20 p-0 overflow-hidden flex flex-col"
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    <div className="p-8 overflow-y-auto custom-scrollbar">
                        <DialogHeader className="mb-6">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center gap-2"
                            >
                                <div className="relative mb-2">
                                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
                                    <Award className="w-10 h-10 text-yellow-500 relative" />
                                </div>
                                <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                                    Badge Achievement
                                </DialogTitle>
                            </motion.div>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Badge Display */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="flex justify-center"
                            >
                                <BadgeTemplate
                                    badgeData={badge.badge_data}
                                    size="large"
                                    showShine={true}
                                />
                            </motion.div>

                            {/* Badge Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-center space-y-2"
                            >
                                <h2 className="text-2xl font-bold text-white">
                                    {badge.badge_data.badge_name}
                                </h2>
                                {badge.badge_data.badge_description && (
                                    <p className="text-neutral-400 max-w-lg mx-auto">
                                        {badge.badge_data.badge_description}
                                    </p>
                                )}
                            </motion.div>

                            {/* Achievement Details */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="grid grid-cols-2 gap-4"
                            >
                                <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm text-neutral-400">Earned On</span>
                                    </div>
                                    <p className="text-white font-semibold">{earnedDate}</p>
                                </div>

                                <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm text-neutral-400">Seed</span>
                                    </div>
                                    <p className="text-white font-semibold line-clamp-1">
                                        {badge.badge_data.seed_title}
                                    </p>
                                </div>
                            </motion.div>

                            {/* Performance Stats Section - Only show if points exist */}
                            {percentileData && percentileData.total_points > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                    className="pt-4 border-t border-neutral-700"
                                >
                                    <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                                        <Award className="w-4 h-4" />
                                        Performance Stats
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Total Points */}
                                        <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-neutral-400">Total Points</span>
                                                <span className="text-xl font-bold text-yellow-400">
                                                    {percentileData.total_points}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Percentile Ranking */}
                                        {percentileData.total_completers > 1 && (
                                            <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-neutral-400">Your Ranking</span>
                                                    <span className="text-sm font-bold text-white">
                                                        #{percentileData.rank} of {percentileData.total_completers}
                                                    </span>
                                                </div>
                                                {/* Percentile Bar */}
                                                <div className="w-full bg-neutral-700 rounded-full h-2 mb-1">
                                                    <div
                                                        className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentileData.percentile}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-yellow-400 font-medium">
                                                    Top {(100 - percentileData.percentile).toFixed(0)}%
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Action Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="grid grid-cols-2 gap-3 pt-4"
                            >
                                <Button
                                    onClick={handleViewCertificate}
                                    disabled={loadingCertificate}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold gap-2"
                                >
                                    {loadingCertificate ? (
                                        <>Loading...</>
                                    ) : (
                                        <>
                                            <FileText className="w-4 h-4" />
                                            View Certificate
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleDownloadBadge}
                                    variant="outline"
                                    className="border-2 border-yellow-500/50 hover:border-yellow-500 bg-neutral-800 hover:bg-neutral-700 text-yellow-500 font-semibold gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Badge
                                </Button>
                            </motion.div>

                            {/* Share hint */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-xs text-neutral-500 text-center"
                            >
                                Share your achievement with the world! #PassionSeed
                            </motion.p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Certificate Preview Modal */}
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
