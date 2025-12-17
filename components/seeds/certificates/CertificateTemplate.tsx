"use client";

import React from "react";
import type { CertificateData, SeedCertificateConfig } from "@/types/seeds";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { ModernTemplate } from "./templates/ModernTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { ElegantTemplate } from "./templates/ElegantTemplate";
import { BoldTemplate } from "./templates/BoldTemplate";
import { loadGoogleFont } from "@/lib/googleFonts";

interface CertificateTemplateProps {
    data: CertificateData;
    config?: Partial<SeedCertificateConfig>;
    className?: string;
}

export const CertificateTemplate = React.forwardRef<HTMLDivElement, CertificateTemplateProps>(
    ({ data, config, className }, ref) => {
        const [naturalSize, setNaturalSize] = React.useState<{ width: number; height: number } | null>(null);

        // Load the configured font when component mounts or font changes
        React.useEffect(() => {
            if (config?.name_font_family) {
                loadGoogleFont(config.name_font_family);
            }
        }, [config?.name_font_family]);

        // If we have an uploaded template, use that
        if (config?.certificate_template_url) {
            // Ensure positions are within valid bounds (0 to image dimensions)
            // Note: These are relative to the natural image size
            const posX = Math.max(0, config.name_position_x || 960);
            const posY = Math.max(0, config.name_position_y || 540);

            return (
                <div ref={ref} className={`relative ${className || ""}`}>
                    <img
                        src={config.certificate_template_url}
                        alt="Certificate Background"
                        className="block w-full h-auto select-none pointer-events-none"
                        onLoad={(e) => {
                            const img = e.currentTarget;
                            setNaturalSize({
                                width: img.naturalWidth,
                                height: img.naturalHeight,
                            });
                        }}
                    />

                    {/* Student Name Overlay - Only show when we know the natural size for accurate positioning */}
                    {naturalSize && (
                        <div
                            className="absolute font-bold"
                            style={{
                                // Convert the absolute coordinates (relative to natural size) to percentages
                                left: `${(posX / naturalSize.width) * 100}%`,
                                top: `${(posY / naturalSize.height) * 100}%`,
                                transform: "translate(-50%, 0)", // Always center on anchor point to match Settings view logic
                                fontSize: `${(config.name_font_size || 48)}px`,
                                fontFamily: config.name_font_family || 'serif',
                                color: config.name_text_color || '#000000',
                                textAlign: (config.name_text_align as any) || 'center',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none', // Allow clicks to pass through
                            }}
                        >
                            {data.student_name}
                        </div>
                    )}
                </div>
            );
        }

        // Fallback to template-based certificates
        const renderTemplate = () => {
            switch (data.template_style) {
                case "classic":
                    return <ClassicTemplate data={data} />;
                case "modern":
                    return <ModernTemplate data={data} />;
                case "minimal":
                    return <MinimalTemplate data={data} />;
                case "elegant":
                    return <ElegantTemplate data={data} />;
                case "bold":
                    return <BoldTemplate data={data} />;
                default:
                    return <ClassicTemplate data={data} />;
            }
        };

        return (
            <div ref={ref} className={className}>
                {renderTemplate()}
            </div>
        );
    }
);

CertificateTemplate.displayName = "CertificateTemplate";
