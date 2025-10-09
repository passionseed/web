"use client";

import { useState } from "react";
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
import { Users, Activity, Settings, BarChart3, Eye } from "lucide-react";

export function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

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
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="journey-peek" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Journey Peek
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
