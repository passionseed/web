"use client";

import { useState, useEffect } from "react";
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
import { createProject, getUserTags, createTag } from "@/lib/supabase/reflection";
import { Tag } from "@/types/reflection";
import { TagInput } from "@/components/reflection/tag-input";
import { Loader2 } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    description: "",
    link: "",
    image_url: "",
    tagIds: [],
  });

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getUserTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error("Error loading tags:", error);
        toast({
          title: "Error",
          description: "Failed to load your tags. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTags();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagToggle = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const handleCreateTag = async (name: string) => {
    try {
      const newTag = await createTag(name);
      setAvailableTags((prev) => [...prev, newTag]);
      handleTagToggle(newTag.id);
    } catch (error) {
      console.error("Error creating tag:", error);
      toast({
        title: "Error creating tag",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        toast({ title: "Project name is required", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      await createProject(formData);
      toast({
        title: "Project created!",
        description: "Your new project has been set up.",
      });
      router.push("/me/reflection"); // Redirect to reflections or a new project page
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create your project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Project</CardTitle>
          <CardDescription>
            Start a new project to track your progress and reflections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name">Project Name</label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Learn Next.js"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="goal">Project Goal</label>
              <Textarea
                id="goal"
                name="goal"
                value={formData.goal}
                onChange={handleInputChange}
                placeholder="What is the main goal of this project?"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description">Description (Optional)</label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="A brief description of your project."
              />
            </div>
            
            <div className="space-y-2">
                <label>Tags</label>
                <TagInput 
                    availableTags={availableTags}
                    selectedTagIds={formData.tagIds}
                    onTagToggle={handleTagToggle}
                    onCreateTag={handleCreateTag}
                />
            </div>

            <div className="space-y-2">
              <label htmlFor="link">Link (Optional)</label>
              <Input
                id="link"
                name="link"
                type="url"
                value={formData.link}
                onChange={handleInputChange}
                placeholder="https://github.com/your/repo"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="image_url">Image URL (Optional)</label>
              <Input
                id="image_url"
                name="image_url"
                type="url"
                value={formData.image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/image.png"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
