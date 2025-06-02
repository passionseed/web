"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  Trash2,
  Heart,
  Star,
  BookOpen,
  Briefcase,
  Lightbulb,
  Smile,
} from "lucide-react";

type Interest = {
  id?: string;
  name: string;
  type: string;
  emotion: string;
  level: number;
};

export default function InterestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState<Interest>({
    name: "",
    type: "hobby",
    emotion: "joy",
    level: 1,
  });

  // Interest types and emotions options
  const interestTypes = ["hobby", "passion", "career", "learning", "other"];
  const emotionTypes = [
    "joy",
    "excitement",
    "curiosity",
    "fulfillment",
    "pride",
    "other",
  ];
  const levelOptions = [1, 2, 3, 4, 5];

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        console.error("Error fetching user or no user logged in:", error);
        router.push("/login");
        return;
      }
      setUser(data.user);

      // Fetch existing interests if any
      const { data: interestsData, error: interestsError } = await supabase
        .from("interests")
        .select("*")
        .eq("user_id", data.user.id);

      if (interestsError) {
        console.error("Error fetching interests:", interestsError);
      } else if (interestsData) {
        setInterests(interestsData);
      }

      setLoading(false);
    };
    fetchUser();
  }, [supabase, router]);

  const handleAddInterest = async () => {
    if (!newInterest.name.trim()) {
      alert("Please enter an interest name");
      return;
    }

    setLoading(true);

    const interestToAdd = {
      ...newInterest,
      user_id: user.id,
      created_at: new Date(),
    };

    const { data, error } = await supabase
      .from("interests")
      .insert([interestToAdd])
      .select();

    if (error) {
      console.error("Error adding interest:", error);
      alert("Error adding interest: " + error.message);
    } else if (data) {
      setInterests([...interests, data[0]]);
      // Reset form
      setNewInterest({
        name: "",
        type: "hobby",
        emotion: "joy",
        level: 1,
      });
    }

    setLoading(false);
  };

  const handleRemoveInterest = async (id: string) => {
    setLoading(true);

    const { error } = await supabase.from("interests").delete().eq("id", id);

    if (error) {
      console.error("Error removing interest:", error);
      alert("Error removing interest: " + error.message);
    } else {
      setInterests(interests.filter((interest) => interest.id !== id));
    }

    setLoading(false);
  };

  const handleContinue = () => {
    const nextPath = searchParams.get("next") || "/me";
    router.push(nextPath);
  };

  if (loading && !user) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-center text-muted-foreground">
              Loading your profile...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Tell Us About Your Interests
          </CardTitle>
          <CardDescription className="text-center">
            Add interests, passions, or hobbies and how they make you feel
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Add New Interest Section */}
          <Card className="border border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Add New Interest
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interestName">Interest Name</Label>
                <Input
                  type="text"
                  id="interestName"
                  value={newInterest.name}
                  onChange={(e) =>
                    setNewInterest({ ...newInterest, name: e.target.value })
                  }
                  placeholder="e.g., Photography, Coding, Hiking"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestType">Type</Label>
                <Select
                  value={newInterest.type}
                  onValueChange={(value) =>
                    setNewInterest({ ...newInterest, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {interestTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {type === "hobby" && <Heart className="h-4 w-4" />}
                          {type === "passion" && <Star className="h-4 w-4" />}
                          {type === "career" && (
                            <Briefcase className="h-4 w-4" />
                          )}
                          {type === "learning" && (
                            <BookOpen className="h-4 w-4" />
                          )}
                          {type === "other" && (
                            <Lightbulb className="h-4 w-4" />
                          )}
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestEmotion">Emotional Connection</Label>
                <Select
                  value={newInterest.emotion}
                  onValueChange={(value) =>
                    setNewInterest({ ...newInterest, emotion: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an emotion" />
                  </SelectTrigger>
                  <SelectContent>
                    {emotionTypes.map((emotion) => (
                      <SelectItem key={emotion} value={emotion}>
                        <div className="flex items-center gap-2">
                          <Smile className="h-4 w-4" />
                          {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestLevel">Level (1-5)</Label>
                <div className="flex gap-2 mt-1">
                  {levelOptions.map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={
                        newInterest.level === level ? "default" : "outline"
                      }
                      className="flex-1"
                      onClick={() =>
                        setNewInterest({ ...newInterest, level: level })
                      }
                    >
                      {level}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Beginner</span>
                  <span>Expert</span>
                </div>
              </div>

              <Button
                onClick={handleAddInterest}
                disabled={loading || !newInterest.name.trim()}
                className="w-full mt-2"
              >
                {loading ? "Adding..." : "Add Interest"}
              </Button>
            </CardContent>
          </Card>

          {/* Your Interests Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Your Interests</h3>

            {interests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No interests added yet. Add some above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interests.map((interest) => (
                  <div
                    key={interest.id}
                    className="flex justify-between items-center p-3 bg-muted rounded-md"
                  >
                    <div>
                      <div className="font-medium">{interest.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {interest.type.charAt(0).toUpperCase() +
                          interest.type.slice(1)}{" "}
                        • Feeling:{" "}
                        {interest.emotion.charAt(0).toUpperCase() +
                          interest.emotion.slice(1)}{" "}
                        • Level: {interest.level}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveInterest(interest.id!)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button onClick={handleContinue} className="w-full" variant="default">
            Continue to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
