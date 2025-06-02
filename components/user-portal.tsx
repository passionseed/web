"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  Star,
  Users,
  BookOpen,
  Award,
  Flame,
  ThumbsUp,
  MessageSquare,
  Share2,
  Leaf,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface UserPortalProps {
  userId: string;
}

export function UserPortal({ userId }: UserPortalProps) {
  const supabase = createClient();
  const [reflection, setReflection] = useState("");
  const [loading, setLoading] = useState(true);
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [userWorkshops, setUserWorkshops] = useState<any[]>([]);
  const [userCommunities, setUserCommunities] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>({
    helpful_responses: 0,
    communities_helped: 0,
    kudos_received: 0,
    workshops_contributed: 0,
    average_rating: 0,
  });
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, date_of_birth")
        .eq("id", userId)
        .single();
      setProfile(data);
      setProfileLoading(false);
    }
    if (userId) fetchProfile();
  }, [userId, supabase]);

  useEffect(() => {
    async function fetchUserData() {
      setLoading(true);

      // Fetch branches (interests)
      const { data: branches, error: branchesError } = await supabase
        .from("branches")
        .select("*")
        .order("importance", { ascending: false })
        .limit(5);

      if (branches && !branchesError) {
        setUserInterests(
          branches.map((branch) => ({
            name: branch.name,
            level: branch.mastery || 50,
          }))
        );
      }

      // Fetch emotions (skills with emotional ratings)
      const { data: emotions, error: emotionsError } = await supabase
        .from("emotions")
        .select("*, passion_tree_id")
        .limit(5);

      if (emotions && !emotionsError) {
        // Transform emotions data into skills
        const skills = emotions.map((emotion) => {
          // Get the highest emotion value
          const emotionValues = {
            curiosity: { value: emotion.curiosity, name: "Curious" },
            joy: { value: emotion.joy, name: "Joyful" },
            fulfillment: { value: emotion.fulfillment, name: "Fulfilled" },
            challenge: { value: emotion.challenge, name: "Challenged" },
          };

          const highestEmotion = Object.entries(emotionValues).sort(
            (a, b) => b[1].value - a[1].value
          )[0][1];

          return {
            name: `Skill ${emotion.id.substring(0, 4)}`,
            level: Math.floor(Math.random() * 40) + 60, // Placeholder level
            emotion: highestEmotion.name,
          };
        });

        setUserSkills(skills);
      }

      // For now, use placeholder data for workshops and communities
      setUserWorkshops([
        {
          name: "Advanced JavaScript Patterns",
          date: "March 15, 2023",
          instructor: "Alex Johnson",
          category: "Build",
        },
        {
          name: "Creative UI Design Principles",
          date: "April 22, 2023",
          instructor: "Maya Patel",
          category: "Build",
        },
        {
          name: "Finding Your Purpose",
          date: "May 10, 2023",
          instructor: "James Wilson",
          category: "Inspire",
        },
        {
          name: "Community Building Strategies",
          date: "June 5, 2023",
          instructor: "Sarah Chen",
          category: "Scale",
        },
      ]);

      setUserCommunities([
        { name: "JavaScript Developers", members: 1250, role: "Contributor" },
        { name: "UI/UX Designers", members: 980, role: "Active Member" },
        { name: "Content Creators", members: 1500, role: "Moderator" },
        { name: "Public Speakers Network", members: 750, role: "Member" },
      ]);

      setUserStats({
        helpful_responses: 87,
        communities_helped: 5,
        kudos_received: 124,
        workshops_contributed: 3,
        average_rating: 4.8,
      });

      setLoading(false);
    }

    if (userId) {
      fetchUserData();
    }
  }, [userId, supabase]);

  const handleSaveReflection = async () => {
    if (!reflection.trim()) return;

    const { data, error } = await supabase
      .from("reflections")
      .insert([{ user_id: userId, content: reflection }]);

    if (!error) {
      alert("Reflection saved successfully!");
      setReflection("");
    } else {
      console.error("Error saving reflection:", error);
      alert("Failed to save reflection. Please try again.");
    }
  };

  const getEmotionColor = (emotion: string) => {
    const emotionColors: Record<string, string> = {
      Curious: "text-blue-500",
      Joyful: "text-green-500",
      Fulfilled: "text-purple-500",
      Challenged: "text-yellow-500",
    };
    return emotionColors[emotion] || "text-gray-500";
  };

  const getProgressColor = (level: number) => {
    if (level >= 80) return "bg-green-500";
    if (level >= 60) return "bg-blue-500";
    if (level >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading || profileLoading) {
    return (
      <div className="container py-10 px-4 md:px-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-xl">Loading your passion data...</p>
      </div>
    );
  }

  return (
    <div className="container py-10 px-4 md:px-6">
      <div className="flex flex-col space-y-8">
        {/* Profile Incomplete Banner/Button */}
        {profile &&
          (!profile.full_name ||
            !profile.username ||
            !profile.date_of_birth) && (
            <div className="mb-4">
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded flex items-center justify-between">
                <span>
                  Your profile is incomplete. Please finish your profile to
                  unlock all features.
                </span>
                <Link href="/auth/finish-profile">
                  <Button className="ml-4 bg-yellow-500 hover:bg-yellow-600 text-white">
                    Finish Profile
                  </Button>
                </Link>
              </div>
            </div>
          )}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Your Passion Portal
          </h1>
          <p className="text-muted-foreground">
            Track your interests, skills, and community contributions all in one
            place.
          </p>
        </div>

        <Link href="/me/tree" className="block mb-8">
          <Card className="bg-gradient-to-r from-green-800 to-emerald-700 hover:from-green-700 hover:to-emerald-600 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Passion Tree Garden
                </h3>
                <p className="text-white/80">
                  Cultivate your passions and watch them grow over time
                </p>
              </div>
              <Leaf className="h-12 w-12 text-green-300" />
            </CardContent>
          </Card>
        </Link>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-1 bg-gradient-to-br from-purple-950 to-violet-900 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Flame className="mr-2 h-5 w-5 text-red-400" />
                Your Interests
              </CardTitle>
              <CardDescription className="text-white/70">
                Passions you're currently exploring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userInterests.map((interest, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{interest.name}</span>
                      <span>{interest.level}%</span>
                    </div>
                    <Progress
                      value={interest.level}
                      className={`h-2 ${getProgressColor(interest.level)}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 bg-gradient-to-br from-violet-900 to-purple-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5 text-yellow-400" />
                Your Skills
              </CardTitle>
              <CardDescription className="text-white/70">
                Skills with emotional connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userSkills.map((skill, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{skill.name}</span>
                      <span className={getEmotionColor(skill.emotion)}>
                        {skill.emotion}
                      </span>
                    </div>
                    <Progress
                      value={skill.level}
                      className={`h-2 ${getProgressColor(skill.level)}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Link
            href="/me/reflection"
            className="col-span-1 md:col-span-2 lg:col-span-1"
          >
            <Card className="bg-gradient-to-br from-purple-800 to-violet-700 text-white hover:from-purple-700 hover:to-violet-600 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Heart className="mr-2 h-5 w-5 text-red-400" />
                  Daily Reflection
                </CardTitle>
                <CardDescription className="text-white/70">
                  Take a moment to reflect on your journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-white/80">
                    Click here to write your daily reflection and track your
                    personal growth
                  </p>
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Start Reflecting
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Tabs defaultValue="workshops" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
            <TabsTrigger value="stats">Your Stats</TabsTrigger>
          </TabsList>
          <TabsContent value="workshops">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Workshops You've Joined
                </CardTitle>
                <CardDescription>
                  Track your learning journey through workshops
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userWorkshops.map((workshop, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{workshop.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {workshop.date} • Instructor: {workshop.instructor}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          workshop.category === "Inspire"
                            ? "bg-yellow-600 text-white border-none"
                            : workshop.category === "Build"
                              ? "bg-orange-600 text-white border-none"
                              : "bg-red-600 text-white border-none"
                        }
                      >
                        {workshop.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="communities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Your Communities
                </CardTitle>
                <CardDescription>
                  Communities you're actively participating in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userCommunities.map((community, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{community.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {community.members} members
                        </p>
                      </div>
                      <Badge>{community.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="mr-2 h-5 w-5" />
                  Your Impact Stats
                </CardTitle>
                <CardDescription>
                  How you're helping others in the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-4">
                    <ThumbsUp className="h-8 w-8 text-blue-500" />
                    <h4 className="text-xl font-bold">
                      {userStats.helpful_responses}
                    </h4>
                    <p className="text-center text-sm text-muted-foreground">
                      Helpful Responses
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-4">
                    <MessageSquare className="h-8 w-8 text-green-500" />
                    <h4 className="text-xl font-bold">
                      {userStats.kudos_received}
                    </h4>
                    <p className="text-center text-sm text-muted-foreground">
                      Kudos Received
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-4">
                    <Share2 className="h-8 w-8 text-purple-500" />
                    <h4 className="text-xl font-bold">
                      {userStats.communities_helped}
                    </h4>
                    <p className="text-center text-sm text-muted-foreground">
                      Communities Helped
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Average Rating</p>
                    <div className="flex items-center">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.floor(userStats.average_rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      <span className="ml-2 text-sm font-medium">
                        {userStats.average_rating}/5
                      </span>
                    </div>
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className="bg-red-600 text-white border-none"
                    >
                      Top Contributor
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
