"use client";

import type { CertificateData } from "@/types/seeds";

interface MinimalTemplateProps {
    data: CertificateData;
}

export function MinimalTemplate({ data }: MinimalTemplateProps) {
    return (
        <div className="relative w-[1200px] h-[850px] bg-white p-24 font-sans">
            {/* Thin Border */}
            <div
                className="absolute inset-16 border"
                style={{ borderColor: data.border_color }}
            />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center text-center space-y-12">
                {/* Logo */}
                {data.logo_url && (
                    <div className="w-20 h-20 mb-4">
                        <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain opacity-80" />
                    </div>
                )}

                {/* Title */}
                <h1
                    className="text-8xl font-light tracking-wider"
                    style={{ color: data.border_color }}
                >
                    {data.title}
                </h1>

                {/* Simple Divider */}
                <div
                    className="w-48 h-px"
                    style={{ backgroundColor: data.accent_color }}
                />

                {/* Subtitle */}
                <p className="text-2xl text-neutral-700 max-w-3xl font-light leading-relaxed">
                    {data.subtitle}
                </p>

                {/* Description */}
                <p className="text-lg text-neutral-500 max-w-2xl font-light">
                    {data.description}
                </p>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Bottom Section */}
                <div className="flex justify-between w-full max-w-4xl items-end mt-16">
                    {/* Signature */}
                    {data.signature_enabled && data.signature_name && (
                        <div className="text-left flex flex-col gap-3">
                            {data.signature_image_url && (
                                <img
                                    src={data.signature_image_url}
                                    alt="Signature"
                                    className="h-10 object-contain"
                                />
                            )}
                            <div className="w-48 h-px bg-neutral-300" />
                            <div>
                                <p className="text-sm font-medium text-neutral-800">
                                    {data.signature_name}
                                </p>
                                {data.signature_title && (
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        {data.signature_title}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div className="text-right">
                        <div className="w-48 h-px bg-neutral-300 mb-3 ml-auto" />
                        <p className="text-sm text-neutral-600">
                            {data.completion_date}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
