"use client";

import { DefaultBadge } from "./DefaultBadge";
import type { BadgeData } from "@/types/badges";

interface BadgeTemplateProps {
    badgeData: BadgeData;
    size?: "small" | "medium" | "large";
    showShine?: boolean;
    className?: string;
}

export function BadgeTemplate({
    badgeData,
    size = "medium",
    showShine = true,
    className = "",
}: BadgeTemplateProps) {
    // If custom badge image exists, use it
    if (badgeData.badge_image_url) {
        const sizeClasses = {
            small: "w-20 h-20",
            medium: "w-32 h-32",
            large: "w-48 h-48",
        };

        return (
            <div className={`relative ${sizeClasses[size]} ${className}`}>
                <img
                    src={badgeData.badge_image_url}
                    alt={badgeData.badge_name}
                    className="w-full h-full object-contain drop-shadow-2xl"
                    style={{
                        filter: showShine ? "drop-shadow(0 0 20px rgba(245, 158, 11, 0.3))" : undefined,
                    }}
                />
            </div>
        );
    }

    // Otherwise, render default badge
    return (
        <div className={className}>
            <DefaultBadge
                badgeName={badgeData.badge_name}
                seedTitle={badgeData.seed_title}
                primaryColor={badgeData.primary_color}
                secondaryColor={badgeData.secondary_color}
                size={size}
                showShine={showShine}
            />
        </div>
    );
}
