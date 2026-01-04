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
import { PSProject, updateProject } from "@/actions/ps";
import { toast } from "sonner";
import { Edit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface EditProjectDialogProps {
  project: PSProject;
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      // Append project ID since it's not in the visible form fields
      formData.append("projectId", project.id);

      // Handle theme color specifically if it's not just a string input
      // For now we'll assume existing theme is kept unless we build a complex picker
      // If we want to allow editing theme, we'd need a color picker here.
      // Let's preserve existing theme if not changed, but 'updateProject' expects it.
      // Easiest way for now: just pass the existing json string if not manipulated.
      if (project.theme_color) {
        formData.append("theme_color", JSON.stringify(project.theme_color));
      }

      await updateProject(formData);
      toast.success("Project updated successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update project");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project Details</DialogTitle>
          <DialogDescription>
            Update your project information and Spotify integration.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          <div className="grid gap-4 py-4">
            {/* Core Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Core Information
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid items-center gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={project.name}
                    required
                  />
                </div>
                <div className="grid items-center gap-2">
                  <Label htmlFor="goal">Goal</Label>
                  <Textarea
                    id="goal"
                    name="goal"
                    defaultValue={project.goal || ""}
                    placeholder="What is the main goal?"
                    rows={2}
                  />
                </div>
                <div className="grid items-center gap-2">
                  <Label htmlFor="why">Why</Label>
                  <Textarea
                    id="why"
                    name="why"
                    defaultValue={project.why || ""}
                    placeholder="Why is this important?"
                    rows={2}
                  />
                </div>
                <div className="grid items-center gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={project.description || ""}
                    placeholder="Additional details..."
                  />
                </div>
              </div>
            </div>

            {/* Spotify Integration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Spotify Integration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid items-center gap-2">
                  <Label htmlFor="spotify_track_name">Track Name</Label>
                  <Input
                    id="spotify_track_name"
                    name="spotify_track_name"
                    defaultValue={project.spotify_track_name || ""}
                  />
                </div>
                <div className="grid items-center gap-2">
                  <Label htmlFor="spotify_artist_name">Artist Name</Label>
                  <Input
                    id="spotify_artist_name"
                    name="spotify_artist_name"
                    defaultValue={project.spotify_artist_name || ""}
                  />
                </div>
                <div className="grid items-center gap-2 col-span-2">
                  <Label htmlFor="spotify_track_id">Spotify Track ID</Label>
                  <Input
                    id="spotify_track_id"
                    name="spotify_track_id"
                    defaultValue={project.spotify_track_id || ""}
                    placeholder="e.g. 4PTG3Z6ehGkBFwjybzWkR8"
                  />
                </div>
                <div className="grid items-center gap-2 col-span-2">
                  <Label htmlFor="preview_url">Preview URL</Label>
                  <Input
                    id="preview_url"
                    name="preview_url"
                    defaultValue={project.preview_url || ""}
                    placeholder="https://p.scdn.co/mp3-preview/..."
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
