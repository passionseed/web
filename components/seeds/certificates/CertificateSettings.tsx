"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Move, Info, Award, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import Draggable from "react-draggable";
import { cn } from "@/lib/utils";
import { POPULAR_GOOGLE_FONTS, loadGoogleFont } from "@/lib/googleFonts";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { SeedCertificateConfig } from "@/types/seeds";
import { getCertificateConfig, upsertCertificateConfig } from "@/lib/supabase/certificates";

interface CertificateSettingsProps {
    seedId: string;
    onPreview?: (config: Partial<SeedCertificateConfig>) => void;
}

export function CertificateSettings({ seedId, onPreview }: CertificateSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [openFontCombobox, setOpenFontCombobox] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredFonts = POPULAR_GOOGLE_FONTS.filter((font) =>
        font.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 50);

    const [config, setConfig] = useState<Partial<SeedCertificateConfig>>({
        enabled: false,
        certificate_template_url: "",
        name_position_x: 400,
        name_position_y: 300,
        name_font_size: 48,
        name_font_family: "serif",
        name_text_color: "#000000",
        name_text_align: "center",
    });

    useEffect(() => {
        loadConfig();
    }, [seedId]);

    const loadConfig = async () => {
        const existingConfig = await getCertificateConfig(seedId);
        if (existingConfig) {
            // Validate and fix invalid positions
            let posX = existingConfig.name_position_x || 400;
            let posY = existingConfig.name_position_y || 300;

            // If positions are negative or out of bounds, reset to center
            if (posX < 0 || posX > 1920 || posY < 0 || posY > 1080) {
                console.warn("⚠️ Invalid certificate position detected, resetting to center:", { posX, posY });
                posX = 960; // Center X for 1920px width
                posY = 540; // Center Y for 1080px height
                toast.info("Certificate text position was invalid and has been reset to center. Please reposition and save.");
            }

            setConfig({
                enabled: existingConfig.enabled,
                certificate_template_url: existingConfig.certificate_template_url,
                name_position_x: posX,
                name_position_y: posY,
                name_font_size: existingConfig.name_font_size || 48,
                name_font_family: existingConfig.name_font_family || "Great Vibes",
                name_text_color: existingConfig.name_text_color || "#000000",
                name_text_align: existingConfig.name_text_align || "center",
            });

            // Preload the configured font
            if (existingConfig.name_font_family) {
                loadGoogleFont(existingConfig.name_font_family);
            }

            setHasUnsavedChanges(false);
        }
    };

    useEffect(() => {
        if (imageRef.current?.complete) {
            console.log("Image already loaded (cached)");
            setImageLoaded(true);
        }
    }, [config.certificate_template_url]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('seedId', seedId);

            const response = await fetch('/api/upload/certificate-template', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            console.log('Upload response:', { status: response.status, result });

            if (!response.ok) {
                console.error('Upload failed:', result);
                throw new Error(result.error || 'Upload failed');
            }

            updateConfig({ certificate_template_url: result.fileUrl });
            toast.success('Certificate template uploaded!');
        } catch (error) {
            console.error('Template upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload template');
        } finally {
            setUploading(false);
        }
    };

    // Helper to update config and mark as changed
    const updateConfig = (updates: Partial<SeedCertificateConfig>) => {
        setConfig({ ...config, ...updates });
        setHasUnsavedChanges(true);
    };

    const handleDragStop = (_e: any, data: any) => {
        if (!imageRef.current || !data.node) return;

        const imageRect = imageRef.current.getBoundingClientRect();

        // Calculate position relative to the image
        // We use data.x/y directly because the draggable element functions as the anchor point
        // X = Anchor (Center) - Padding
        // Y = Anchor (Top) - Padding
        const PARENT_PADDING = 16;
        const relativeX = data.x - PARENT_PADDING;
        const relativeY = data.y - PARENT_PADDING;

        // Scale coordinates to actual image size
        const scaleX = imageRef.current.naturalWidth / imageRect.width;
        const scaleY = imageRef.current.naturalHeight / imageRect.height;

        const actualX = Math.round(relativeX * scaleX);
        const actualY = Math.round(relativeY * scaleY);

        console.log("💾 Saving position:", {
            dataX: data.x,
            dataY: data.y,
            relativeX,
            relativeY,
            actualX,
            actualY
        });

        updateConfig({
            name_position_x: actualX,
            name_position_y: actualY,
        });

        toast.success(`Name position updated: (${actualX}, ${actualY})`);
    };

    const handleDrag = (_e: any, data: any) => {
        // Update local position state during drag
        setDragPosition({ x: data.x, y: data.y });
    };


    const handleSave = async () => {
        if (!config.certificate_template_url) {
            toast.error("Please upload a certificate template first");
            return;
        }

        setLoading(true);
        try {
            await upsertCertificateConfig(seedId, config as SeedCertificateConfig);
            setHasUnsavedChanges(false);
            toast.success("Certificate settings saved!");
        } catch (error: any) {
            console.error("Error saving certificate config:", error);
            toast.error("Failed to save certificate settings");
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = () => {
        if (onPreview) {
            onPreview(config);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
                <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-yellow-500" />
                    <div>
                        <h3 className="text-base font-semibold text-white">Certificate Configuration</h3>
                        <p className="text-sm text-neutral-400">
                            Upload a certificate template and set name position
                        </p>
                    </div>
                </div>
                <Switch
                    checked={config.enabled || false}
                    onCheckedChange={(checked) => updateConfig({ enabled: checked })}
                />
            </div>

            {/* Settings (only show when enabled) */}
            {config.enabled && (
                <div className="space-y-6">
                    {/* Upload Template */}
                    <div className="space-y-2">
                        <Label htmlFor="template-upload">Certificate Template Image</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="template-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                                className="bg-neutral-800 border-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-600 file:text-white hover:file:bg-yellow-700"
                            />
                            {uploading && <span className="text-sm text-neutral-400">Uploading...</span>}
                        </div>
                        <p className="text-xs text-neutral-500">
                            Upload a certificate template image (PNG, JPG recommended, 1920x1080 or higher)
                        </p>
                    </div>

                    {/* Template Preview with Draggable Text Box */}
                    {config.certificate_template_url && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Position Student Name</Label>
                                <div className="flex items-center gap-2 text-xs text-neutral-400">
                                    <Move className="w-4 h-4" />
                                    Position: ({config.name_position_x}, {config.name_position_y})
                                </div>
                            </div>
                            <div className="relative border-2 border-dashed border-yellow-500/50 rounded-lg p-4 bg-neutral-800/30">
                                <img
                                    ref={imageRef}
                                    src={config.certificate_template_url}
                                    alt="Certificate Template"
                                    className="w-full h-auto rounded pointer-events-none select-none"
                                    onLoad={() => setImageLoaded(true)}
                                />

                                {/* Draggable Text Box - Always show when certificate exists */}
                                {config.certificate_template_url && imageLoaded && (() => {
                                    // Calculate position accounting for parent padding (p-4 = 16px)
                                    const PARENT_PADDING = 16;
                                    const baseX = ((config.name_position_x || 960) / (imageRef.current?.naturalWidth || 1)) * (imageRef.current?.width || 1);
                                    const baseY = ((config.name_position_y || 540) / (imageRef.current?.naturalHeight || 1)) * (imageRef.current?.height || 1);

                                    return (
                                        <DraggableWithRef
                                            position={dragPosition || {
                                                x: baseX + PARENT_PADDING,
                                                y: baseY + PARENT_PADDING,
                                            }}
                                            onDrag={handleDrag}
                                            onStop={handleDragStop}
                                            bounds="parent"
                                            config={config}
                                            imageRef={imageRef}
                                        />
                                    );
                                })()}
                            </div>
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-900/20 border border-blue-700/50">
                                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-blue-300">
                                    After uploading, drag the yellow box to position where the student's name will appear on the certificate.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Font Settings */}
                    {config.certificate_template_url && (
                        <div className="grid grid-cols-2 gap-4">
                            {/* Font Size */}
                            <div className="space-y-2">
                                <Label htmlFor="font-size">Font Size (px)</Label>
                                <Input
                                    id="font-size"
                                    type="number"
                                    min="12"
                                    max="200"
                                    value={config.name_font_size}
                                    onChange={(e) => updateConfig({ name_font_size: parseInt(e.target.value) || 48 })}
                                    className="bg-neutral-800 border-neutral-700"
                                />
                            </div>

                            {/* Font Family (Searchable Google Fonts) */}
                            <div className="space-y-2">
                                <Label htmlFor="font-family">Font Family (Google Fonts)</Label>
                                <Popover open={openFontCombobox} onOpenChange={setOpenFontCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openFontCombobox}
                                            className="w-full justify-between bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 hover:text-white"
                                        >
                                            {config.name_font_family
                                                ? config.name_font_family
                                                : "Select font..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 bg-neutral-900 border-neutral-700 max-h-[400px]">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Search Google Fonts..."
                                                value={searchTerm}
                                                onValueChange={setSearchTerm}
                                            />
                                            <CommandList>
                                                <CommandEmpty>No font found.</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredFonts.map((font) => (
                                                        <CommandItem
                                                            key={font}
                                                            value={font}
                                                            onSelect={(currentValue) => {
                                                                // cmdk returns lowercase value usually, so we must be careful or just use the font name directly
                                                                updateConfig({ name_font_family: font });
                                                                loadGoogleFont(font);
                                                                setOpenFontCombobox(false);
                                                            }}
                                                            className="text-neutral-200 cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    config.name_font_family === font ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {font}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <p className="text-[10px] text-neutral-500">
                                    Browse popular fonts like Great Vibes, Roboto, Montserrat, etc.
                                </p>
                            </div>

                            {/* Text Color */}
                            <div className="space-y-2">
                                <Label htmlFor="text-color">Text Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="text-color"
                                        type="color"
                                        value={config.name_text_color}
                                        onChange={(e) => updateConfig({ name_text_color: e.target.value })}
                                        className="w-16 h-10 p-1 bg-neutral-800 border-neutral-700"
                                    />
                                    <Input
                                        type="text"
                                        value={config.name_text_color}
                                        onChange={(e) => updateConfig({ name_text_color: e.target.value })}
                                        className="flex-1 bg-neutral-800 border-neutral-700"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>

                            {/* Text Alignment */}
                            <div className="space-y-2">
                                <Label htmlFor="text-align">Text Alignment</Label>
                                <Select
                                    value={config.name_text_align}
                                    onValueChange={(value) => updateConfig({ name_text_align: value })}
                                >
                                    <SelectTrigger className="bg-neutral-800 border-neutral-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-neutral-700">
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={loading || !config.certificate_template_url || !hasUnsavedChanges}
                            className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Saving..." : hasUnsavedChanges ? "Save Certificate Settings" : "No Changes to Save"}
                        </Button>
                        {onPreview && config.certificate_template_url && (
                            <Button
                                type="button"
                                onClick={handlePreview}
                                variant="outline"
                                className="border-neutral-600"
                            >
                                Preview Certificate
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component to handle Draggable ref correctly
function DraggableWithRef({ position, onDrag, onStop, bounds, config, imageRef }: any) {
    const nodeRef = useRef(null);

    const img = imageRef.current;
    if (!img) return null;

    const naturalWidth = img.naturalWidth || 1;
    const naturalHeight = img.naturalHeight || 1;
    const width = img.width || 1;
    const height = img.height || 1;

    // Use controlled position
    const safeX = Number.isFinite(position.x) ? position.x : 0;
    const safeY = Number.isFinite(position.y) ? position.y : 0;

    console.log("📍 Text box rendering at:", {
        position: { x: safeX, y: safeY },
        storedNaturalCoords: { x: config.name_position_x, y: config.name_position_y },
        naturalWidth, width
    });

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: safeX, y: safeY }}
            onDrag={onDrag}
            onStop={onStop}
            bounds={bounds}
        >
            <div
                ref={nodeRef}
                className="absolute cursor-move"
                style={{
                    top: 0,
                    left: 0,
                    zIndex: 50,
                    // This outer div is the anchor point.
                    // It has 0 width/height technically but contains the visible element.
                }}
            >
                {/* Inner wrapper handles the visual centering relative to the anchor */}
                <div
                    className="bg-yellow-500/90 px-4 py-2 rounded border-2 border-yellow-600 shadow-lg hover:bg-yellow-400/90 transition-colors"
                    style={{
                        transform: 'translate(-50%, 0)',
                        display: 'inline-block', // Ensure it wraps content size
                        whiteSpace: 'nowrap'
                    }}
                >
                    <div className="flex items-center gap-2">
                        <Move className="w-4 h-4 text-white" />
                        <span
                            className="font-bold select-none whitespace-nowrap"
                            style={{
                                fontSize: `${((config.name_font_size || 48) / naturalWidth) * width}px`,
                                fontFamily: config.name_font_family || 'serif',
                                color: config.name_text_color || '#000000',
                            }}
                        >
                            Student Name
                        </span>
                    </div>
                </div>
            </div>
        </Draggable>
    );
}
