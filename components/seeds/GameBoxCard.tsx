"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Seed } from "@/types/seeds";
import { cn } from "@/lib/utils";
import { Play, BookOpen } from "lucide-react";
import { getBlurHashAverageColor } from "fast-blurhash";

interface GameBoxCardProps {
    seed: Seed;
    href?: string;
    onClick?: () => void;
    className?: string;
}

export function GameBoxCard({ seed, href, onClick, className }: GameBoxCardProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [headerColor, setHeaderColor] = useState<string>("rgb(220, 38, 38)"); // Default red

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted && seed.cover_image_url) {
            const extractColor = async () => {
                // Try blurhash first
                if (seed.cover_image_blurhash) {
                    try {
                        const rgb = getBlurHashAverageColor(seed.cover_image_blurhash);
                        if (rgb) {
                            const [r, g, b] = rgb;
                            setHeaderColor(`rgb(${r}, ${g}, ${b})`);
                            return;
                        }
                    } catch (error) {
                        console.error("Error extracting color from blurhash:", error);
                    }
                }

                // Fallback: Extract from image URL
                if (seed.cover_image_url) {
                    try {
                        const { extractColorsFromImage } = await import("@/utils/color-extraction");
                        const colors = await extractColorsFromImage(seed.cover_image_url);
                        if (colors && colors.length > 0) {
                            const dominant = colors[0];
                            setHeaderColor(`rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`);
                        }
                    } catch (error) {
                        console.error("Error extracting color from image:", error);
                    }
                }
            };

            if ("requestIdleCallback" in window) {
                requestIdleCallback(extractColor, { timeout: 1000 });
            } else {
                setTimeout(extractColor, 100);
            }
        }
    }, [isMounted, seed.cover_image_url, seed.cover_image_blurhash]);

    const Container = (href ? Link : 'div') as any;
    const props = href ? { href, className: cn("block", className) } : { onClick, className };

    return (
        <div className={cn("group perspective-1000", className)}>
            <Container {...props}>
                <div
                    className="relative w-full preserve-3d transition-transform duration-700 group-hover:rotate-y-20"
                    style={{
                        aspectRatio: "0.75", // 4:3 height:width ratio
                        maxWidth: "220px",
                    }}
                >
                    {/* === FRONT COVER (Rotates) === */}
                    <div className="absolute inset-0 w-full h-full backface-hidden z-20">
                        {/* Spine (Outer part) */}
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-neutral-800 border-l border-t border-b border-neutral-700 rounded-l-sm shadow-inner z-20">
                            {/* Spine ridges */}
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-neutral-700 opacity-50" />
                        </div>

                        {/* Cover Art */}
                        <div className="absolute inset-0 left-3 rounded-r-md border-t border-r border-b border-white/10 overflow-hidden flex flex-col">
                            {/* Header Bar (always visible) - color extracted from image */}
                            <div
                                className="h-6 flex items-center justify-between px-2 border-b border-white/10 relative z-20 gap-1.5"
                                style={{ backgroundColor: headerColor }}
                            >
                                <div className="flex items-center gap-1.5">
                                    {seed.category?.logo_url && (
                                        <img
                                            src={seed.category.logo_url}
                                            alt={seed.category.name}
                                            className="w-4 h-4 object-contain"
                                        />
                                    )}
                                    <span className="text-[8px] font-bold tracking-widest text-white drop-shadow-md uppercase">
                                        {seed.category?.name || "PSEED"}
                                    </span>
                                </div>
                            </div>

                            {seed.cover_image_url ? (
                                <div className="flex-1 relative overflow-hidden">
                                    <img
                                        src={seed.cover_image_url}
                                        alt={seed.title}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />

                                    {/* Bottom Info Section */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-10">
                                        <div className="space-y-2">
                                            {/* Title */}
                                            <h3 className="text-sm font-bold text-white line-clamp-1 drop-shadow-lg">
                                                {seed.title}
                                            </h3>

                                            {/* Description */}
                                            {seed.description && (
                                                <p className="text-[10px] text-neutral-300 line-clamp-2 leading-relaxed">
                                                    {seed.description}
                                                </p>
                                            )}

                                            {/* Action chips with dynamic color */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium text-white"
                                                    style={{ backgroundColor: headerColor }}
                                                >
                                                    <Play className="w-2.5 h-2.5" />
                                                    <span>Join</span>
                                                </div>
                                                <div
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium text-white border"
                                                    style={{
                                                        borderColor: headerColor,
                                                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                                                    }}
                                                >
                                                    <BookOpen className="w-2.5 h-2.5" />
                                                    <span>Details</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="flex-1 relative p-3 flex flex-col"
                                    style={{
                                        background: `linear-gradient(to bottom right, ${headerColor}, ${headerColor}dd)`
                                    }}
                                >
                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />

                                    {/* Bottom Info Section */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-10">
                                        <div className="space-y-2">
                                            {/* Title */}
                                            <h3 className="text-sm font-bold text-white line-clamp-1 drop-shadow-lg">
                                                {seed.title}
                                            </h3>

                                            {/* Description */}
                                            {seed.description && (
                                                <p className="text-[10px] text-neutral-300 line-clamp-2 leading-relaxed">
                                                    {seed.description}
                                                </p>
                                            )}

                                            {/* Action chips with dynamic color */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium text-white"
                                                    style={{ backgroundColor: headerColor }}
                                                >
                                                    <Play className="w-2.5 h-2.5" />
                                                    <span>Join</span>
                                                </div>
                                                <div
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium text-white border"
                                                    style={{
                                                        borderColor: headerColor,
                                                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                                                    }}
                                                >
                                                    <BookOpen className="w-2.5 h-2.5" />
                                                    <span>Details</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* === INSIDE RIGHT (Back of Box - Stationary) === */}
                    <div className="absolute inset-0 w-full h-full z-10 bg-neutral-900 rounded-r-md border border-neutral-800 shadow-2xl">
                        {/* Spine (Inner part) */}
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-neutral-800 border-r border-neutral-700 rounded-l-sm z-10" />

                        {/* Cartridge Holder Area */}
                        <div className="absolute inset-0 left-3 bg-neutral-900 rounded-r-md flex flex-col items-center justify-end pb-8 gap-2">
                            {/* Cartridge Slot Lines */}
                            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]" />

                            {/* Click to see detail text */}
                            <p className="text-[10px] text-neutral-400 italic z-10 font-medium">
                                Click to see detail
                            </p>

                            {/* The Game Chip (Cartridge) with dynamic color */}
                            <div className="relative w-8 h-10 bg-neutral-800 rounded-sm border border-neutral-700 shadow-xl flex flex-col items-center overflow-hidden group-hover:scale-110 transition-transform duration-300 z-10">
                                {/* Chip Sticker with dynamic color */}
                                <div
                                    className="w-full h-[70%] flex items-center justify-center p-0.5"
                                    style={{
                                        background: `linear-gradient(to bottom, ${headerColor}, ${headerColor}dd)`
                                    }}
                                >
                                    <span className="text-[5px] font-bold text-white text-center leading-tight line-clamp-2">
                                        {seed.title}
                                    </span>
                                </div>
                                {/* Chip Contacts Area */}
                                <div className="w-full h-[30%] bg-neutral-900 flex items-center justify-center gap-0.5">
                                    <div className="w-0.5 h-2 bg-yellow-600 rounded-full" />
                                    <div className="w-0.5 h-2 bg-yellow-600 rounded-full" />
                                    <div className="w-0.5 h-2 bg-yellow-600 rounded-full" />
                                    <div className="w-0.5 h-2 bg-yellow-600 rounded-full" />
                                </div>

                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 bg-blue-500/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                    <Play className="w-4 h-4 text-white fill-white drop-shadow-md" />
                                </div>
                            </div>

                            {/* Cartridge Slot Holder UI */}
                            <div className="absolute bottom-6 w-12 h-14 border-2 border-neutral-800 rounded pointer-events-none" />
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
