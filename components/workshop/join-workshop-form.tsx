"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinWorkshop } from "@/app/actions/workshop-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type JoinWorkshopFormProps = {
  workshopId: string;
  onSuccess?: () => void;
  questions?: {
    question_1?: string | null;
    question_2?: string | null;
    question_3?: string | null;
    question_4?: string | null;
    question_5?: string | null;
  };
};

export function JoinWorkshopForm({
  workshopId,
  onSuccess,
  questions = {},
}: JoinWorkshopFormProps) {
  // Filter out empty questions
  const activeQuestions = [
    { id: 'answer_1', question: questions.question_1 },
    { id: 'answer_2', question: questions.question_2 },
    { id: 'answer_3', question: questions.question_3 },
    { id: 'answer_4', question: questions.question_4 },
    { id: 'answer_5', question: questions.question_5 },
  ].filter(q => q.question);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    // Log form data for debugging
    console.log('Form data before processing:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    // Add answers to form data
    activeQuestions.forEach((q, index) => {
      const answer = formData.get(`answer_${index + 1}`);
      if (answer) {
        formData.set(`answer_${index + 1}`, String(answer));
      } else {
        console.warn(`Missing answer for question ${index + 1}`);
      }
    });
    
    console.log('Form data after processing:', Object.fromEntries(formData.entries()));

    try {
      const result = await joinWorkshop(workshopId, formData);

      if (result.success) {
        toast({
          title: "Success!",
          description: "You have successfully joined the workshop!",
          variant: "default",
        });

        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      } else {
        setError(result.error || "Failed to join workshop");
        toast({
          title: "Error",
          description: result.error || "Failed to join workshop",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error joining workshop:", err);
      setError("An unexpected error occurred");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {activeQuestions.length > 0 ? (
        activeQuestions.map((q, index) => (
          <div key={q.id} className="space-y-2">
            <Label htmlFor={q.id}>
              {q.question}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id={q.id}
              name={q.id}
              required
              className="min-h-[80px]"
              placeholder={`Your response to "${q.question}"`}
            />
          </div>
        ))
      ) : (
        <div className="space-y-2">
          <Label htmlFor="experience">
            What's your experience level with this topic?
          </Label>
          <select
            id="experience"
            name="experience"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">Select your experience level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="questions">
          Do you have any specific questions you'd like answered?
        </Label>
        <Textarea
          id="questions"
          name="questions"
          className="min-h-[80px]"
          placeholder="I'm curious about..."
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="discord_consent"
          name="discord_consent"
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          defaultChecked={true}
        />
        <label
          htmlFor="discord_consent"
          className="text-sm font-medium text-gray-300"
        >
          You agree to our <a href="/terms">Terms of Service</a> and{" "}
          <a href="/privacy">Privacy Policy</a>
        </label>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Joining..." : "Join Workshop"}
        </Button>
      </div>
    </form>
  );
}
