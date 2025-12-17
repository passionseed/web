"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Award, Info, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SeedBadgeConfig, BadgeData } from "@/types/badges";
import { getBadgeConfig, upsertBadgeConfig } from "@/lib/supabase/badges";
import { BadgeTemplate } from "./BadgeTemplate";

interface BadgeSettingsProps {
    seedId: string;
    seedTitle: string;
    onPreview?: (badgeData: BadgeData) => void;
}

export function BadgeSettings({ seedId, seedTitle, onPreview }: BadgeSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [config, setConfig] = useState<Partial<SeedBadgeConfig>>({
        badge_name: `${seedTitle} - Completed`,
        badge_description: "",
        badge_image_url: "",
        primary_color: "#f59e0b",
        secondary_color: "#f97316",
    });

    useEffect(() => {
        loadConfig();
    }, [seedId]);

    const loadConfig = async () => {
        const existingConfig = await getBadgeConfig(seedId);
        if (existingConfig) {
            setConfig(existingConfig);
            setEnabled(true);
        } else {
            setEnabled(false);
        }
        setHasUnsavedChanges(false);
    };

    const updateConfig = (updates: Partial<SeedBadgeConfig>) => {
        setConfig((prev) => ({ ...prev, ...updates }));
        setHasUnsavedChanges(true);
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('seedId', seedId);

            const response = await fetch('/api/upload/badge', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Upload failed');

            updateConfig({ badge_image_url: result.fileUrl });
            toast.success('Badge image uploaded!');
        } catch (error: any) {
            console.error('Badge upload error:', error);
            toast.error(error.message || 'Failed to upload image');
        } finally {
            setUploading(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handleSave = async () => {
        if (!enabled) {
            toast.info("Badge awards disabled for this seed");
            return;
        }

        if (!config.badge_name || config.badge_name.trim() === "") {
            toast.error("Badge name is required");
            return;
        }

        setLoading(true);
        try {
            await upsertBadgeConfig(seedId, config);
            setHasUnsavedChanges(false);
            toast.success("Badge settings saved!");
        } catch (error: any) {
            console.error("Error saving badge config:", error);
            toast.error("Failed to save badge settings");
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
                <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-yellow-500" />
                    <div>
                        <h3 className="text-base font-semibold text-white">Badge Configuration</h3>
                        <p className="text-sm text-neutral-400">
                            Award badges to students who complete this seed
                        </p>
                    </div>
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => setEnabled(checked)}
                />
            </div>

            {/* Settings (only show when enabled) */}
            {enabled && (
                <div className="space-y-6">
                    {/* Badge Preview */}
                    <div className="flex justify-center p-6 rounded-lg bg-neutral-900/50 border border-neutral-700">
                        <BadgeTemplate
                            badgeData={{
                                badge_name: config.badge_name || `${seedTitle} - Completed`,
                                badge_description: config.badge_description || null,
                                badge_image_url: config.badge_image_url || null,
                                primary_color: config.primary_color || "#f59e0b",
                                secondary_color: config.secondary_color || "#f97316",
                                seed_title: seedTitle,
                                seed_id: seedId,
                                completion_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                                room_id: null,
                            }}
                            size="medium"
                        />
                    </div>

                    {/* Badge Name */}
                    <div className="space-y-2">
                        <Label htmlFor="badge-name">Badge Name *</Label>
                        <Input
                            id="badge-name"
                            value={config.badge_name || ""}
                            onChange={(e) => updateConfig({ badge_name: e.target.value })}
                            className="bg-neutral-800 border-neutral-700"
                            placeholder="JavaScript Master"
                        />
                        <p className="text-xs text-neutral-400">
                            The name displayed on the badge (keep it short!)
                        </p>
                    </div>

                    {/* Badge Description */}
                    <div className="space-y-2">
                        <Label htmlFor="badge-description">Badge Description</Label>
                        <Textarea
                            id="badge-description"
                            value={config.badge_description || ""}
                            onChange={(e) => updateConfig({ badge_description: e.target.value })}
                            className="bg-neutral-800 border-neutral-700 min-h-[60px]"
                            placeholder="Awarded for completing the JavaScript fundamentals course"
                        />
                        <p className="text-xs text-neutral-400">
                            What this badge represents (shown in badge details)
                        </p>
                    </div>

                    {/* Custom Badge Image */}
                    <div className="space-y-2">
                        <Label htmlFor="badge-image">Custom Badge Image (Optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="badge-image"
                                value={config.badge_image_url || ""}
                                onChange={(e) => updateConfig({ badge_image_url: e.target.value })}
                                className="flex-1 bg-neutral-800 border-neutral-700"
                                placeholder="https://..."
                            />
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploading}
                                    className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
                                >
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Upload
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-400">
                            Upload a custom badge image (recommended: 400x400px PNG with transparency). Leave blank to use default badge.
                        </p>
                    </div>

                    {/* Badge Colors (for default badge) */}
                    <div className="space-y-3">
                        <Label>Badge Colors (for default badge)</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="primary-color" className="text-sm">Primary Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="primary-color"
                                        type="color"
                                        value={config.primary_color || "#f59e0b"}
                                        onChange={(e) => updateConfig({ primary_color: e.target.value })}
                                        className="w-16 h-10 p-1 bg-neutral-800 border-neutral-700 cursor-pointer"
                                    />
                                    <Input
                                        value={config.primary_color || "#f59e0b"}
                                        onChange={(e) => updateConfig({ primary_color: e.target.value })}
                                        className="flex-1 bg-neutral-800 border-neutral-700 font-mono text-sm"
                                        placeholder="#f59e0b"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="secondary-color" className="text-sm">Secondary Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="secondary-color"
                                        type="color"
                                        value={config.secondary_color || "#f97316"}
                                        onChange={(e) => updateConfig({ secondary_color: e.target.value })}
                                        className="w-16 h-10 p-1 bg-neutral-800 border-neutral-700 cursor-pointer"
                                    />
                                    <Input
                                        value={config.secondary_color || "#f97316"}
                                        onChange={(e) => updateConfig({ secondary_color: e.target.value })}
                                        className="flex-1 bg-neutral-800 border-neutral-700 font-mono text-sm"
                                        placeholder="#f97316"
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-400">
                            These colors are only used if no custom badge image is provided
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="p-3 rounded-md bg-blue-900/20 border border-blue-700/50">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-300">
                                Badges are automatically awarded when students complete this seed. They appear in the student's profile and can be clicked to view details and generate certificates.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-neutral-800">
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={loading || !hasUnsavedChanges}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Saving..." : hasUnsavedChanges ? "Save Settings" : "No Changes to Save"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
