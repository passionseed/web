"use client";

import type { CertificateData } from "@/types/seeds";
import { CheckCircle2 } from "lucide-react";

interface ModernTemplateProps {
    data: CertificateData;
}

export function ModernTemplate({ data }: ModernTemplateProps) {
    return (
        <div className="relative w-[1200px] h-[850px] bg-white font-sans overflow-hidden">
            {/* Geometric Background */}
            <div className="absolute inset-0">
                {/* Left Accent */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-32"
                    style={{
                        background: `linear-gradient(135deg, ${data.border_color} 0%, ${data.accent_color} 100%)`,
                    }}
                />

                {/* Top Right Geometric Shape */}
                <div
                    className="absolute right-0 top-0 w-96 h-96 opacity-10"
                    style={{
                        background: data.accent_color,
                        clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative h-full flex flex-col px-32 py-20">
                {/* Logo */}
                {data.logo_url && (
                    <div className="w-16 h-16 mb-8">
                        <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                )}

                <div className="flex-1 flex flex-col justify-center">
                    {/* Achievement Badge */}
                    <div className="flex items-center gap-4 mb-8">
                        <CheckCircle2
                            className="w-16 h-16"
                            style={{ color: data.accent_color }}
                        />
                        <div>
                            <p className="text-sm font-semibold text-neutral-600 uppercase tracking-widest">
                                Achievement Unlocked
                            </p>
                        </div>
                    </div>

                    {/* Title */}
                    <h1
                        className="text-7xl font-bold mb-6"
                        style={{
                            background: `linear-gradient(135deg, ${data.border_color} 0%, ${data.accent_color} 100%)`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        {data.title}
                    </h1>

                    {/* Accent Line */}
                    <div
                        className="w-24 h-2 mb-8"
                        style={{ backgroundColor: data.accent_color }}
                    />

                    {/* Subtitle */}
                    <p className="text-3xl text-neutral-800 mb-6 max-w-3xl leading-tight font-light">
                        {data.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-xl text-neutral-600 max-w-2xl mb-12">
                        {data.description}
                    </p>

                    {/* Bottom Section */}
                    <div className="flex justify-between items-end mt-auto">
                        {/* Signature */}
                        {data.signature_enabled && data.signature_name && (
                            <div className="flex flex-col gap-3">
                                {data.signature_image_url && (
                                    <img
                                        src={data.signature_image_url}
                                        alt="Signature"
                                        className="h-12 object-contain"
                                    />
                                )}
                                <div>
                                    <p className="font-semibold text-neutral-800 text-lg">
                                        {data.signature_name}
                                    </p>
                                    {data.signature_title && (
                                        <p className="text-sm text-neutral-600">
                                            {data.signature_title}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Date */}
                        <div className="text-right">
                            <p className="text-sm text-neutral-500 uppercase tracking-wider">
                                Awarded
                            </p>
                            <p className="text-lg font-semibold text-neutral-800">
                                {data.completion_date}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
