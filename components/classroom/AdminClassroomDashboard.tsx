"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  TrendingUp,
  Plus,
  School,
  UserCheck,
  Activity
} from "lucide-react";
import { CreateClassroomModal } from "./CreateClassroomModal";

interface DashboardStats {
  totalClassrooms: number;
  activeClassrooms: number;
  totalStudents: number;
  totalAssignments: number;
  activeAssignments: number;
  progressRate: number;
}

interface AdminClassroomDashboardProps {
  stats?: DashboardStats;
  onRefresh?: () => void;
}

export function AdminClassroomDashboard({ 
  stats = {
    totalClassrooms: 0,
    activeClassrooms: 0,
    totalStudents: 0,
    totalAssignments: 0,
    activeAssignments: 0,
    progressRate: 0
  },
  onRefresh 
}: AdminClassroomDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClassroomCreated = () => {
    // Refresh stats after classroom creation
    onRefresh?.();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    trend,
    color = "blue"
  }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: "up" | "down" | "neutral";
    color?: "blue" | "green" | "purple" | "orange";
  }) => {
    const colorClasses = {
      blue: "text-blue-600 dark:text-blue-400",
      green: "text-green-600 dark:text-green-400", 
      purple: "text-purple-600 dark:text-purple-400",
      orange: "text-orange-600 dark:text-orange-400"
    };

    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 ${colorClasses[color]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {value}
              </p>
              {trend && (
                <div className="flex items-center justify-end space-x-1">
                  <TrendingUp 
                    className={`h-3 w-3 ${
                      trend === 'up' ? 'text-green-500' : 
                      trend === 'down' ? 'text-red-500' : 
                      'text-slate-400'
                    }`} 
                  />
                  <span className="text-xs text-slate-500">
                    {trend === 'up' ? '+12%' : trend === 'down' ? '-5%' : '0%'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Classroom Dashboard
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage and monitor your educational environment
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            <Activity className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          
          <CreateClassroomModal onClassroomCreated={handleClassroomCreated} />
        </div>
      </div>

      {/* Compact Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={School}
          title="Total Classrooms"
          value={stats.totalClassrooms}
          subtitle={`${stats.activeClassrooms} active`}
          trend="up"
          color="blue"
        />
        
        <StatCard
          icon={Users}
          title="Total Students"
          value={stats.totalStudents}
          subtitle="Across all classrooms"
          trend="up"
          color="green"
        />
        
        <StatCard
          icon={ClipboardList}
          title="Total Assignments"
          value={stats.totalAssignments}
          subtitle={`${stats.activeAssignments} active`}
          trend="neutral"
          color="purple"
        />
        
        <StatCard
          icon={TrendingUp}
          title="Progress Rate"
          value={`${stats.progressRate}%`}
          subtitle="Assignment activity rate"
          trend="up"
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Quick Actions
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Common administrative tasks
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <UserCheck className="h-3 w-3" />
                <span>Manage Students</span>
              </Badge>
              
              <Badge variant="outline" className="flex items-center space-x-1">
                <BookOpen className="h-3 w-3" />
                <span>Assign Learning Maps</span>
              </Badge>
              
              <Badge variant="outline" className="flex items-center space-x-1">
                <ClipboardList className="h-3 w-3" />
                <span>Grade Assignments</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}