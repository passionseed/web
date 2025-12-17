"use client";

import type { CertificateData } from "@/types/seeds";
import { Sparkles } from "lucide-react";

interface ElegantTemplateProps {
    data: CertificateData;
}

export function ElegantTemplate({ data }: ElegantTemplateProps) {
    return (
        <div
            className="relative w-[1200px] h-[850px] bg-white p-20 font-serif overflow-hidden"
            style={{
                fontFamily: "'Crimson Text', serif",
            }}
        >
            {/* Gradient Background */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    background: `radial-gradient(circle at top right, ${data.accent_color} 0%, transparent 70%)`,
                }}
            />

            {/* Refined Border */}
            <div className="absolute inset-12">
                <div
                    className="absolute inset-0 border-2"
                    style={{ borderColor: data.border_color }}
                />
                <div
                    className="absolute inset-2 border"
                    style={{ borderColor: `${data.border_color}40` }}
                />
            </div>

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center text-center px-16">
                {/* Logo */}
                {data.logo_url && (
                    <div className="w-24 h-24 mb-6">
                        <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                )}

                {/* Sparkle Icon */}
                <div className="mb-6">
                    <Sparkles
                        className="w-12 h-12"
                        style={{ color: data.accent_color }}
                    />
                </div>

                {/* Title with Script Font */}
                <h1
                    className="text-7xl font-normal mb-4 italic"
                    style={{
                        color: data.border_color,
                        fontFamily: "'Dancing Script', cursive",
                    }}
                >
                    {data.title}
                </h1>

                {/* Decorative Flourish */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: data.accent_color }} />
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.accent_color }} />
                        <div className="w-20 h-px" style={{ backgroundColor: data.accent_color }} />
                    </div>
                    <div className="w-4 h-4 rotate-45 border-2" style={{ borderColor: data.accent_color }} />
                    <div className="flex items-center gap-1">
                        <div className="w-20 h-px" style={{ backgroundColor: data.accent_color }} />
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.accent_color }} />
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: data.accent_color }} />
                    </div>
                </div>

                {/* Subtitle */}
                <p className="text-3xl text-neutral-700 max-w-3xl leading-relaxed mb-6">
                    {data.subtitle}
                </p>

                {/* Description */}
                <p className="text-xl text-neutral-600 max-w-2xl leading-relaxed italic">
                    {data.description}
                </p>

                {/* Signature Section */}
                {data.signature_enabled && data.signature_name && (
                    <div className="mt-16 flex flex-col items-center gap-4">
                        {data.signature_image_url && (
                            <img
                                src={data.signature_image_url}
                                alt="Signature"
                                className="h-14 object-contain"
                            />
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-24 h-px" style={{ backgroundColor: data.border_color }} />
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.accent_color }} />
                            <div className="w-24 h-px" style={{ backgroundColor: data.border_color }} />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-xl text-neutral-800">
                                {data.signature_name}
                            </p>
                            {data.signature_title && (
                                <p className="text-sm text-neutral-600 mt-1 italic">
                                    {data.signature_title}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Date with decorative elements */}
                <div className="mt-12 flex flex-col items-center gap-2">
                    <div className="w-32 h-px" style={{ backgroundColor: `${data.accent_color}40` }} />
                    <p className="text-sm text-neutral-500 italic">
                        {data.completion_date}
                    </p>
                </div>
            </div>
        </div>
    );
}
