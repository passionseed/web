"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Map as MapIcon, Upload, ChevronDown, Award, Trophy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CategoryManagementModal } from "./CategoryManagementModal";
import { CertificateSettings } from "./certificates/CertificateSettings";
import { CertificatePreviewPanel } from "./certificates/CertificatePreviewPanel";
import { buildCertificateData } from "@/lib/supabase/certificates";
import type { SeedCertificateConfig, CertificateData } from "@/types/seeds";
import { BadgeSettings } from "./badges/BadgeSettings";
import type { BadgeData } from "@/types/badges";
import { NPCAvatarSettings } from "./npc-avatars/NPCAvatarSettings";

interface SeedSettingsModalProps {
    seed: any; // Type should be Seed but using any for flexibility with joins
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export function SeedSettingsModal({ seed, isOpen, onClose, onUpdate }: SeedSettingsModalProps) {
    const [title, setTitle] = useState(seed.title);
    const [slogan, setSlogan] = useState(seed.slogan || "");
    const [description, setDescription] = useState(seed.description || "");
    const [selectedCategory, setSelectedCategory] = useState<string>(seed.category_id || "");
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(seed.cover_image_url);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isCertificatePreviewOpen, setIsCertificatePreviewOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsCertificatePreviewOpen(false);
            setDeleteConfirm(false);
        }
    }, [isOpen]);
    const [certificatePreviewData, setCertificatePreviewData] = useState<CertificateData | null>(null);
    const [certificatePreviewConfig, setCertificatePreviewConfig] = useState<Partial<SeedCertificateConfig> | null>(null);
    const [badgePreviewData, setBadgePreviewData] = useState<BadgeData | null>(null);
    const [isBadgePreviewOpen, setIsBadgePreviewOpen] = useState(false);
    const [isCertificateOpen, setIsCertificateOpen] = useState(false);
    const [isBadgeOpen, setIsBadgeOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            // Reset fields to seed values when opening
            setTitle(seed.title);
            setSlogan(seed.slogan || "");
            setDescription(seed.description || "");
            setSelectedCategory(seed.category_id || "");
            setPreviewUrl(seed.cover_image_url);
            setSelectedImage(null);
        }
    }, [isOpen, seed]);

    const fetchCategories = async () => {
        const { data } = await supabase
            .from("seed_categories")
            .select("*")
            .order("name", { ascending: true });

        if (data) {
            setCategories(data);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleEditMap = () => {
        if (seed.map_id) {
            // Navigate to map editor with seed context
            // We can pass query param ?seedId=... if needed by editor,
            // but map_type='seed' on the map itself should be enough for the editor to know.
            router.push(`/map/${seed.map_id}/edit?seedId=${seed.id}`);
        } else {
            toast.error("This seed has no associated map.");
        }
    };

    const handleCertificatePreview = (config: Partial<SeedCertificateConfig>) => {
        // Store the config for passing to preview modal
        setCertificatePreviewConfig(config);

        // Build preview data with sample values
        const previewData = buildCertificateData(
            {
                ...config,
                template_style: config.template_style || 'classic',
                title_template: config.title_template || 'Certificate of Completion',
                subtitle_template: config.subtitle_template || 'This certifies that {student_name} has successfully completed {seed_title}',
                description_template: config.description_template || 'Awarded on {completion_date} for demonstrating excellence and dedication.',
                signature_enabled: config.signature_enabled || false,
                border_color: config.border_color || '#f59e0b',
                accent_color: config.accent_color || '#f97316',
            } as SeedCertificateConfig,
            "Student Name",
            title,
            new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        );
        setCertificatePreviewData(previewData);
        setIsCertificatePreviewOpen(true);
    };

    const handleBadgePreview = (badgeData: BadgeData) => {
        setBadgePreviewData(badgeData);
        setIsBadgePreviewOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Update seed details
            const { error: updateError } = await supabase
                .from("seeds")
                .update({
                    title,
                    slogan,
                    description,
                    category_id: selectedCategory === "uncategorized" ? null : selectedCategory || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", seed.id);

            if (updateError) throw updateError;

            // 2. Upload new cover image if selected
            if (selectedImage) {
                const formData = new FormData();
                formData.append("file", selectedImage);
                formData.append("seedId", seed.id);
                formData.append("maxWidth", "800");
                formData.append("maxHeight", "800");

                const uploadResponse = await fetch("/api/seeds/upload-cover-image", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    console.error("Failed to upload cover image");
                    toast.warning("Settings saved, but cover image upload failed.");
                }
            }

            toast.success("Seed settings updated!");
            if (onUpdate) onUpdate();
            onClose();
            router.refresh();
        } catch (error: any) {
            console.error("Error updating seed:", error);
            toast.error(error.message || "Failed to update seed settings");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase
                .from("seeds")
                .delete()
                .eq("id", seed.id);
            if (error) throw error;
            toast.success("Seed deleted.");
            onClose();
            router.push("/seeds");
        } catch (error: any) {
            console.error("Error deleting seed:", error);
            toast.error(error.message || "Failed to delete seed");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-neutral-900 text-white border-neutral-800 max-h-[95vh] p-0 overflow-hidden flex flex-col">
                <div className="relative flex-1 overflow-hidden flex flex-col">
                    {/* Settings Form - Always rendered */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-bold">Seed Settings</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* PathLab Builder Section - Only show for PathLab seeds */}
                            {seed.seed_type === 'pathlab' && (
                                <div className="p-4 rounded-lg bg-green-900/20 border border-green-700/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold text-green-300">PathLab Builder</Label>
                                        <Button
                                            type="button"
                                            onClick={() => router.push(`/seeds/${seed.id}/pathlab-builder`)}
                                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                        >
                                            Build PathLab
                                        </Button>
                                    </div>
                                    <p className="text-sm text-green-200/70">
                                        Create and manage activities, content, and assessments for your PathLab journey.
                                    </p>
                                </div>
                            )}

                            {/* Map Section - Only show for non-PathLab seeds */}
                            {seed.seed_type !== 'pathlab' && (
                                <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">Seed Map</Label>
                                        <Button
                                            type="button"
                                            onClick={handleEditMap}
                                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                        >
                                            <MapIcon className="w-4 h-4" />
                                            Edit Map
                                        </Button>
                                    </div>
                                    <p className="text-sm text-neutral-400">
                                        Customize the learning map for this seed. Changes will affect all future rooms created from this seed.
                                    </p>
                                </div>
                            )}

                            {/* Certificate Section */}
                            <CertificateSettings
                                seedId={seed.id}
                                onPreview={handleCertificatePreview}
                            />

                            {/* Badge Section */}
                            <BadgeSettings
                                seedId={seed.id}
                                seedTitle={title}
                                onPreview={handleBadgePreview}
                            />

                            {/* NPC Avatar Section */}
                            <NPCAvatarSettings seedId={seed.id} />

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="bg-neutral-800 border-neutral-700"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="slogan">Slogan</Label>
                                    <Input
                                        id="slogan"
                                        value={slogan}
                                        onChange={(e) => setSlogan(e.target.value)}
                                        placeholder="Catchy phrase for the hero section..."
                                        className="bg-neutral-800 border-neutral-700"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-neutral-800 border-neutral-700 min-h-[100px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <div className="flex gap-2">
                                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                            <SelectTrigger className="flex-1 bg-neutral-800 border-neutral-700">
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                                                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsCategoryModalOpen(true)}
                                            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
                                        >
                                            Manage
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Cover Image</Label>
                                    <div className="flex items-center gap-4">
                                        {previewUrl && (
                                            <div className="relative w-20 h-20 rounded-md overflow-hidden border border-neutral-700">
                                                <img
                                                    src={previewUrl}
                                                    alt="Cover preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="bg-neutral-800 border-neutral-700 cursor-pointer file:text-white file:bg-neutral-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 hover:file:bg-neutral-600"
                                            />
                                            <p className="text-xs text-neutral-400 mt-1">
                                                Recommended: 800x800px or larger
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-4 border-t border-red-900/40">
                                {!deleteConfirm ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setDeleteConfirm(true)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-950/40 gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Seed
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-3 rounded-lg bg-red-950/30 border border-red-800/50 px-4 py-3">
                                        <p className="text-sm text-red-300 flex-1">
                                            Delete <span className="font-semibold">{seed.title}</span>? This cannot be undone.
                                        </p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setDeleteConfirm(false)}
                                            className="text-neutral-400 hover:bg-neutral-800 h-8 px-3 text-sm"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-sm gap-2"
                                        >
                                            {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="hover:bg-neutral-800"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-white text-black hover:bg-neutral-200"
                                >
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Preview Overlay */}
                    {isCertificatePreviewOpen && certificatePreviewData && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="w-full max-w-6xl h-auto max-h-[90%] bg-neutral-900 rounded-xl border border-yellow-500/30 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                                <CertificatePreviewPanel
                                    onClose={() => setIsCertificatePreviewOpen(false)}
                                    certificateData={certificatePreviewData}
                                    config={certificatePreviewConfig || null}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>

            <CategoryManagementModal
                isOpen={isCategoryModalOpen}
                onClose={() => {
                    setIsCategoryModalOpen(false);
                    fetchCategories(); // Refresh categories after management
                }}
            />
        </Dialog>
    );
}
