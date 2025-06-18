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
};

export function JoinWorkshopForm({
  workshopId,
  onSuccess,
}: JoinWorkshopFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

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

      <div className="space-y-2">
        <Label htmlFor="goals">
          What do you hope to learn from this workshop?
        </Label>
        <Textarea
          id="goals"
          name="goals"
          required
          className="min-h-[100px]"
          placeholder="I want to learn..."
        />
      </div>

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
