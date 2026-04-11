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
import { AdminDirectionFinder } from "./AdminDirectionFinder";
import { AdminHackathonParticipants } from "./AdminHackathonParticipants";
import { AdminHackathonTeams } from "./AdminHackathonTeams";
import { AdminHackathonAnalytics } from "./AdminHackathonAnalytics";
import { AdminHackathonQuestionnaire } from "./AdminHackathonQuestionnaire";
import { AdminHackathonMatching } from "./AdminHackathonMatching";
import { AdminHackathonMentors } from "./AdminHackathonMentors";
import { AdminHackathonSubmissions } from "./AdminHackathonSubmissions";
import { AdminHackathonTeamSubmissions } from "./AdminHackathonTeamSubmissions";
import { AdminBetaRegistrations } from "./AdminBetaRegistrations";
import { AdminEventTracker } from "./AdminEventTracker";
import {
  Users,
  Activity,
  Settings,
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
        <div className="w-full overflow-x-auto pb-2 -mb-2">
          <TabsList className="inline-flex w-max min-w-full justify-start">
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
          <TabsTrigger value="university-data" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            University Data
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
        </div>

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
                  <TabsTrigger value="teams">Teams</TabsTrigger>
                  <TabsTrigger value="team-submissions">Team Submissions</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                  <TabsTrigger value="matching">Matching</TabsTrigger>
                  <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
                  <TabsTrigger value="analytics">Page Analytics</TabsTrigger>
                  <TabsTrigger value="mentors">Mentors</TabsTrigger>
                </TabsList>
                <TabsContent value="participants">
                  <AdminHackathonParticipants key={`hackathon-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="teams">
                  <AdminHackathonTeams key={`teams-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="team-submissions">
                  <AdminHackathonTeamSubmissions key={`team-submissions-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="submissions">
                  <AdminHackathonSubmissions key={`submissions-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="matching">
                  <AdminHackathonMatching />
                </TabsContent>
                <TabsContent value="questionnaire">
                  <AdminHackathonQuestionnaire key={`questionnaire-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="analytics">
                  <AdminHackathonAnalytics />
                </TabsContent>
                <TabsContent value="mentors">
                  <AdminHackathonMentors key={`mentors-${refreshKey}`} />
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

        <TabsContent value="university-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>University Data Management</CardTitle>
              <CardDescription>
                Manage university archive for educational pathways
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <a href="/admin/archive/universities" className="block">
                  <Card className="cursor-pointer hover:bg-slate-800/50 transition-colors h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <GraduationCap className="h-5 w-5 text-blue-400" />
                        <CardTitle className="text-lg">Universities</CardTitle>
                      </div>
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
