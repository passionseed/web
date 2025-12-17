"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Loader2 } from "lucide-react";
import { BadgeCard } from "./BadgeCard";
import { BadgeDetailModal } from "./BadgeDetailModal";
import { getUserBadges, getUserBadgeCount, markBadgeSeen } from "@/lib/supabase/badges";
import type { UserBadgeWithSeed } from "@/types/badges";

interface BadgeGalleryProps {
    userId: string;
    showTitle?: boolean;
    maxDisplay?: number; // Max badges to show initially
}

export function BadgeGallery({ userId, showTitle = true, maxDisplay }: BadgeGalleryProps) {
    const [badges, setBadges] = useState<UserBadgeWithSeed[]>([]);
    const [loading, setLoading] = useState(true);
    const [badgeCount, setBadgeCount] = useState(0);
    const [selectedBadge, setSelectedBadge] = useState<UserBadgeWithSeed | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        loadBadges();
    }, [userId]);

    const loadBadges = async () => {
        setLoading(true);
        try {
            const [userBadges, count] = await Promise.all([
                getUserBadges(userId),
                getUserBadgeCount(userId),
            ]);
            setBadges(userBadges);
            setBadgeCount(count);
        } catch (error) {
            console.error("Error loading badges:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBadgeClick = async (badge: UserBadgeWithSeed) => {
        setSelectedBadge(badge);
        setShowDetailModal(true);

        // Mark as seen if it's new
        if (!badge.is_seen) {
            // Optimistic update
            const updatedBadges = badges.map(b =>
                b.id === badge.id ? { ...b, is_seen: true } : b
            );
            setBadges(updatedBadges);

            // Server update
            await markBadgeSeen(badge.id);
        }
    };

    const displayedBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;
    const hasMoreBadges = maxDisplay && badges.length > maxDisplay;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (badges.length === 0) {
        return (
            <div className="text-center py-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-800 mb-4"
                >
                    <Award className="w-8 h-8 text-neutral-600" />
                </motion.div>
                <h3 className="text-lg font-semibold text-neutral-400 mb-2">No Badges Yet</h3>
                <p className="text-sm text-neutral-500">
                    Complete seeds to earn your first badge!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {showTitle && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Achievements</h2>
                            <p className="text-sm text-neutral-400">
                                {badgeCount} {badgeCount === 1 ? 'badge' : 'badges'} earned
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Badge Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {displayedBadges.map((badge, index) => (
                    <BadgeCard
                        key={badge.id}
                        badge={badge}
                        onClick={() => handleBadgeClick(badge)}
                        delay={index * 0.05}
                    />
                ))}
            </div>

            {/* Show More Link */}
            {hasMoreBadges && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                >
                    <button
                        onClick={() => {/* Navigate to full badges page */ }}
                        className="text-yellow-500 hover:text-yellow-400 font-semibold text-sm transition-colors"
                    >
                        View all {badgeCount} badges →
                    </button>
                </motion.div>
            )}

            {/* Badge Detail Modal */}
            <BadgeDetailModal
                open={showDetailModal}
                onOpenChange={setShowDetailModal}
                badge={selectedBadge}
                userId={userId}
            />
        </div>
    );
}
