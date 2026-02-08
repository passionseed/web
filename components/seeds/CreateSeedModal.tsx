"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { LearningMap } from "@/types/map";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CategoryManagementModal } from "./CategoryManagementModal";

interface CreateSeedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateSeedModal({ isOpen, onClose }: CreateSeedModalProps) {
    const [title, setTitle] = useState("");
    const [slogan, setSlogan] = useState("");
    const [description, setDescription] = useState("");
    const [seedType, setSeedType] = useState<"collaborative" | "pathlab">("collaborative");
    const [pathTotalDays, setPathTotalDays] = useState(5);
    const [mapId, setMapId] = useState("");
    const [minStudents, setMinStudents] = useState(1);
    const [maxStudents, setMaxStudents] = useState(50);
    const [maps, setMaps] = useState<LearningMap[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMaps();
            fetchCategories();
        }
    }, [isOpen]);

    const fetchMaps = async () => {
        const { data, error } = await supabase
            .from("learning_maps")
            .select("*")
            .eq("visibility", "public");

        if (data) {
            setMaps(data);
        }
    };

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from("seed_categories")
            .select("*")
            .order("name", { ascending: true });

        if (data) {
            setCategories(data);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create the seed via API (handles map cloning/creation)
            const response = await fetch("/api/seeds/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    slogan,
                    description,
                    categoryId: selectedCategory || null,
                    sourceMapId: mapId === "blank" ? null : mapId || null, // If mapId is blank, it means blank map
                    seedType,
                    totalDays: seedType === "pathlab" ? pathTotalDays : null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create seed");
            }

            const seed = data.seed;

            // 2. Upload cover image if selected
            if (selectedImage && seed) {
                try {
                    const formData = new FormData();
                    formData.append("file", selectedImage);
                    formData.append("seedId", seed.id);
                    // Use smaller dimensions for seeds as requested
                    formData.append("maxWidth", "800");
                    formData.append("maxHeight", "800");

                    const uploadResponse = await fetch("/api/seeds/upload-cover-image", {
                        method: "POST",
                        body: formData,
                    });

                    if (!uploadResponse.ok) {
                        console.error("Failed to upload cover image");
                        toast.warning("Seed created, but cover image upload failed.");
                    }
                } catch (uploadError) {
                    console.error("Error uploading cover image:", uploadError);
                    toast.warning("Seed created, but cover image upload failed.");
                }
            }

            toast.success("Seed created successfully!");
            onClose();
            router.refresh();
        } catch (error: any) {
            console.error("Error creating seed:", error);
            toast.error(error.message || "Failed to create seed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-neutral-900 text-white border-neutral-800 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Seed</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="seedType">Seed Type</Label>
                        <Select
                            value={seedType}
                            onValueChange={(value) => setSeedType(value as "collaborative" | "pathlab")}
                        >
                            <SelectTrigger className="w-full p-2 rounded-md bg-neutral-800 border border-neutral-700 text-white">
                                <SelectValue placeholder="Select seed type" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                                <SelectItem value="collaborative">Workshop (Collaborative)</SelectItem>
                                <SelectItem value="pathlab">PathLab (Solo)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {seedType === "pathlab" && (
                        <div className="space-y-2">
                            <Label htmlFor="pathTotalDays">Path Duration (Days)</Label>
                            <Input
                                id="pathTotalDays"
                                type="number"
                                min="1"
                                max="30"
                                value={pathTotalDays}
                                onChange={(e) => setPathTotalDays(Math.max(1, parseInt(e.target.value) || 5))}
                                className="bg-neutral-800 border-neutral-700"
                                required
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="map">Base Map</Label>
                        <div className="space-y-2">
                            <Select value={mapId} onValueChange={setMapId}>
                                <SelectTrigger className="w-full p-2 rounded-md bg-neutral-800 border border-neutral-700 text-white">
                                    <SelectValue placeholder="Select a base map (Optional)" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                                    <SelectItem value="blank">Start with Blank Map</SelectItem>
                                    {maps.map((map) => (
                                        <SelectItem key={map.id} value={map.id}>
                                            {map.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-neutral-400">
                                {mapId && mapId !== "blank" ? "Selected map will be cloned as a starting point." : "A new blank map will be created for this seed."}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <div className="flex gap-2">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="flex-1 p-2 rounded-md bg-neutral-800 border border-neutral-700 text-white">
                                    <SelectValue placeholder="Select category (optional)" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
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
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Seed Title"
                            className="bg-neutral-800 border-neutral-700"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slogan">Slogan (Optional)</Label>
                        <Input
                            id="slogan"
                            value={slogan}
                            onChange={(e) => setSlogan(e.target.value)}
                            placeholder="Catchy phrase for the hero section..."
                            className="bg-neutral-800 border-neutral-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Markdown Supported)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detailed description..."
                            className="bg-neutral-800 border-neutral-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="coverImage">Cover Image (Optional)</Label>
                        <div className="flex items-center gap-4">
                            <Input
                                id="coverImage"
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="bg-neutral-800 border-neutral-700 file:text-white file:bg-neutral-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:hover:bg-neutral-600 cursor-pointer"
                            />
                        </div>
                        {previewUrl && (
                            <div className="mt-2 relative w-full h-32 rounded-md overflow-hidden border border-neutral-700">
                                <img
                                    src={previewUrl}
                                    alt="Cover preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </div>

                    {seedType === "collaborative" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minStudents">Minimum Students</Label>
                                <Input
                                    id="minStudents"
                                    type="number"
                                    min="1"
                                    max={maxStudents}
                                    value={minStudents}
                                    onChange={(e) => setMinStudents(parseInt(e.target.value) || 1)}
                                    className="bg-neutral-800 border-neutral-700"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxStudents">Maximum Students</Label>
                                <Input
                                    id="maxStudents"
                                    type="number"
                                    min={minStudents}
                                    max="100"
                                    value={maxStudents}
                                    onChange={(e) => setMaxStudents(parseInt(e.target.value) || 50)}
                                    className="bg-neutral-800 border-neutral-700"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="ghost" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Seed
                        </Button>
                    </div>
                </form>
            </DialogContent>

            <CategoryManagementModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onCategoryCreated={fetchCategories}
            />
        </Dialog>
    );
}
