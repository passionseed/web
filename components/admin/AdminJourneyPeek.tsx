"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, ExternalLink, User, Calendar, MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface StudentProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  created_at: string;
}

interface JourneyMap {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  node_count?: number;
}

interface StudentWithJourney {
  profile: StudentProfile;
  journeyMap: JourneyMap | null;
}

export function AdminJourneyPeek() {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<StudentWithJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const { toast } = useToast();

  // Load all students on component mount
  useEffect(() => {
    loadAllStudents();
  }, []);

  const loadAllStudents = async () => {
    setLoading(true);
    
    try {
      const supabase = createClient();

      // Get all profiles (limited to reasonable number)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, created_at")
        .order("created_at", { ascending: false })
        .limit(100); // Reasonable limit for admin view

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
        toast({
          title: "Load Error",
          description: "Failed to load student profiles.",
          variant: "destructive",
        });
        return;
      }

      // For each student, check if they have a journey map
      const studentsWithJourneys: StudentWithJourney[] = [];
      
      for (const profile of profiles || []) {
        try {
          // Look for their personal journey map
          const { data: journeyMaps, error: mapError } = await supabase
            .from("learning_maps")
            .select("id, title, description, created_at, updated_at")
            .eq("creator_id", profile.id)
            .eq("title", "My Learning Journey")
            .eq("visibility", "private")
            .limit(1);

          if (mapError) {
            console.error(`Error fetching journey map for ${profile.username}:`, mapError);
          }

          const journeyMap = journeyMaps && journeyMaps.length > 0 ? journeyMaps[0] : null;

          // If journey map exists, get node count
          if (journeyMap) {
            const { count } = await supabase
              .from("map_nodes")
              .select("id", { count: "exact", head: true })
              .eq("map_id", journeyMap.id);
            
            journeyMap.node_count = count || 0;
          }

          studentsWithJourneys.push({
            profile,
            journeyMap,
          });
        } catch (error) {
          console.error(`Error processing student ${profile.username}:`, error);
          // Still add the student even if we can't get their journey map
          studentsWithJourneys.push({
            profile,
            journeyMap: null,
          });
        }
      }

      setStudents(studentsWithJourneys);

    } catch (error) {
      console.error("Error loading all students:", error);
      toast({
        title: "Load Error",
        description: "An unexpected error occurred while loading students.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async () => {
    if (!searchTerm.trim()) {
      // If search is empty, reload all students
      loadAllStudents();
      return;
    }

    setLoading(true);
    setSearchPerformed(true);
    
    try {
      const supabase = createClient();

      // Search for students by username, email, or full_name
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, created_at")
        .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(50);

      if (profilesError) {
        console.error("Error searching profiles:", profilesError);
        toast({
          title: "Search Error",
          description: "Failed to search for students.",
          variant: "destructive",
        });
        return;
      }

      // For each student, check if they have a journey map
      const studentsWithJourneys: StudentWithJourney[] = [];
      
      for (const profile of profiles || []) {
        try {
          // Look for their personal journey map
          const { data: journeyMaps, error: mapError } = await supabase
            .from("learning_maps")
            .select("id, title, description, created_at, updated_at")
            .eq("creator_id", profile.id)
            .eq("title", "My Learning Journey")
            .eq("visibility", "private")
            .limit(1);

          if (mapError) {
            console.error(`Error fetching journey map for ${profile.username}:`, mapError);
          }

          const journeyMap = journeyMaps && journeyMaps.length > 0 ? journeyMaps[0] : null;

          // If journey map exists, get node count
          if (journeyMap) {
            const { count } = await supabase
              .from("map_nodes")
              .select("id", { count: "exact", head: true })
              .eq("map_id", journeyMap.id);
            
            journeyMap.node_count = count || 0;
          }

          studentsWithJourneys.push({
            profile,
            journeyMap,
          });
        } catch (error) {
          console.error(`Error processing student ${profile.username}:`, error);
          // Still add the student even if we can't get their journey map
          studentsWithJourneys.push({
            profile,
            journeyMap: null,
          });
        }
      }

      setStudents(studentsWithJourneys);
      
      if (studentsWithJourneys.length === 0) {
        toast({
          title: "No Results",
          description: "No students found matching your search.",
        });
      }

    } catch (error) {
      console.error("Error in student search:", error);
      toast({
        title: "Search Error",
        description: "An unexpected error occurred while searching.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openJourneyMap = (mapId: string) => {
    // Open the journey map in a new tab in edit mode
    window.open(`/map/${mapId}/edit`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Journey Peek
        </CardTitle>
        <CardDescription>
          Search for students and view their personal journey maps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search by username, email, or name (leave empty to show all)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchStudents()}
            />
          </div>
          <Button 
            onClick={searchStudents} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? "Loading..." : (searchTerm.trim() ? "Search" : "Show All")}
          </Button>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              {searchTerm.trim() ? `Search Results (${students.length})` : `All Students (${students.length})`}
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Loading students...</span>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm.trim() ? "No students found matching your search." : "No students found in the system."}
            </div>
          ) : (
            <div className="grid gap-4">
              {students.map(({ profile, journeyMap }) => (
                <Card key={profile.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {profile.full_name || profile.username || "Unnamed User"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{profile.username} • {profile.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Joined {formatDate(profile.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {journeyMap ? (
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            Journey Map Available
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {journeyMap.node_count || 0} nodes
                            </div>
                            <div>Updated {formatDate(journeyMap.updated_at)}</div>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">No Journey Map</Badge>
                      )}

                      {journeyMap && (
                        <Button
                          onClick={() => openJourneyMap(journeyMap.id)}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Map
                        </Button>
                      )}
                    </div>
                  </div>

                  {journeyMap && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-sm">
                        <div className="font-medium">{journeyMap.title}</div>
                        {journeyMap.description && (
                          <div className="text-muted-foreground mt-1">
                            {journeyMap.description}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}