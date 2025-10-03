"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MindmapReflection } from "@/components/reflection/MindmapReflection";

interface Topic {
  id: string;
  text: string;
  x: number;
  y: number;
  notes?: string;
}

export default function MindmapReflectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);

  const handleSave = async (username: string, savedTopics: Topic[]) => {
    setIsSaving(true);
    setTopics(savedTopics); // Update local state with saved topics
    
    try {
      // Here you would save to your database
      // For now, we'll just simulate a save
      console.log("Saving mindmap reflection:", { username, topics: savedTopics });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Mindmap Reflection Saved!",
        description: `${username}'s mindmap with ${savedTopics.length} topics has been saved.`,
      });
      
      // Stay on the same page after saving
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

  const handleContinue = () => {
    // Save topics to session storage to pass to feelings page
    if (topics.length > 0) {
      sessionStorage.setItem('mindmap-topics', JSON.stringify(topics));
      router.push('/me/reflection/mindmap/feelings');
    } else {
      toast({
        title: "No topics found",
        description: "Please add some topics before continuing.",
        variant: "destructive",
      });
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
      <MindmapReflection onSave={handleSave} onTopicsChange={setTopics} />
      
      {/* Continue Button */}
      {topics.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button 
            onClick={handleContinue}
            size="lg"
            className="px-8"
          >
            Continue to Feelings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-8 max-w-2xl">
        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-4">How to use Mindmap Reflection:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• The central "username" bubble represents you</li>
            <li>• Click the + button to add topics you're working on</li>
            <li>• Press Enter while typing to quickly add items</li>
            <li>• Drag topic bubbles around to organize them visually</li>
            <li>• Remove topics by clicking the X that appears when you hover</li>
            <li>• Topics automatically connect to the central username bubble</li>
            <li>• Save your mindmap to track what you're working on</li>
          </ul>
        </div>
      </div>
    </div>
  );
}