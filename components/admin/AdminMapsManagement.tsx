"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  Search,
  Eye,
  Trash2,
  Users,
  Calendar,
} from "lucide-react";

interface AdminMap {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  creator_name: string;
  difficulty: number;
  category: string | null;
  visibility: "public" | "private" | "team";
  node_count: number;
  avg_difficulty: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface AdminMapsManagementProps {
  onDataReload?: () => void;
}

export function AdminMapsManagement({ onDataReload }: AdminMapsManagementProps) {
  const [maps, setMaps] = useState<AdminMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisibility, setSelectedVisibility] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [mapToDelete, setMapToDelete] = useState<AdminMap | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredMaps = maps.filter(map => {
    const matchesSearch = !searchTerm || 
      map.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      map.creator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      map.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      map.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVisibility = selectedVisibility === "all" || 
      map.visibility === selectedVisibility;
    
    const matchesDifficulty = selectedDifficulty === "all" || 
      map.difficulty.toString() === selectedDifficulty;
    
    return matchesSearch && matchesVisibility && matchesDifficulty;
  });

  useEffect(() => {
    loadMaps();
  }, []);

  const loadMaps = async () => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/admin/maps");
      
      if (response.ok) {
        const mapsData = await response.json();
        setMaps(mapsData);
      } else {
        throw new Error("Failed to fetch maps");
      }
    } catch (error) {
      console.error("Error loading maps:", error);
      toast({
        title: "Error",
        description: "Failed to load learning maps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMap = async (map: AdminMap) => {
    setMapToDelete(map);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!mapToDelete) return;

    try {
      setDeleting(mapToDelete.id);
      
      const response = await fetch(`/api/admin/maps/${mapToDelete.id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message || "Map deleted successfully",
        });
        
        // Remove the deleted map from the list
        setMaps(prevMaps => prevMaps.filter(m => m.id !== mapToDelete.id));
        onDataReload?.();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete map");
      }
    } catch (error) {
      console.error("Error deleting map:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete map",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setMapToDelete(null);
    }
  };

  const getVisibilityBadgeVariant = (visibility: string) => {
    switch (visibility) {
      case "public": return "default";
      case "private": return "secondary";
      case "team": return "outline";
      default: return "outline";
    }
  };

  const getDifficultyBadgeVariant = (difficulty: number) => {
    if (difficulty <= 2) return "secondary";
    if (difficulty <= 4) return "default";
    return "destructive";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return "Easy";
    if (difficulty <= 4) return "Medium";
    return "Hard";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Maps Management
          </CardTitle>
          <CardDescription>
            Loading learning maps...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading maps...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Maps Management
          </CardTitle>
          <CardDescription>
            View and manage all learning maps on the platform. You can view map details and delete maps as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="maps-search" className="text-sm font-medium">Search Maps</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="maps-search"
                  placeholder="Search by title, creator, category, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            <div className="md:w-40">
              <Label htmlFor="visibility-filter" className="text-sm font-medium">Visibility</Label>
              <Select value={selectedVisibility} onValueChange={setSelectedVisibility}>
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="All visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:w-40">
              <Label htmlFor="difficulty-filter" className="text-sm font-medium">Difficulty</Label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="All difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All difficulty</SelectItem>
                  <SelectItem value="1">1 - Beginner</SelectItem>
                  <SelectItem value="2">2 - Easy</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Hard</SelectItem>
                  <SelectItem value="5">5 - Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Results summary */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredMaps.length} of {maps.length} maps
              {searchTerm && ` matching "${searchTerm}"`}
              {selectedVisibility !== "all" && ` with visibility "${selectedVisibility}"`}
              {selectedDifficulty !== "all" && ` with difficulty ${selectedDifficulty}`}
            </p>
          </div>

          {/* Maps Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaps.map((map) => (
                  <TableRow key={map.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{map.title}</div>
                        {map.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {map.description}
                          </div>
                        )}
                        {map.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {map.category}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {map.creator_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getVisibilityBadgeVariant(map.visibility)}
                        className="capitalize"
                      >
                        {map.visibility}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getDifficultyBadgeVariant(map.difficulty)}
                        className="text-xs"
                      >
                        {getDifficultyLabel(map.difficulty)} ({map.difficulty})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {map.node_count} nodes
                        {map.node_count > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Avg: {getDifficultyLabel(map.avg_difficulty)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(map.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-primary/10"
                          onClick={() => {
                            // Could open a map detail dialog or navigate to map view
                            toast({
                              title: "Map Details",
                              description: `Map: ${map.title} (${map.node_count} nodes)`,
                            });
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-destructive/10 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteMap(map)}
                          disabled={deleting === map.id}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {deleting === map.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMaps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No maps found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Learning Map</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Are you sure you want to delete the map &quot;{mapToDelete?.title}&quot;? 
                  This action cannot be undone and will permanently delete:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>The map and all its nodes ({mapToDelete?.node_count || 0} nodes)</li>
                  <li>All student progress data</li>
                  <li>All assessments and submissions</li>
                  <li>Any team assignments related to this map</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting !== null}
            >
              {deleting ? "Deleting..." : "Delete Map"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}