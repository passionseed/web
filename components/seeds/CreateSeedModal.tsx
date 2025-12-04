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

interface CreateSeedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateSeedModal({ isOpen, onClose }: CreateSeedModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [mapId, setMapId] = useState("");
    const [minStudents, setMinStudents] = useState(1);
    const [maxStudents, setMaxStudents] = useState(50);
    const [maps, setMaps] = useState<LearningMap[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
        }
    }, [isOpen]);

    const fetchMaps = async () => {
        const { data, error } = await supabase
            .from("learning_maps")
            .select("*")
            .eq("visibility", "public"); // Or whatever criteria

        if (data) {
            setMaps(data);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                toast.error("You must be logged in to create a seed");
                return;
            }

            // 1. Create the seed record
            const { data: seed, error: seedError } = await supabase
                .from("seeds")
                .insert({
                    title,
                    description,
                    map_id: mapId,
                    created_by: user.id,
                })
                .select()
                .single();

            if (seedError) throw seedError;

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
                        <Label htmlFor="map">Select Map</Label>
                        <Select value={mapId} onValueChange={setMapId}>
                            <SelectTrigger className="w-full p-2 rounded-md bg-neutral-800 border border-neutral-700 text-white">
                                <SelectValue placeholder="Select a learning map" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                                {maps.map((map) => (
                                    <SelectItem key={map.id} value={map.id}>
                                        {map.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description..."
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
        </Dialog>
    );
}
