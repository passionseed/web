"use client";

import { motion } from "framer-motion";
import { BadgeTemplate } from "@/components/seeds/badges/BadgeTemplate";
import type { UserBadgeWithSeed } from "@/types/badges";

interface BadgeCardProps {
    badge: UserBadgeWithSeed;
    onClick?: () => void;
    delay?: number;
}

export function BadgeCard({ badge, onClick, delay = 0 }: BadgeCardProps) {
    const earnedDate = new Date(badge.earned_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, type: "spring", duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -2 }}
            onClick={onClick}
            className="relative group cursor-pointer"
        >
            {/* Card Container */}
            <div className="relative p-3 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 hover:border-yellow-500/50 transition-all duration-300 shadow-md hover:shadow-yellow-900/20">
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-orange-500/0 group-hover:from-yellow-500/5 group-hover:to-orange-500/5 rounded-xl transition-all duration-300" />

                {/* Badge Display */}
                <div className="relative flex flex-col items-center gap-2 mt-2">
                    <BadgeTemplate
                        badgeData={badge.badge_data}
                        size="small"
                        showShine={true}
                    />

                    {/* Badge Info */}
                    <div className="text-center w-full space-y-0.5">
                        <h3 className="text-xs font-semibold text-white line-clamp-1 break-words px-1" title={badge.badge_data.badge_name}>
                            {badge.badge_data.badge_name}
                        </h3>
                        <p className="text-[10px] text-neutral-400 line-clamp-1 break-words px-1" title={badge.badge_data.seed_title}>
                            {badge.badge_data.seed_title}
                        </p>
                        <p className="text-[10px] text-yellow-500 font-medium pt-1">
                            {earnedDate}
                        </p>
                    </div>
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-xl" />
                </div>
            </div>

            {/* New badge indicator (if earned in last 7 days and not seen) */}
            {isNewBadge(badge.earned_at) && !badge.is_seen && (
                <div className="absolute top-2 right-2 z-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: delay + 0.3, type: "spring" }}
                        className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-[10px] font-bold text-white shadow-sm border border-neutral-900"
                    >
                        NEW
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}

function isNewBadge(earnedAt: string): boolean {
    const earnedDate = new Date(earnedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - earnedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
}
