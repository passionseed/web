"use client";

import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  ClipboardList, 
  TrendingUp,
  School
} from "lucide-react";

interface DashboardStats {
  totalClassrooms: number;
  activeClassrooms: number;
  totalStudents: number;
  totalAssignments: number;
  activeAssignments: number;
  progressRate: number;
}

interface CompactClassroomStatsProps {
  stats?: DashboardStats;
}

export function CompactClassroomStats({ 
  stats = {
    totalClassrooms: 0,
    activeClassrooms: 0,
    totalStudents: 0,
    totalAssignments: 0,
    activeAssignments: 0,
    progressRate: 0
  }
}: CompactClassroomStatsProps) {

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle,
    iconColor = "text-slate-400"
  }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    iconColor?: string;
  }) => (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <div>
              <p className="text-xs font-medium text-white">
                {title}
              </p>
              {subtitle && (
                <p className="text-xs text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="text-xl font-bold text-white">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <StatCard
        icon={School}
        title="Total Classrooms"
        value={stats.totalClassrooms}
        subtitle={`${stats.activeClassrooms} active`}
        iconColor="text-blue-400"
      />
      
      <StatCard
        icon={Users}
        title="Total Students"
        value={stats.totalStudents}
        subtitle="Across all classrooms"
        iconColor="text-green-400"
      />
      
      <StatCard
        icon={ClipboardList}
        title="Total Assignments"
        value={stats.totalAssignments}
        subtitle={`${stats.activeAssignments} active`}
        iconColor="text-purple-400"
      />
      
      <StatCard
        icon={TrendingUp}
        title="Progress"
        value={`${stats.progressRate}%`}
        subtitle="Assignment activity rate"
        iconColor="text-orange-400"
      />
    </div>
  );
}