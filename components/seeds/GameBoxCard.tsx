"use client";

import Link from "next/link";
import { Seed } from "@/types/seeds";
import { cn } from "@/lib/utils";
import { Play, BookOpen } from "lucide-react";
import { OptimizedImage } from "@/components/map/OptimizedImage";

interface GameBoxCardProps {
    seed: Seed;
    href?: string;
    onClick?: () => void;
    className?: string;
}

export function GameBoxCard({ seed, href, onClick, className }: GameBoxCardProps) {
    // Generate a deterministic color based on seed ID for variety
    const getSeedColor = (id: string) => {
        const colors = [
            "from-blue-600 to-blue-900",
            "from-purple-600 to-purple-900",
            "from-red-600 to-red-900",
            "from-emerald-600 to-emerald-900",
            "from-amber-600 to-amber-900",
            "from-cyan-600 to-cyan-900",
        ];
        const index = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    const gradientClass = getSeedColor(seed.id);

    const Container = (href ? Link : 'div') as any;
    const props = href ? { href, className: cn("block", className) } : { onClick, className };

    return (
        <Container
            {...props}
            className={cn(
                "group relative w-full aspect-[0.75] perspective-[1000px] cursor-pointer max-w-[220px] mx-auto block",
                className
            )}
        >
            {/* The Box Container - Rotates on hover */}
            {/* Added z-20 to ensure it sits on top of the stationary back panel */}
            <div className="game-box-container relative w-full h-full z-20">

                {/* === FRONT COVER === */}
                <div className="absolute inset-0 w-full h-full backface-hidden z-20 rounded-r-md rounded-l-sm shadow-xl">
                    {/* Spine (visible when closed) */}
                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-neutral-900 border-r border-white/10 rounded-l-sm z-30 flex flex-col items-center justify-center overflow-hidden">
                        <div className="rotate-90 whitespace-nowrap text-[6px] text-neutral-400 font-mono tracking-widest uppercase">
                            PSEED • {seed.title.substring(0, 15)}
                        </div>
                    </div>

                    {/* Cover Art */}
                    <div className="absolute inset-0 left-3 rounded-r-md border-t border-r border-b border-white/10 overflow-hidden flex flex-col">
                        {seed.cover_image_url ? (
                            // Display uploaded cover image
                            <div className="relative w-full h-full bg-neutral-900">
                                <img
                                    src={seed.cover_image_url}
                                    alt={seed.title}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* Overlay with title */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 z-10">
                                    <h3 className="text-sm font-black text-white uppercase leading-none tracking-tight drop-shadow-lg">
                                        {seed.title}
                                    </h3>
                                    {seed.description && (
                                        <p className="text-[9px] text-white/80 line-clamp-2 font-medium drop-shadow-md leading-tight mt-1">
                                            {seed.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Fallback to gradient design
                            <div className={cn(
                                "w-full h-full bg-gradient-to-br flex flex-col",
                                gradientClass
                            )}>
                                {/* Header Bar (like Switch) */}
                                <div className="h-6 bg-red-600 flex items-center justify-between px-2 border-b border-white/10">
                                    <span className="text-[8px] font-bold tracking-widest text-white">PSEED</span>
                                </div>

                                {/* Main Cover Content */}
                                <div className="flex-1 p-3 flex flex-col relative">
                                    {/* Background Pattern */}
                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />

                                    <h3 className="text-base font-black text-white uppercase leading-none tracking-tighter drop-shadow-lg z-10 mt-2">
                                        {seed.title}
                                    </h3>

                                    <div className="mt-auto z-10">
                                        {seed.description && (
                                            <p className="text-[9px] text-white/80 line-clamp-3 font-medium drop-shadow-md leading-tight">
                                                {seed.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Rating / Logo area */}
                                <div className="h-7 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1 flex items-end justify-between">
                                    <div className="w-5 h-5 border border-white/40 bg-black/20 backdrop-blur-sm rounded-sm flex flex-col items-center justify-center">
                                        <span className="text-[6px] font-bold text-white leading-none">ALL</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* === INSIDE LEFT (Back of Front Cover) === */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-neutral-900 rounded-l-md border border-neutral-800 overflow-hidden">
                    {/* Interior Art / Manual Clips */}
                    <div className="absolute inset-1 border border-neutral-800 rounded flex flex-col items-center justify-center">
                        {/* Manual Holder Clips */}
                        <div className="absolute left-2 top-1/3 w-1 h-8 bg-neutral-800 rounded-r border border-neutral-700" />
                        <div className="absolute left-2 bottom-1/3 w-1 h-8 bg-neutral-800 rounded-r border border-neutral-700" />

                        {/* Faint Pattern */}
                        <div className="opacity-10 rotate-45">
                            <BookOpen className="w-12 h-12 text-neutral-500" />
                        </div>
                    </div>
                </div>

            </div>

            {/* === INSIDE RIGHT (Back of Box - Stationary) === */}
            {/* z-10 ensures it stays behind the front cover when closed */}
            <div className="absolute inset-0 w-full h-full z-10 bg-neutral-900 rounded-r-md border border-neutral-800 shadow-2xl -translate-z-[1px]">
                {/* Spine (Inner part) */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-neutral-800 border-r border-neutral-700 rounded-l-sm z-10" />

                {/* Cartridge Holder Area */}
                <div className="absolute inset-0 left-3 bg-neutral-900 rounded-r-md flex items-end justify-center pb-8">
                    {/* Cartridge Slot Lines */}
                    <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]" />

                    {/* The Game Chip (Cartridge) */}
                    <div className="relative w-8 h-10 bg-neutral-800 rounded-sm border border-neutral-700 shadow-xl flex flex-col items-center overflow-hidden group-hover:scale-110 transition-transform duration-300">
                        {/* Chip Sticker */}
                        <div className={cn("w-full h-[70%] bg-gradient-to-b flex items-center justify-center p-0.5", gradientClass)}>
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
        </Container>
    );
}
