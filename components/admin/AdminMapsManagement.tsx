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
  CheckSquare,
  Square,
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
  const [selectedMaps, setSelectedMaps] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
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

    // Capture the ID early to avoid race conditions
    const deletingMapId = mapToDelete.id;
    const deletingMapTitle = mapToDelete.title;

    try {
      console.log("🗑️ [Admin] Starting map deletion:", deletingMapId, deletingMapTitle);
      setDeleting(deletingMapId);
      
      const response = await fetch(`/api/admin/maps/${deletingMapId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("🔍 [Admin] Delete response status:", response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log("✅ [Admin] Delete successful:", result);
        
        // Show detailed success message with statistics
        const statsMessage = result.stats?.message || "Map and related data deleted";
        
        toast({
          title: "Map Deleted Successfully",
          description: (
            <div className="space-y-1">
              <p>{result.message}</p>
              <p className="text-xs text-muted-foreground">{statsMessage}</p>
            </div>
          ),
        });
        
        // Remove the deleted map from the list using captured ID
        console.log("🔄 [Admin] Updating maps state, removing:", deletingMapId);
        setMaps(prevMaps => {
          const filteredMaps = prevMaps.filter(m => m.id !== deletingMapId);
          console.log("📊 [Admin] Maps count before/after:", prevMaps.length, "→", filteredMaps.length);
          return filteredMaps;
        });
        onDataReload?.();
      } else {
        const errorText = await response.text();
        let errorMessage = "Failed to delete map";
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        console.error("❌ [Admin] Delete failed:", response.status, errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error deleting map:", error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete map",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setMapToDelete(null);
    }
  };

  const toggleMapSelection = (mapId: string) => {
    setSelectedMaps(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(mapId)) {
        newSelection.delete(mapId);
      } else {
        newSelection.add(mapId);
      }
      return newSelection;
    });
  };

  const toggleAllMaps = () => {
    if (selectedMaps.size === filteredMaps.length) {
      // If all filtered maps are selected, deselect all
      setSelectedMaps(new Set());
    } else {
      // Select all filtered maps
      setSelectedMaps(new Set(filteredMaps.map(map => map.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedMaps.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedMaps.size === 0) return;

    try {
      setBulkDeleting(true);
      const mapIds = Array.from(selectedMaps);
      
      console.log("🗑️ [Admin] Starting bulk deletion:", mapIds);
      
      const response = await fetch("/api/admin/maps/bulk-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mapIds }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("✅ [Admin] Bulk delete successful:", result);
        
        toast({
          title: "Maps Deleted Successfully",
          description: `Successfully deleted ${result.deletedCount} maps`,
        });
        
        // Remove deleted maps from the list
        setMaps(prevMaps => prevMaps.filter(m => !selectedMaps.has(m.id)));
        setSelectedMaps(new Set());
        onDataReload?.();
      } else {
        const errorText = await response.text();
        let errorMessage = "Failed to delete maps";
        let debugInfo = null;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
          debugInfo = errorJson.debugInfo || errorJson.details;
          
          // Log detailed error information for debugging
          console.error("❌ [Admin] Bulk delete failed:", {
            status: response.status,
            error: errorMessage,
            debugInfo,
            fullResponse: errorJson
          });
        } catch {
          console.error("❌ [Admin] Bulk delete failed:", response.status, errorText);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error bulk deleting maps:", error);
      toast({
        title: "Bulk Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete maps",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
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
          
          {/* Results summary and bulk actions */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredMaps.length} of {maps.length} maps
              {searchTerm && ` matching "${searchTerm}"`}
              {selectedVisibility !== "all" && ` with visibility "${selectedVisibility}"`}
              {selectedDifficulty !== "all" && ` with difficulty ${selectedDifficulty}`}
              {selectedMaps.size > 0 && ` • ${selectedMaps.size} selected`}
            </p>
            {selectedMaps.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="ml-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {bulkDeleting ? "Deleting..." : `Delete ${selectedMaps.size} Maps`}
              </Button>
            )}
          </div>

          {/* Maps Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={toggleAllMaps}
                    >
                      {selectedMaps.size === filteredMaps.length && filteredMaps.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleMapSelection(map.id)}
                      >
                        {selectedMaps.has(map.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                <p className="mb-3">
                  Are you sure you want to delete the map &quot;{mapToDelete?.title}&quot;? 
                  This action cannot be undone and will permanently delete:
                </p>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-3">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li className="font-medium">
                      The learning map and all {mapToDelete?.node_count || 0} nodes
                    </li>
                    <li>All node content (text, images, resources)</li>
                    <li>All assessments and quiz questions</li>
                    <li>All student progress and completion data</li>
                    <li>All assessment submissions and grades</li>
                    <li>All node connections and learning paths</li>
                  </ul>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span>This will affect all students who have interacted with this map</span>
                </div>
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Learning Maps</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  Are you sure you want to delete {selectedMaps.size} selected maps? 
                  This action cannot be undone and will permanently delete:
                </p>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-3">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li className="font-medium">
                      All {selectedMaps.size} learning maps and their nodes
                    </li>
                    <li>All node content (text, images, resources)</li>
                    <li>All assessments and quiz questions</li>
                    <li>All student progress and completion data</li>
                    <li>All assessment submissions and grades</li>
                    <li>All node connections and learning paths</li>
                  </ul>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span>This will affect all students who have interacted with these maps</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "Deleting..." : `Delete ${selectedMaps.size} Maps`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}