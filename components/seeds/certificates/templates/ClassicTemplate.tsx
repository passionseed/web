"use client";

import type { CertificateData } from "@/types/seeds";
import { Award } from "lucide-react";

interface ClassicTemplateProps {
    data: CertificateData;
}

export function ClassicTemplate({ data }: ClassicTemplateProps) {
    return (
        <div
            className="relative w-[1200px] h-[850px] bg-white p-16 font-serif"
            style={{
                fontFamily: "'Playfair Display', serif",
            }}
        >
            {/* Ornate Border */}
            <div
                className="absolute inset-8 border-8"
                style={{
                    borderColor: data.border_color,
                    borderStyle: "double",
                }}
            >
                {/* Corner Decorations */}
                <div
                    className="absolute -top-4 -left-4 w-8 h-8 rotate-45"
                    style={{ backgroundColor: data.accent_color }}
                />
                <div
                    className="absolute -top-4 -right-4 w-8 h-8 rotate-45"
                    style={{ backgroundColor: data.accent_color }}
                />
                <div
                    className="absolute -bottom-4 -left-4 w-8 h-8 rotate-45"
                    style={{ backgroundColor: data.accent_color }}
                />
                <div
                    className="absolute -bottom-4 -right-4 w-8 h-8 rotate-45"
                    style={{ backgroundColor: data.accent_color }}
                />
            </div>

            {/* Inner Border */}
            <div className="absolute inset-12 border-2 border-neutral-300" />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center text-center space-y-8">
                {/* Logo */}
                {data.logo_url && (
                    <div className="w-24 h-24">
                        <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                )}

                {/* Award Icon */}
                <div className="flex justify-center">
                    <Award className="w-20 h-20" style={{ color: data.accent_color }} />
                </div>

                {/* Title */}
                <h1
                    className="text-6xl font-bold tracking-wide"
                    style={{ color: data.border_color }}
                >
                    {data.title}
                </h1>

                {/* Decorative Line */}
                <div className="flex items-center gap-4">
                    <div className="w-32 h-0.5" style={{ backgroundColor: data.accent_color }} />
                    <div className="w-3 h-3 rotate-45" style={{ backgroundColor: data.accent_color }} />
                    <div className="w-32 h-0.5" style={{ backgroundColor: data.accent_color }} />
                </div>

                {/* Subtitle */}
                <p className="text-2xl text-neutral-700 max-w-3xl leading-relaxed">
                    {data.subtitle}
                </p>

                {/* Description */}
                <p className="text-lg text-neutral-600 max-w-2xl">
                    {data.description}
                </p>

                {/* Signature Section */}
                {data.signature_enabled && data.signature_name && (
                    <div className="mt-12 flex flex-col items-center gap-4">
                        {data.signature_image_url && (
                            <img
                                src={data.signature_image_url}
                                alt="Signature"
                                className="h-16 object-contain"
                            />
                        )}
                        <div className="w-64 h-0.5 bg-neutral-800" />
                        <div className="text-center">
                            <p className="font-semibold text-lg text-neutral-800">
                                {data.signature_name}
                            </p>
                            {data.signature_title && (
                                <p className="text-sm text-neutral-600 mt-1">
                                    {data.signature_title}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Date */}
                <div className="mt-8 text-sm text-neutral-500">
                    {data.completion_date}
                </div>
            </div>
        </div>
    );
}
