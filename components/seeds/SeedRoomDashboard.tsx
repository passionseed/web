"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Calendar,
  BookOpen,
  Settings,
  TrendingUp,
  CheckCircle,
  Play,
  StopCircle,
  User,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { MentorAvailabilitySettings } from "@/components/profile/MentorAvailabilitySettings";
import { SeedRoomGrading } from "./SeedRoomGrading";

interface SeedRoomDashboardProps {
  room: any;
  seed: any;
  currentUser: any;
  isAdmin: boolean;
  isInstructor: boolean;
  initialMembers?: any[];
}

interface DashboardStats {
  totalMembers: number;
  roomStatus: string;
  createdDate: string;
  maxStudents: number;
}

export function SeedRoomDashboard({
  room,
  seed,
  currentUser,
  isAdmin,
  isInstructor,
  initialMembers = [],
}: SeedRoomDashboardProps) {
  const router = useRouter();

  // Calculate stats directly from props to ensure server/client match
  const stats: DashboardStats = {
    totalMembers: initialMembers.length,
    roomStatus: room.status,
    createdDate: room.created_at,
    maxStudents: room.max_students || 50,
  };

  // Store active room in localStorage so "Seeds" nav link can return here
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeSeedRoom', room.join_code);
    }
  }, [room.join_code]);

  const refreshRoomData = () => {
    // Refresh the page to get updated data from the server
    router.refresh();
  };

  const handleBackToSeeds = () => {
    // Clear active room and navigate to main seeds page with gallery parameter
    // The ?gallery parameter bypasses the auto-redirect logic
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeSeedRoom');
    }
    router.push('/seeds?gallery=true');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStartSession = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("seed_rooms")
        .update({ status: "active" })
        .eq("id", room.id);

      if (error) throw error;

      toast.success("Session started!");
      refreshRoomData();
    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error("Failed to start session");
    }
  };

  const handleEndSession = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("seed_rooms")
        .update({ status: "completed" })
        .eq("id", room.id);

      if (error) throw error;

      toast.success("Session ended!");
      refreshRoomData();
    } catch (error) {
      console.error("Failed to end session:", error);
      toast.error("Failed to end session");
    }
  };

  const handleViewMap = () => {
    router.push(`/seeds/room/${room.join_code}?view=map`);
  };

  const statusColors = {
    waiting: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    active: "bg-green-500/20 text-green-300 border-green-500/30",
    completed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="container mx-auto space-y-6">
        {/* Back Button */}
        <div>
          <Button
            variant="ghost"
            onClick={handleBackToSeeds}
            className="text-neutral-400 hover:text-white gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Seeds
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-white">{seed.title}</h1>
              <Badge
                className={statusColors[room.status as keyof typeof statusColors]}
              >
                {room.status}
              </Badge>
            </div>
            {seed.slogan && (
              <p className="text-neutral-400">{seed.slogan}</p>
            )}
            <div className="flex items-center space-x-4 text-sm text-neutral-400">
              <span>
                Room Code:{" "}
                <span className="font-mono font-bold text-white">
                  {room.join_code}
                </span>
              </span>
              <span>•</span>
              <span>Created {formatDate(room.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {room.status === "waiting" && (
              <Button
                onClick={handleStartSession}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Play className="w-4 h-4" />
                Start Session
              </Button>
            )}
            {room.status === "active" && (
              <>
                <Button
                  onClick={handleViewMap}
                  variant="outline"
                  className="gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  View Map
                </Button>
                <Button
                  onClick={handleEndSession}
                  variant="destructive"
                  className="gap-2"
                >
                  <StopCircle className="w-4 h-4" />
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-300">
                Students
              </CardTitle>
              <Users className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {stats.totalMembers} / {stats.maxStudents}
              </div>
              <p className="text-xs text-neutral-400">
                {stats.maxStudents - stats.totalMembers} slots remaining
              </p>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-300">
                Session Status
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white capitalize">
                {room.status}
              </div>
              <p className="text-xs text-neutral-400">Current state</p>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-300">
                Learning Map
              </CardTitle>
              <BookOpen className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white truncate">
                {seed.title}
              </div>
              <p className="text-xs text-neutral-400">Active content</p>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-300">
                Created
              </CardTitle>
              <Calendar className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-white">
                {new Date(room.created_at).toLocaleDateString()}
              </div>
              <p className="text-xs text-neutral-400">Session start date</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList className="bg-neutral-900 border border-neutral-800">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="grading">Grading</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <Card className="bg-neutral-900/50 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">
                  Participants ({initialMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {initialMembers.length > 0 ? (
                  <div className="space-y-2">
                    {initialMembers.map((student: any, index: number) => {
                      // Handle both nested and flat profile structures
                      const profile = student.profiles || student.profile;
                      const fullName = profile?.full_name || student.full_name || "Unknown Student";
                      const email = profile?.email || student.email || "No email";

                      return (
                        <div
                          key={student.id || index}
                          className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                        >
                          <div className="flex items-center gap-3">
                            {/* Profile Picture */}
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profile?.avatar_url} alt={fullName} />
                              <AvatarFallback className="bg-neutral-700 text-white">
                                {fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>

                            {/* Name and Email */}
                            <div>
                              <p className="font-medium text-white">
                                {fullName}
                              </p>
                              <p className="text-sm text-neutral-400">
                                {email}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-neutral-500">
                            Joined {formatDate(student.joined_at)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      No students yet
                    </h3>
                    <p className="text-neutral-400">
                      Share the room code{" "}
                      <span className="font-mono font-bold text-white">
                        {room.join_code}
                      </span>{" "}
                      with students to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grading" className="space-y-4">
            <SeedRoomGrading roomId={room.id} mapId={seed.map_id} />
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-neutral-900/50 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">Session Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-400">Seed Title</p>
                    <p className="text-lg font-semibold text-white">
                      {seed.title}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-400">Category</p>
                    <p className="text-lg font-semibold text-white">
                      {seed.category?.name || "Uncategorized"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-400">Room Code</p>
                    <p className="text-lg font-mono font-bold text-white">
                      {room.join_code}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-400">Max Students</p>
                    <p className="text-lg font-semibold text-white">
                      {room.max_students || 50}
                    </p>
                  </div>
                </div>
                {seed.description && (
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-400">Description</p>
                    <p className="text-white">{seed.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-neutral-900/50 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">Room Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                    <div>
                      <p className="font-medium text-white">Room Code</p>
                      <p className="text-sm text-neutral-400">
                        Share this code with students
                      </p>
                    </div>
                    <code className="text-lg font-mono font-bold text-white">
                      {room.join_code}
                    </code>
                  </div>
                </div>

                {currentUser.id === room.mentor_id && (
                  <div className="pt-6 border-t border-neutral-800">
                    <MentorAvailabilitySettings userId={currentUser.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
