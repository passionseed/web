"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  getAssignmentGroupGradingSummary, 
  getGroupMapProgress,
  getGroupProgress 
} from "@/lib/supabase/group-grading";
import { getGroupAssignments } from "@/lib/supabase/assignment-groups";
import { GroupMapGrading } from "@/components/classroom/GroupMapGrading";
import type { 
  GroupGradingSummary, 
  GroupMapProgress, 
  AssignmentGroupWithProgress 
} from "@/types/classroom";

interface GroupGradingDashboardProps {
  classroomId: string;
  assignmentId?: string;
  mapId?: string;
}

export function GroupGradingDashboard({ 
  classroomId, 
  assignmentId, 
  mapId 
}: GroupGradingDashboardProps) {
  const [gradingSummary, setGradingSummary] = useState<GroupGradingSummary[]>([]);
  const [mapProgress, setMapProgress] = useState<GroupMapProgress | null>(null);
  const [groupProgress, setGroupProgress] = useState<AssignmentGroupWithProgress | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupGradingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadData();
  }, [classroomId, assignmentId, mapId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (assignmentId) {
        const summary = await getAssignmentGroupGradingSummary(assignmentId);
        setGradingSummary(summary);
      }
      
      if (mapId && gradingSummary.length > 0) {
        // Get progress for the first group by default
        const progress = await getGroupMapProgress(gradingSummary[0].group_id, mapId);
        setMapProgress(progress);
      }
    } catch (error) {
      console.error("Error loading grading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupProgress = async (groupId: string) => {
    try {
      const progress = await getGroupProgress(groupId);
      setGroupProgress(progress);
    } catch (error) {
      console.error("Error loading group progress:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "not_started": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Group Grading Dashboard</h2>
          <p className="text-gray-600">
            Monitor and grade group assignments and map progress
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="map">Map Progress</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{gradingSummary.length}</div>
                <p className="text-xs text-gray-600">Active groups in this assignment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {gradingSummary.length > 0 
                    ? Math.round(gradingSummary.reduce((sum, g) => sum + (g.average_score || 0), 0) / gradingSummary.length) 
                    : 0}%
                </div>
                <p className="text-xs text-gray-600">Across all groups</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Grading Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {gradingSummary.filter(g => g.grading_status === "completed").length} / {gradingSummary.length}
                </div>
                <p className="text-xs text-gray-600">Groups fully graded</p>
              </CardContent>
            </Card>
          </div>

          {gradingSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Group Performance Summary</CardTitle>
                <CardDescription>
                  Overview of all groups in this assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gradingSummary.map((group) => (
                    <div key={group.group_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                          <h4 className="font-medium">{group.group_name}</h4>
                          <p className="text-sm text-gray-600">
                            {group.submission_count} / {group.total_members} submissions
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Badge className={getStatusColor(group.grading_status)}>
                          {group.grading_status.replace('_', ' ')}
                        </Badge>
                        
                        <div className="text-right">
                          <div className="font-medium">
                            {group.average_score ? Math.round(group.average_score) + '%' : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-600">Average</div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setActiveTab("groups");
                            loadGroupProgress(group.group_id);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="groups">
          {groupProgress ? (
            <Card>
              <CardHeader>
                <CardTitle>{groupProgress.name} - Detailed Progress</CardTitle>
                <CardDescription>
                  Member progress and assignment completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {Math.round(groupProgress.overall_progress.completion_percentage)}%
                      </div>
                      <div className="text-sm text-gray-600">Overall Completion</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {groupProgress.overall_progress.submitted_assignments}
                      </div>
                      <div className="text-sm text-gray-600">Assignments Submitted</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {groupProgress.overall_progress.active_members}
                      </div>
                      <div className="text-sm text-gray-600">Active Members</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {groupProgress.members.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Members</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Member Progress</h4>
                    <div className="space-y-3">
                      {groupProgress.members.map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {member.profiles.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">
                                {member.profiles.full_name || member.profiles.username}
                              </div>
                              <div className="text-sm text-gray-600">
                                {member.role}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {member.progress && (
                              <>
                                <div className="w-32">
                                  <Progress 
                                    value={member.progress.completion_percentage} 
                                    className="h-2"
                                  />
                                  <div className="text-xs text-gray-600 text-center mt-1">
                                    {Math.round(member.progress.completion_percentage)}%
                                  </div>
                                </div>
                                
                                <Badge variant="outline">
                                  {member.progress.status}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Select a group to view detailed progress</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="map">
          {mapProgress ? (
            <Card>
              <CardHeader>
                <CardTitle>Map Progress</CardTitle>
                <CardDescription>
                  Group progress on the current map
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {mapProgress.completed_nodes}
                      </div>
                      <div className="text-sm text-gray-600">Nodes Completed</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {mapProgress.total_nodes}
                      </div>
                      <div className="text-sm text-gray-600">Total Nodes</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {Math.round(mapProgress.average_completion)}%
                      </div>
                      <div className="text-sm text-gray-600">Average Completion</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Member Progress</h4>
                    <div className="space-y-3">
                      {mapProgress.member_progress.map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="font-medium">{member.username}</div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="font-medium">
                                {member.completed_nodes} / {mapProgress.total_nodes}
                              </div>
                              <div className="text-sm text-gray-600">
                                {Math.round(member.completion_percentage)}% complete
                              </div>
                            </div>
                            <Progress 
                              value={member.completion_percentage} 
                              className="w-24 h-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {mapProgress.recent_completions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-4">Recent Completions</h4>
                      <div className="space-y-2">
                        {mapProgress.recent_completions.slice(0, 5).map((completion, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{completion.node_title}</span>
                            <span className="text-gray-600">
                              by {completion.username} • {new Date(completion.completed_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No map progress data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grading">
          {selectedGroup && mapId ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedGroup(null)}
                  className="flex items-center space-x-2"
                >
                  <span>←</span>
                  <span>Back to Groups</span>
                </Button>
                <div>
                  <h3 className="text-lg font-semibold">Grading: {selectedGroup.group_name}</h3>
                </div>
              </div>
              <GroupMapGrading
                groupId={selectedGroup.group_id}
                mapId={mapId}
                groupName={selectedGroup.group_name}
                onGraded={() => {
                  loadData();
                }}
              />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Grading Interface</CardTitle>
                <CardDescription>
                  Select a group to start grading their map submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gradingSummary.length > 0 ? (
                    <>
                      <p className="text-gray-600">Select a group to grade:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gradingSummary.map((group) => (
                          <Card 
                            key={group.group_id} 
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              setSelectedGroup(group);
                              if (mapId) {
                                loadGroupProgress(group.group_id);
                              }
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{group.group_name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {group.submission_count} submissions to review
                                  </p>
                                </div>
                                <Badge className={getStatusColor(group.grading_status)}>
                                  {group.grading_status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600">No groups found for grading</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}