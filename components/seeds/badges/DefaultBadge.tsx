"use client";

import { Trophy } from "lucide-react";

interface DefaultBadgeProps {
    badgeName: string;
    seedTitle: string;
    primaryColor?: string;
    secondaryColor?: string;
    size?: "small" | "medium" | "large";
    showShine?: boolean;
}

export function DefaultBadge({
    badgeName,
    seedTitle,
    primaryColor = "#f59e0b",
    secondaryColor = "#f97316",
    size = "medium",
    showShine = true,
}: DefaultBadgeProps) {
    const sizeClasses = {
        small: "w-20 h-20 text-xs",
        medium: "w-32 h-32 text-sm",
        large: "w-48 h-48 text-lg",
    };

    const iconSizes = {
        small: "w-6 h-6",
        medium: "w-10 h-10",
        large: "w-16 h-16",
    };

    return (
        <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
            {/* Hexagonal Badge */}
            <svg
                viewBox="0 0 100 115"
                className="absolute inset-0 w-full h-full drop-shadow-2xl"
                style={{
                    filter: showShine ? "drop-shadow(0 0 20px rgba(245, 158, 11, 0.3))" : undefined,
                }}
            >
                {/* Outer glow */}
                <defs>
                    <linearGradient id={`badge-gradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: primaryColor, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: secondaryColor, stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id={`badge-glow-${size}`}>
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Hexagon shape */}
                <polygon
                    points="50,5 90,30 90,75 50,100 10,75 10,30"
                    fill={`url(#badge-gradient-${size})`}
                    stroke={primaryColor}
                    strokeWidth="2"
                    filter={showShine ? `url(#badge-glow-${size})` : undefined}
                />

                {/* Inner hexagon border */}
                <polygon
                    points="50,12 83,32 83,72 50,92 17,72 17,32"
                    fill="none"
                    stroke={secondaryColor}
                    strokeWidth="1"
                    opacity="0.5"
                />

                {/* Shine effect */}
                {showShine && (
                    <>
                        <polygon
                            points="20,25 40,15 60,25 50,45"
                            fill="white"
                            opacity="0.2"
                        />
                        <line
                            x1="15"
                            y1="35"
                            x2="30"
                            y2="25"
                            stroke="white"
                            strokeWidth="1.5"
                            opacity="0.4"
                        />
                    </>
                )}
            </svg>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
                <Trophy className={`${iconSizes[size]} text-white ${size !== 'small' ? 'mb-1' : ''}`} />
                {size !== 'small' && (
                    <div className="text-white font-bold leading-tight max-w-full overflow-hidden">
                        <div className="truncate">{badgeName}</div>
                    </div>
                )}
            </div>

            {/* Animated shine sweep (optional) */}
            {showShine && (
                <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                    style={{
                        background: `linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)`,
                        backgroundSize: "200% 200%",
                        animation: "shine-sweep 3s infinite",
                    }}
                />
            )}

            <style jsx>{`
                @keyframes shine-sweep {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
            `}</style>
        </div>
    );
}
