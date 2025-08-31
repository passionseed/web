"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { createMap } from "@/lib/supabase/maps";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";

export default function NewMapPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setCoverImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
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
      const mapData: any = { title, description };
      
      // If there's a cover image, add it to metadata
      if (coverImage && coverImagePreview) {
        mapData.metadata = {
          coverImage: coverImagePreview
        };
      }
      
      const newMap = await createMap(mapData);
      toast({
        title: "Map Created!",
        description: `The map "${newMap.title}" has been successfully created.`,
      });
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
          errorMessage = "Please complete your profile setup before creating maps.";
        } else if (error.message.includes("Permission denied")) {
          errorTitle = "Permission Denied";
          errorMessage = "You don't have permission to create maps. Please contact support.";
        } else if (error.message.includes("already exists")) {
          errorTitle = "Duplicate Title";
          errorMessage = "A map with this title already exists. Please choose a different title.";
        } else if (error.message.includes("Foreign key constraint")) {
          errorTitle = "Profile Issue";
          errorMessage = "There's an issue with your profile. Please contact support.";
        } else if (error.message.includes("RLS") || error.message.includes("policy")) {
          errorTitle = "Access Denied";
          errorMessage = "Access denied due to security policies. Please contact support.";
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {coverImagePreview ? (
                  <div className="relative">
                    <Image
                      src={coverImagePreview}
                      alt="Cover preview"
                      width={200}
                      height={200}
                      className="mx-auto rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={removeCoverImage}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-gray-400" />
                    <div className="text-sm text-gray-600">
                      <label htmlFor="cover-image" className="cursor-pointer text-blue-600 hover:text-blue-500">
                        Click to upload
                      </label>
                      {" or drag and drop"}
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <input
                  id="cover-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </div>
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
