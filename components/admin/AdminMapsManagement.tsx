"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MapsResponse {
  maps: AdminMap[];
  pagination: PaginationInfo;
}

export function AdminMapsManagement({ onDataReload }: AdminMapsManagementProps) {
  const router = useRouter();
  const [maps, setMaps] = useState<AdminMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisibility, setSelectedVisibility] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [mapToDelete, setMapToDelete] = useState<AdminMap | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMaps, setSelectedMaps] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{current: number, total: number, currentMap: string} | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
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

  const loadMaps = async (page: number = 1, limit: number = 50) => {
    try {
      setLoading(true);
      console.log("🔄 [Admin Frontend] Loading maps page", page, "with limit", limit);
      
      const url = `/api/admin/maps?page=${page}&limit=${limit}`;
      console.log("📡 [Admin Frontend] Fetching:", url);
      
      const response = await fetch(url);
      
      console.log("📡 [Admin Frontend] Response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });
      
      if (response.ok) {
        const data: MapsResponse = await response.json();
        console.log("✅ [Admin Frontend] Successfully loaded data:", {
          mapsCount: data.maps?.length,
          pagination: data.pagination
        });
        
        setMaps(data.maps || []);
        setPagination(data.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        });
      } else {
        // Get detailed error information
        let errorData;
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType?.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = { error: await response.text() };
          }
        } catch {
          errorData = { error: `HTTP ${response.status} ${response.statusText}` };
        }
        
        console.error("❌ [Admin Frontend] API Error:", {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status} ${response.statusText}`;
        
        // Handle authentication errors specifically
        if (response.status === 403) {
          setAuthError("Authentication required. Please log in as an admin user to access this page.");
          return; // Don't throw, just set auth error state
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("❌ [Admin Frontend] Error loading maps:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      toast({
        title: "Failed to Load Maps",
        description: (
          <div className="space-y-2">
            <p>Could not load learning maps from the server.</p>
            <p className="text-xs text-muted-foreground font-mono">{errorMessage}</p>
          </div>
        ),
        variant: "destructive",
      });
      
      // Set empty state instead of leaving in limbo
      setMaps([]);
      setPagination({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
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
      const mapsToDelete = maps.filter(m => selectedMaps.has(m.id));
      
      console.log("🗑️ [Admin] Starting sequential deletion of", mapIds.length, "maps");
      
      let successCount = 0;
      let failureCount = 0;
      const failures: string[] = [];

      // Process maps one by one for server compatibility
      for (let i = 0; i < mapsToDelete.length; i++) {
        const map = mapsToDelete[i];
        setBulkDeleteProgress({
          current: i + 1,
          total: mapsToDelete.length,
          currentMap: map.title
        });

        try {
          console.log(`🗑️ [${i + 1}/${mapsToDelete.length}] Deleting map:`, map.title);
          
          const response = await fetch(`/api/admin/maps/${map.id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          });
          
          if (response.ok) {
            successCount++;
            // Remove from local state immediately for better UX
            setMaps(prevMaps => prevMaps.filter(m => m.id !== map.id));
            console.log(`✅ [${i + 1}/${mapsToDelete.length}] Successfully deleted:`, map.title);
          } else {
            failureCount++;
            failures.push(map.title);
            const errorText = await response.text();
            console.error(`❌ [${i + 1}/${mapsToDelete.length}] Failed to delete ${map.title}:`, errorText);
          }
        } catch (error) {
          failureCount++;
          failures.push(map.title);
          console.error(`❌ [${i + 1}/${mapsToDelete.length}] Error deleting ${map.title}:`, error);
        }

        // Small delay to be nice to the server
        if (i < mapsToDelete.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Show comprehensive results
      if (successCount > 0 && failureCount === 0) {
        toast({
          title: "All Maps Deleted Successfully",
          description: `Successfully deleted all ${successCount} selected maps`,
        });
      } else if (successCount > 0 && failureCount > 0) {
        toast({
          title: "Partial Success",
          description: (
            <div className="space-y-1">
              <p>Successfully deleted {successCount} of {successCount + failureCount} maps</p>
              <p className="text-xs text-muted-foreground">
                Failed: {failures.slice(0, 3).join(', ')}{failures.length > 3 ? ` +${failures.length - 3} more` : ''}
              </p>
            </div>
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deletion Failed",
          description: `Failed to delete any of the ${failureCount} selected maps`,
          variant: "destructive",
        });
      }
      
      // Clear selection and reload if needed
      setSelectedMaps(new Set());
      if (successCount > 0) {
        onDataReload?.();
        // Reload current page to refresh counts
        loadMaps(pagination.page, pagination.limit);
      }
      
    } catch (error) {
      console.error("Error in sequential bulk delete:", error);
      toast({
        title: "Bulk Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete maps",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
      setBulkDeleteProgress(null);
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

  // Pagination helpers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadMaps(newPage, pagination.limit);
    }
  };

  const renderPaginationControls = () => {
    if (pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} maps
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={pagination.page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {/* Show page numbers around current page */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="h-8 w-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.page === pagination.totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Skeleton UI for better loading experience
  const renderSkeleton = () => (
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
        {/* Search and Filter Skeleton */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-20 mb-2"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
          <div className="md:w-40">
            <div className="h-4 bg-muted rounded w-16 mb-2"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
          <div className="md:w-40">
            <div className="h-4 bg-muted rounded w-16 mb-2"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="mb-4">
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>

        {/* Table Skeleton */}
        <div className="rounded-md border">
          <div className="p-4 border-b">
            <div className="flex gap-4">
              <div className="h-4 bg-muted rounded w-8"></div>
              <div className="h-4 bg-muted rounded w-32"></div>
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-4 bg-muted rounded w-16"></div>
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 bg-muted rounded w-20"></div>
            </div>
          </div>
          {/* Skeleton rows */}
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="p-4 border-b">
              <div className="flex gap-4 items-center">
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-3 bg-muted/70 rounded w-32"></div>
                </div>
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
                <div className="h-6 bg-muted rounded w-20"></div>
                <div className="h-4 bg-muted rounded w-16"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-muted rounded"></div>
                  <div className="h-8 w-16 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between px-2 py-4">
          <div className="h-4 bg-muted rounded w-48"></div>
          <div className="flex items-center space-x-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="h-8 w-8 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show authentication error state
  if (authError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Maps Management
          </CardTitle>
          <CardDescription>
            Administrative access to learning maps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold">Authentication Required</h3>
              <p className="text-muted-foreground max-w-md">
                {authError}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push('/auth/signin')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Sign In
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return renderSkeleton();
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
          
          {/* Pagination Controls */}
          {renderPaginationControls()}
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
                {bulkDeleteProgress ? (
                  // Show progress during deletion
                  <div className="space-y-4">
                    <p className="font-medium">
                      Deleting maps ({bulkDeleteProgress.current} of {bulkDeleteProgress.total})
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current: {bulkDeleteProgress.currentMap}</span>
                        <span>{Math.round((bulkDeleteProgress.current / bulkDeleteProgress.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Please wait while maps are being deleted one by one...
                    </div>
                  </div>
                ) : (
                  // Show confirmation before deletion
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Maps will be deleted one by one for server compatibility</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      <span>This will affect all students who have interacted with these maps</span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!bulkDeleting && (
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
            >
              {bulkDeleting 
                ? (bulkDeleteProgress 
                    ? `Deleting ${bulkDeleteProgress.current}/${bulkDeleteProgress.total}...` 
                    : "Starting...")
                : `Delete ${selectedMaps.size} Maps`
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}