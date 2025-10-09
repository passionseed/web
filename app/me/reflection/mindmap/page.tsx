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
    // Check if there are topics and if any have updates
    const topicsWithUpdates = topics.filter(topic => topic.notes && topic.notes.trim() !== '');
    
    if (topics.length === 0) {
      toast({
        title: "No topics found",
        description: "Please add some topics before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    if (topicsWithUpdates.length === 0) {
      toast({
        title: "No updates found",
        description: "Please add updates to at least one topic before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    // Save topics with notes to session storage (for the reflection submission)
    sessionStorage.setItem('mindmap-topics', JSON.stringify(topics));
    
    // Update the persistent database storage to clear notes for next time
    sessionStorage.setItem('clear-topic-notes', 'true');
    
    router.push('/me/reflection/mindmap/feelings');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized Header */}
      <div className="container px-4 py-4">
        <div className="flex flex-col space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold">Mindmap Reflection</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-2">
              Create a visual map of what you're currently working on
            </p>
          </div>
        </div>
      </div>

      {/* Mindmap Component */}
      <div className="px-2 sm:px-4">
        <MindmapReflection onSave={handleSave} onTopicsChange={setTopics} isReflectionMode={true} />
      </div>
      
      {/* Continue Button */}
      {topics.length > 0 && (
        <div className="container px-4 py-6">
          {(() => {
            const topicsWithUpdates = topics.filter(topic => topic.notes && topic.notes.trim() !== '');
            const canContinue = topicsWithUpdates.length > 0;
            
            return (
              <Button 
                onClick={handleContinue}
                disabled={!canContinue}
                size="lg"
                className={`w-full sm:w-auto sm:mx-auto sm:block transition-all duration-200 ${
                  !canContinue 
                    ? 'opacity-50 cursor-not-allowed bg-gray-600 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-700' 
                    : 'hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Continue to Feelings</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            );
          })()}
        </div>
      )}
      
      {/* Instructions - Hidden on mobile, shown on larger screens */}
      <div className="hidden sm:block container px-4 pb-8">
        <div className="mt-8 max-w-2xl mx-auto">
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
    </div>
  );
}