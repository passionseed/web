"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminStatsOverview } from "./AdminStatsOverview";
import { AdminUserManagement } from "./AdminUserManagement";
import { AdminMapsManagement } from "./AdminMapsManagement";
import { AdminJourneyPeek } from "./AdminJourneyPeek";
import { AdminDirectionFinder } from "./AdminDirectionFinder";
import { AdminHackathonParticipants } from "./AdminHackathonParticipants";
import { AdminHackathonAnalytics } from "./AdminHackathonAnalytics";
import { AdminHackathonQuestionnaire } from "./AdminHackathonQuestionnaire";
import { AdminBetaRegistrations } from "./AdminBetaRegistrations";
import { AdminStudentOnboarding } from "./AdminStudentOnboarding";
import { AdminEventTracker } from "./AdminEventTracker";
import {
  Users,
  Activity,
  Settings,
  BarChart3,
  Eye,
  Archive,
  Compass,
  Trophy,
  TestTube,
  GraduationCap,
  Zap,
} from "lucide-react";

export function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [hackathonCount, setHackathonCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/hackathon/participants")
      .then((r) => r.json())
      .then((data) => {
        if (data.participants) setHackathonCount(data.participants.length);
      })
      .catch(() => {});
  }, [refreshKey]);

  const handleDataReload = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <AdminStatsOverview key={refreshKey} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="maps" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Maps Management
          </TabsTrigger>
          <TabsTrigger
            value="direction-finder"
            className="flex items-center gap-2"
          >
            <Compass className="h-4 w-4" />
            Direction Results
          </TabsTrigger>
          <TabsTrigger value="hackathon" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Hackathon
            {hackathonCount !== null && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-medium leading-none">
                {hackathonCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="beta" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Beta
          </TabsTrigger>
          <TabsTrigger value="event-tracker" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Event Tracker
          </TabsTrigger>
          <TabsTrigger value="student-onboarding" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Student Onboarding
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="journey-peek" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Journey Peek
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archive
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <AdminUserManagement
            key={`users-${refreshKey}`}
            onDataReload={handleDataReload}
          />
        </TabsContent>

        <TabsContent value="maps" className="space-y-4">
          <AdminMapsManagement
            key={`maps-${refreshKey}`}
            onDataReload={handleDataReload}
          />
        </TabsContent>

        <TabsContent value="direction-finder" className="space-y-4">
          <AdminDirectionFinder />
        </TabsContent>

        <TabsContent value="hackathon" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hackathon Management</CardTitle>
              <CardDescription>
                View hackathon participants and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="participants" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="participants">Participants</TabsTrigger>
                  <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
                  <TabsTrigger value="analytics">Page Analytics</TabsTrigger>
                </TabsList>
                <TabsContent value="participants">
                  <AdminHackathonParticipants key={`hackathon-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="questionnaire">
                  <AdminHackathonQuestionnaire key={`questionnaire-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="analytics">
                  <AdminHackathonAnalytics />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beta" className="space-y-4">
          <AdminBetaRegistrations key={`beta-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="event-tracker" className="space-y-4">
          <AdminEventTracker key={`event-tracker-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="student-onboarding" className="space-y-4">
          <AdminStudentOnboarding key={`onboarding-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>
                View platform usage statistics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journey-peek" className="space-y-4">
          <AdminJourneyPeek key={`journey-peek-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="archive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archive Management</CardTitle>
              <CardDescription>
                Manage archived data and system resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <a href="/admin/archive/universities" className="block">
                  <Card className="cursor-pointer hover:bg-slate-800/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Universities</CardTitle>
                      <CardDescription>
                        Manage university archive for educational pathways
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-400">
                        Add, edit, and organize universities that students can
                        select.
                      </p>
                    </CardContent>
                  </Card>
                </a>

                <a href="/admin/archive/ai" className="block">
                  <Card className="cursor-pointer hover:bg-slate-800/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">AI Agents</CardTitle>
                      <CardDescription>
                        Manage AI agents and prompts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-400">
                        Configure AI behavior for different use cases like
                        roadmap generation.
                      </p>
                    </CardContent>
                  </Card>
                </a>

                <Card className="opacity-50 cursor-not-allowed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-slate-500">
                      Learning Resources
                    </CardTitle>
                    <CardDescription>
                      Coming soon - Manage learning resources
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500">
                      Future archive for educational content and materials.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                Configure global platform settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Settings panel coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
