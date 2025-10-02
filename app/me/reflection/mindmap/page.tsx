"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MindmapReflection } from "@/components/reflection/MindmapReflection";

interface Bubble {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export default function MindmapReflectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (bubbles: Bubble[], centralIdea: string) => {
    setIsSaving(true);
    
    try {
      // Here you would save to your database
      // For now, we'll just simulate a save
      console.log("Saving mindmap reflection:", { centralIdea, bubbles });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Mindmap Reflection Saved!",
        description: "Your current activities have been mapped and saved.",
      });
      
      // Navigate back to reflection dashboard
      router.push("/me/reflection");
    } catch (error) {
      console.error("Error saving mindmap reflection:", error);
      toast({
        title: "Error",
        description: "Failed to save your mindmap reflection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Mindmap Reflection</h1>
          <p className="text-muted-foreground">
            Create a visual map of what you're currently working on
          </p>
        </div>
      </div>

      {/* Mindmap Component */}
      <MindmapReflection onSave={handleSave} />
      
      {/* Instructions */}
      <div className="mt-8 max-w-2xl">
        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-4">How to use Mindmap Reflection:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Start by entering your main focus or project in the text field above</li>
            <li>• Click the + button to add specific activities as bubbles</li>
            <li>• Press Enter while typing to quickly add a bubble</li>
            <li>• Drag bubbles around to organize them visually</li>
            <li>• Remove bubbles by clicking the X that appears when you hover</li>
            <li>• Save your mindmap to track what you're working on</li>
          </ul>
        </div>
      </div>
    </div>
  );
}