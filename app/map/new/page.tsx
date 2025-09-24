"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { createMap } from "@/lib/supabase/maps";
import { ImageUpload } from "@/components/map/ImageUpload";
import { Loader2 } from "lucide-react";

interface CoverImageData {
  url: string;
  blurhash?: string;
  fileName: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export default function NewMapPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageSelect = (file: File) => {
    setCoverImageFile(file);

    // Create preview URL
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setCoverImagePreview(previewUrl);
  };

  const handleImageRemove = () => {
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setCoverImageFile(null);
    setCoverImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Title is required",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      // Step 1: Create map without image first
      const mapData = {
        title: title.trim(),
        description: description.trim() || null,
      };

      const newMap = await createMap(mapData);

      console.log(newMap, "nm");

      // Step 2: Upload cover image if provided
      if (coverImageFile) {
        try {
          const formData = new FormData();
          formData.append("file", coverImageFile);
          formData.append("mapId", newMap.id);
          formData.append("maxWidth", "1200");
          formData.append("maxHeight", "800");
          formData.append("quality", "85");

          const uploadResponse = await fetch("/api/maps/upload-cover-image", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Image upload failed");
          }

          const uploadResult = await uploadResponse.json();
          console.log("Cover image uploaded successfully:", uploadResult);
        } catch (uploadError) {
          console.error("Cover image upload failed:", uploadError);
          // Don't fail map creation if image upload fails
          toast({
            title: "Map created, but image upload failed",
            description: "You can add a cover image later from the edit page.",
            variant: "default",
          });
        }
      }

      toast({
        title: "Map Created!",
        description: `The map "${newMap.title}" has been successfully created.`,
      });

      // Clean up preview URL
      if (coverImagePreview) {
        URL.revokeObjectURL(coverImagePreview);
      }

      router.push(`/map/${newMap.id}/edit`);
    } catch (error) {
      console.error("❌ Map creation failed:", error);

      // Extract specific error message from the enhanced error reporting
      let errorMessage = "Failed to create the map. Please try again.";
      let errorTitle = "Error";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide more user-friendly titles based on error content
        if (error.message.includes("Authentication failed")) {
          errorTitle = "Authentication Error";
          errorMessage = "Please log in again to create a map.";
        } else if (error.message.includes("Profile verification failed")) {
          errorTitle = "Profile Setup Required";
          errorMessage =
            "Please complete your profile setup before creating maps.";
        } else if (error.message.includes("Permission denied")) {
          errorTitle = "Permission Denied";
          errorMessage =
            "You don't have permission to create maps. Please contact support.";
        } else if (error.message.includes("already exists")) {
          errorTitle = "Duplicate Title";
          errorMessage =
            "A map with this title already exists. Please choose a different title.";
        } else if (error.message.includes("Foreign key constraint")) {
          errorTitle = "Profile Issue";
          errorMessage =
            "There's an issue with your profile. Please contact support.";
        } else if (
          error.message.includes("RLS") ||
          error.message.includes("policy")
        ) {
          errorTitle = "Access Denied";
          errorMessage =
            "Access denied due to security policies. Please contact support.";
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Learning Map</CardTitle>
          <CardDescription>
            Fill in the details below to start a new map for your students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title">Map Title</label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to 3D Modeling"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description">Description</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief summary of what this learning map will cover."
                className="min-h-[120px]"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cover-image">Cover Image (Optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                {coverImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="max-w-48 max-h-48 rounded-lg object-cover mx-auto"
                    />
                    <button
                      type="button"
                      onClick={handleImageRemove}
                      disabled={isSubmitting}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg disabled:opacity-50"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <div className="mt-2 text-sm text-gray-600">
                      {coverImageFile?.name} (
                      {((coverImageFile?.size || 0) / (1024 * 1024)).toFixed(2)}
                      MB)
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <label
                        htmlFor="cover-image"
                        className="cursor-pointer text-blue-600 hover:text-blue-500 font-medium"
                      >
                        Choose an image
                      </label>
                      <span className="text-gray-600"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WebP up to 10MB • Will be optimized
                      automatically
                    </p>
                  </div>
                )}
                <input
                  id="cover-image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Basic validation
                      if (!file.type.startsWith("image/")) {
                        toast({
                          title: "Invalid file type",
                          description: "Please select an image file",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (file.size > 10 * 1024 * 1024) {
                        toast({
                          title: "File too large",
                          description:
                            "Please select an image smaller than 10MB",
                          variant: "destructive",
                        });
                        return;
                      }

                      handleImageSelect(file);
                    }
                  }}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </div>
              {coverImageFile && (
                <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  ✨ Image will be automatically optimized (WebP format,
                  resized, blurhash generated) when you create the map.
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Map"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
