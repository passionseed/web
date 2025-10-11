"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Crown,
  UserPlus,
  Search,
  Filter,
  Calendar,
  MapPin,
  MoreVertical,
} from "lucide-react";
import { TeamWithMembers } from "@/types/teams";
import { TeamDetailsModal } from "../classroom/TeamDetailsModal";

interface AllTeamsGridProps {
  teams: TeamWithMembers[];
  classroomId: string;
  userRole: string;
  onTeamUpdated: () => void;
}

export function AllTeamsGrid({
  teams,
  classroomId,
  userRole,
  onTeamUpdated,
}: AllTeamsGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Filter and sort teams
  const filteredTeams = teams
    .filter((team) => {
      // Search filter
      if (
        searchQuery &&
        !team.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !team.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filterStatus === "open") {
        return (
          !team.max_members || team.member_count < team.max_members
        );
      } else if (filterStatus === "full") {
        return team.max_members && team.member_count >= team.max_members;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return b.member_count - a.member_count;
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  const handleTeamClick = (team: TeamWithMembers) => {
    setSelectedTeam(team);
    setDetailsModalOpen(true);
  };

  if (teams.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            No teams have been created in this classroom yet. Create the first team to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            <SelectItem value="open">Open Spots</SelectItem>
            <SelectItem value="full">Full Teams</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Team Size</SelectItem>
            <SelectItem value="created">Recently Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teams Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredTeams.length} {filteredTeams.length === 1 ? "team" : "teams"}
          {searchQuery && " found"}
        </p>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Teams Found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              No teams match your current filters. Try adjusting your search criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <Card
              key={team.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleTeamClick(team)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {team.name}
                    </CardTitle>
                    {team.description && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {team.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Team Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{team.member_count}</span>
                    {team.max_members && (
                      <span className="text-muted-foreground">
                        / {team.max_members}
                      </span>
                    )}
                  </div>
                  {team.max_members && team.member_count >= team.max_members ? (
                    <Badge variant="secondary">Full</Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Open
                    </Badge>
                  )}
                </div>

                {/* Team Members Preview */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">Team Leader</span>
                  </div>
                  {team.leader && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={team.leader.profiles.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {team.leader.profiles.username?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {team.leader.profiles.full_name ||
                          team.leader.profiles.username}
                      </span>
                    </div>
                  )}
                </div>

                {/* Other Members */}
                {team.team_memberships.length > 1 && (
                  <div className="flex items-center gap-1">
                    {team.team_memberships
                      .filter((m) => !m.is_leader)
                      .slice(0, 5)
                      .map((member) => (
                        <Avatar key={member.id} className="h-6 w-6">
                          <AvatarImage src={member.profiles.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {member.profiles.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    {team.member_count > 6 && (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium">
                          +{team.member_count - 6}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Created Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Created {new Date(team.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          classroomId={classroomId}
          userRole={userRole}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          onTeamUpdated={() => {
            onTeamUpdated();
            setDetailsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
