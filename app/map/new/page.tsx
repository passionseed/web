"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { createMap } from "@/lib/supabase/maps";
import { Loader2 } from "lucide-react";

export default function NewMapPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const newMap = await createMap({ title, description });
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
