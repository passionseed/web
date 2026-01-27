"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Music, X } from "lucide-react";
import { toast } from "sonner";

import { createProject } from "@/actions/ps";
import { SongSelector } from "@/components/song-of-the-day/song-selector";
import { getVinylColorsFromCover, VinylColorScheme } from "@/utils/color-extraction";
import Image from "next/image";

export function CreateProjectModal({ projectType = 'project' }: { projectType?: 'project' | 'hackathon' }) {
    const [open, setOpen] = useState(false);
    const [songSelectorOpen, setSongSelectorOpen] = useState(false);
    const [selectedSong, setSelectedSong] = useState<any>(null);
    const [extractedColors, setExtractedColors] = useState<VinylColorScheme | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSongSelect = async (song: any) => {
        setSelectedSong(song);
        setSongSelectorOpen(false);

        if (song.albumCover) {
            try {
                const colors = await getVinylColorsFromCover(song.albumCover);
                setExtractedColors(colors);
            } catch (error) {
                console.error("Failed to extract colors", error);
            }
        }
    };

    const handleRemoveSong = () => {
        setSelectedSong(null);
        setExtractedColors(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData(e.currentTarget);

            // Append Project Type
            formData.append("type", projectType);

            // Append Spotify data if selected
            if (selectedSong) {
                // We need to parse ID from URL or use what's available. 
                // SongSelector gives us url, we might need to extract ID or adjust SongSelector to give ID.
                // The Song interface in SongSelector includes url: string.
                // Let's assume we can get what we need.
                // Ideally SongSelector interface should be exported or duplicated here match.

                // Mocking ID extraction or using url as ID substitute if strictly needed, 
                // but let's check what SongSelector returns.
                // It returns { title, artist, url, albumCover, previewUrl }

                formData.append("spotify_track_name", selectedSong.title);
                formData.append("spotify_artist_name", selectedSong.artist);
                formData.append("spotify_album_cover_url", selectedSong.albumCover || "");
                formData.append("preview_url", selectedSong.previewUrl || "");

                // Extract ID from Spotify URL if possible (usually https://open.spotify.com/track/ID)
                const urlParts = selectedSong.url.split('/');
                const trackId = urlParts[urlParts.length - 1]?.split('?')[0] || "unknown";
                formData.append("spotify_track_id", trackId);

                if (extractedColors) {
                    formData.append("theme_color", JSON.stringify(extractedColors));
                }
            }

            await createProject(formData);
            toast.success("Project created successfully!");
            setOpen(false);
            setSelectedSong(null);
            setExtractedColors(null);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New {projectType === 'hackathon' ? 'Department' : 'Project'}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Create New {projectType === 'hackathon' ? 'Department' : 'Project'}</DialogTitle>
                            <DialogDescription>
                                Define the vision for your new {projectType === 'hackathon' ? 'department' : 'project'}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    placeholder="My Awesome Project"
                                />
                            </div>

                            {/* Song Selection */}
                            <div className="grid gap-2">
                                <Label>Theme Song (Optional)</Label>
                                {!selectedSong ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start text-muted-foreground"
                                        onClick={() => setSongSelectorOpen(true)}
                                    >
                                        <Music className="mr-2 h-4 w-4" />
                                        Select a song from Spotify...
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30 relative group">
                                        {selectedSong.albumCover && (
                                            <div className="relative w-10 h-10 rounded overflow-hidden shadow-sm">
                                                <Image
                                                    src={selectedSong.albumCover}
                                                    alt="Cover"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{selectedSong.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{selectedSong.artist}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={handleRemoveSong}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="goal">Goal</Label>
                                <Input
                                    id="goal"
                                    name="goal"
                                    placeholder="What do you want to achieve?"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="why">Why</Label>
                                <Textarea
                                    id="why"
                                    name="why"
                                    placeholder="Why is this important to you?"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Project details and scope..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : `Create ${projectType === 'hackathon' ? 'Department' : 'Project'}`}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <SongSelector
                open={songSelectorOpen}
                onOpenChange={setSongSelectorOpen}
                onSongSelect={handleSongSelect}
            />
        </>
    );
}
