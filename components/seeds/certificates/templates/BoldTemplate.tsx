"use client";

import type { CertificateData } from "@/types/seeds";
import { Zap } from "lucide-react";

interface BoldTemplateProps {
    data: CertificateData;
}

export function BoldTemplate({ data }: BoldTemplateProps) {
    return (
        <div className="relative w-[1200px] h-[850px] bg-neutral-900 p-16 font-sans overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0">
                {/* Gradient Overlay */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        background: `linear-gradient(135deg, ${data.border_color} 0%, ${data.accent_color} 50%, ${data.border_color} 100%)`,
                    }}
                />

                {/* Geometric Shapes */}
                <div
                    className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-10"
                    style={{ backgroundColor: data.accent_color }}
                />
                <div
                    className="absolute bottom-20 left-20 w-48 h-48 rotate-45 opacity-10"
                    style={{ backgroundColor: data.border_color }}
                />
            </div>

            {/* Bold Border */}
            <div
                className="absolute inset-8 border-4"
                style={{ borderColor: data.accent_color }}
            >
                <div
                    className="absolute inset-4 border-2"
                    style={{ borderColor: data.border_color }}
                />
            </div>

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center text-center px-20">
                {/* Logo */}
                {data.logo_url && (
                    <div className="w-28 h-28 mb-6">
                        <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain brightness-200" />
                    </div>
                )}

                {/* Dynamic Icon */}
                <div
                    className="mb-8 p-6 rounded-full"
                    style={{ backgroundColor: `${data.accent_color}20` }}
                >
                    <Zap className="w-16 h-16" style={{ color: data.accent_color }} />
                </div>

                {/* Title - Extra Bold */}
                <h1
                    className="text-8xl font-black uppercase tracking-tight mb-6"
                    style={{
                        color: "white",
                        textShadow: `0 0 40px ${data.accent_color}80`,
                    }}
                >
                    {data.title}
                </h1>

                {/* Bold Accent Line */}
                <div
                    className="w-96 h-3 mb-8"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${data.accent_color}, transparent)`,
                    }}
                />

                {/* Subtitle - High Contrast */}
                <p
                    className="text-4xl font-bold max-w-3xl leading-tight mb-6"
                    style={{
                        color: data.border_color,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    {data.subtitle}
                </p>

                {/* Description */}
                <p className="text-2xl text-neutral-300 max-w-2xl font-medium">
                    {data.description}
                </p>

                {/* Signature and Date Section */}
                <div className="mt-16 flex justify-between w-full max-w-4xl">
                    {/* Signature */}
                    {data.signature_enabled && data.signature_name && (
                        <div className="text-left">
                            {data.signature_image_url && (
                                <img
                                    src={data.signature_image_url}
                                    alt="Signature"
                                    className="h-16 object-contain mb-3 brightness-200"
                                />
                            )}
                            <div
                                className="w-64 h-1 mb-3"
                                style={{ backgroundColor: data.accent_color }}
                            />
                            <div>
                                <p className="text-xl font-bold text-white">
                                    {data.signature_name}
                                </p>
                                {data.signature_title && (
                                    <p
                                        className="text-sm font-semibold mt-1"
                                        style={{ color: data.accent_color }}
                                    >
                                        {data.signature_title}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div className="text-right">
                        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-2">
                            Completed
                        </p>
                        <p
                            className="text-2xl font-bold"
                            style={{ color: data.border_color }}
                        >
                            {data.completion_date}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
