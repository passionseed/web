"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { getMapWithNodes, updateMap, deleteMap, FullLearningMap, batchUpdateMap, BatchMapUpdate } from "@/lib/supabase/maps";
import { MapCategory } from "@/types/map";
import { Loader2, Trash2, ArrowLeft, RefreshCw, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Loading from "./loading";
import { MapEditor } from "@/components/map/MapEditor";
import { RawDataView } from "@/components/map/RawDataView";

export default function EditMapPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const mapId = params.id as string;

  const [initialMap, setInitialMap] = useState<FullLearningMap | null>(null);
  const [map, setMap] = useState<FullLearningMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSavingAll, setIsSavingAll] = useState(false);

  const fetchMap = useCallback(async () => {
    try {
      const fetchedMap = await getMapWithNodes(mapId);
      if (fetchedMap) {
        setInitialMap(JSON.parse(JSON.stringify(fetchedMap))); // Deep copy for initial state
        setMap(fetchedMap);
      } else {
        toast({ title: "Map not found", variant: "destructive" });
        router.push("/map");
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load map data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [mapId, router, toast]);

  useEffect(() => {
    setIsLoading(true);
    fetchMap();
  }, [fetchMap]);

  const handleRefresh = () => {
      startRefreshTransition(() => {
          fetchMap();
          toast({ title: "Data Refreshed", description: "Latest map data has been loaded." });
      });
  };

  const handleReset = () => {
      if (initialMap) {
          setMap(JSON.parse(JSON.stringify(initialMap)));
          toast({ title: "Changes Reset", description: "All local changes have been discarded." });
      }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!map || !initialMap) return false;
    return JSON.stringify(map) !== JSON.stringify(initialMap);
  }, [map, initialMap]);

  // Generate batch update object from differences
  const generateBatchUpdate = useCallback((): BatchMapUpdate => {
    if (!map || !initialMap) {
      return {
        map: {},
        nodes: { create: [], update: [], delete: [] },
        paths: { create: [], delete: [] },
        content: { create: [], update: [], delete: [] },
        assessments: { create: [], update: [], delete: [] },
        quizQuestions: { create: [], update: [], delete: [] }
      };
    }

    const batchUpdate: BatchMapUpdate = {
      map: {},
      nodes: { create: [], update: [], delete: [] },
      paths: { create: [], delete: [] },
      content: { create: [], update: [], delete: [] },
      assessments: { create: [], update: [], delete: [] },
      quizQuestions: { create: [], update: [], delete: [] }
    };

    // Check for map-level changes
    const mapChanges: Partial<FullLearningMap> = {};
    if (map.title !== initialMap.title) mapChanges.title = map.title;
    if (map.description !== initialMap.description) mapChanges.description = map.description;
    if (map.difficulty !== initialMap.difficulty) mapChanges.difficulty = map.difficulty;
    if (map.category !== initialMap.category) mapChanges.category = map.category;
    batchUpdate.map = mapChanges;

    // Check for node changes
    const initialNodeMap = new Map(initialMap.map_nodes.map(n => [n.id, n]));
    const currentNodeMap = new Map(map.map_nodes.map(n => [n.id, n]));

    // Find created nodes (temporary IDs)
    map.map_nodes.forEach(node => {
      if (node.id.startsWith('temp_node_')) {
        batchUpdate.nodes.create.push({
          map_id: map.id,
          title: node.title,
          instructions: node.instructions,
          difficulty: node.difficulty,
          sprite_url: node.sprite_url,
          metadata: node.metadata
        });
      }
    });

    // Find deleted nodes
    initialMap.map_nodes.forEach(node => {
      if (!currentNodeMap.has(node.id)) {
        batchUpdate.nodes.delete.push(node.id);
      }
    });

    // Find updated nodes
    map.map_nodes.forEach(node => {
      if (!node.id.startsWith('temp_') && initialNodeMap.has(node.id)) {
        const initialNode = initialNodeMap.get(node.id)!;
        if (JSON.stringify(node) !== JSON.stringify(initialNode)) {
          batchUpdate.nodes.update.push({
            id: node.id,
            title: node.title,
            instructions: node.instructions,
            difficulty: node.difficulty,
            sprite_url: node.sprite_url,
            metadata: node.metadata
          });
        }
      }
    });

    // Handle path changes
    const allInitialPaths = initialMap.map_nodes.flatMap(node => node.node_paths_source);
    const allCurrentPaths = map.map_nodes.flatMap(node => node.node_paths_source);
    
    // Find created paths (temporary IDs)
    allCurrentPaths.forEach(path => {
      if (path.id.startsWith('temp_')) {
        batchUpdate.paths.create.push({
          source_node_id: path.source_node_id,
          destination_node_id: path.destination_node_id
        });
      }
    });
    
    // Find deleted paths
    allInitialPaths.forEach(path => {
      const pathExists = allCurrentPaths.some(p => p.id === path.id);
      if (!pathExists && !path.id.startsWith('temp_')) {
        batchUpdate.paths.delete.push(path.id);
      }
    });

    // Handle content changes
    map.map_nodes.forEach(node => {
      const initialNode = initialNodeMap.get(node.id);
      
      // For new nodes (temp IDs), handle their content as new content
      if (!initialNode && node.id.startsWith('temp_node_')) {
        const currentContent = node.node_content || [];
        currentContent.forEach(content => {
          if (content.id) {
            batchUpdate.content.create.push({
              node_id: node.id, // This will be updated to real node ID after node creation
              content_type: content.content_type,
              content_url: content.content_url,
              content_body: content.content_body
            });
          }
        });
        return;
      }
      
      if (!initialNode) return; // Skip other cases
      
      const initialContent = initialNode.node_content || [];
      const currentContent = node.node_content || [];
      
      // Find created content
      currentContent.forEach(content => {
        if (content.id && content.id.startsWith('temp_')) {
          batchUpdate.content.create.push({
            node_id: node.id,
            content_type: content.content_type,
            content_url: content.content_url,
            content_body: content.content_body
          });
        }
      });
      
      // Find deleted content
      initialContent.forEach(content => {
        const contentExists = currentContent.some(c => c.id === content.id);
        if (!contentExists) {
          batchUpdate.content.delete.push(content.id);
        }
      });
      
      // Find updated content
      currentContent.forEach(content => {
        if (!content.id || content.id.startsWith('temp_')) return;
        
        const initialContentItem = initialContent.find(c => c.id === content.id);
        if (initialContentItem && JSON.stringify(content) !== JSON.stringify(initialContentItem)) {
          batchUpdate.content.update.push({
            id: content.id,
            content_type: content.content_type,
            content_url: content.content_url,
            content_body: content.content_body
          });
        }
      });
    });

    // Handle assessment changes (similar pattern)
    map.map_nodes.forEach(node => {
      const initialNode = initialNodeMap.get(node.id);
      
      // For new nodes (temp IDs), handle their assessments as new assessments
      if (!initialNode && node.id.startsWith('temp_node_')) {
        const currentAssessments = node.node_assessments || [];
        currentAssessments.forEach(assessment => {
          if (assessment.id) {
            batchUpdate.assessments.create.push({
              node_id: node.id, // This will be updated to real node ID after node creation
              assessment_type: assessment.assessment_type
            });
            
            // Handle quiz questions for new assessments
            if (assessment.quiz_questions) {
              assessment.quiz_questions.forEach(question => {
                if (question.id) {
                  batchUpdate.quizQuestions.create.push({
                    assessment_id: assessment.id, // This will need to be mapped to real assessment ID
                    question_text: question.question_text,
                    question_options: question.question_options,
                    correct_answer: question.correct_answer,
                    explanation: question.explanation
                  });
                }
              });
            }
          }
        });
        return;
      }
      
      if (!initialNode) return;
      
      const initialAssessments = initialNode.node_assessments || [];
      const currentAssessments = node.node_assessments || [];
      
      // Find created assessments
      currentAssessments.forEach(assessment => {
        if (assessment.id && assessment.id.startsWith('temp_')) {
          batchUpdate.assessments.create.push({
            node_id: node.id,
            assessment_type: assessment.assessment_type
          });
        }
      });
      
      // Find deleted assessments
      initialAssessments.forEach(assessment => {
        const assessmentExists = currentAssessments.some(a => a.id === assessment.id);
        if (!assessmentExists) {
          batchUpdate.assessments.delete.push(assessment.id);
        }
      });
    });

    return batchUpdate;
  }, [map, initialMap]);

  const handleSaveAll = async () => {
    if (!map || !hasUnsavedChanges) return;

    setIsSavingAll(true);
    try {
      const batchUpdate = generateBatchUpdate();
      
      // Debug logging
      console.log('Batch update payload:', batchUpdate);
      
      await batchUpdateMap(mapId, batchUpdate);
      
      // Refresh data after save
      const updatedMap = await getMapWithNodes(mapId);
      if (updatedMap) {
        setInitialMap(JSON.parse(JSON.stringify(updatedMap)));
        setMap(updatedMap);
      }
      
      toast({ 
        title: "All Changes Saved", 
        description: "Your map has been successfully updated." 
      });
    } catch (error) {
      console.error('Batch save error:', error);
      toast({ 
        title: "Error Saving Changes", 
        description: `Failed to save your changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive" 
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!map || !map.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedMap = await updateMap(mapId, { title: map.title, description: map.description });
      setInitialMap(JSON.parse(JSON.stringify({ ...map, ...updatedMap }))); // Update initial state on save
      toast({ title: "Map Updated", description: "Your changes have been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update map.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMap(mapId);
      toast({ title: "Map Deleted", description: `The map "${map?.title}" has been removed.` });
      router.push("/map");
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete map.", variant: "destructive" });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!map || !initialMap) {
    return null; 
  }

  return (
    <div className="container max-w-7xl py-8 space-y-4">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold">Map Editor</h1>
                {hasUnsavedChanges && (
                    <p className="text-sm text-orange-600 mt-1">
                        ⚠️ You have unsaved changes
                    </p>
                )}
            </div>
            <div className="flex gap-2">
                <Button asChild variant="outline">
                    <Link href={`/map/${mapId}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Viewer
                    </Link>
                </Button>
                <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
        </div>
        
        <Card>
            <CardHeader>
            <CardTitle>Map Settings</CardTitle>
            <CardDescription>
                Modify the general details of your map.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Map Title</Label>
                        <Input
                            id="title"
                            value={map.title}
                            onChange={(e) => setMap(prev => prev ? {...prev, title: e.target.value} : null)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                            value={map.category || ''}
                            onValueChange={(value: MapCategory) => setMap(prev => prev ? {...prev, category: value} : null)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ai">AI</SelectItem>
                                <SelectItem value="3d">3D</SelectItem>
                                <SelectItem value="unity">Unity</SelectItem>
                                <SelectItem value="hacking">Hacking</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={map.description || ''}
                            onChange={(e) => setMap(prev => prev ? {...prev, description: e.target.value} : null)}
                            className="min-h-[60px]"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="difficulty">Overall Difficulty: {map.difficulty || 1}</Label>
                        <Slider
                            id="difficulty"
                            min={1}
                            max={10}
                            step={1}
                            value={[map.difficulty || 1]}
                            onValueChange={(value) => setMap(prev => prev ? {...prev, difficulty: value[0]} : null)}
                            disabled={isSubmitting}
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete Map
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the learning map and all of its associated data (nodes, paths, etc.).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                    ) : (
                    "Save Changes"
                    )}
                </Button>
                </div>
            </form>
            </CardContent>
        </Card>

        <Tabs defaultValue="editor">
            <TabsList>
                <TabsTrigger value="editor">Visual Editor</TabsTrigger>
                <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Map Editor</CardTitle>
                        <CardDescription>
                            Add, connect, and edit the nodes of your learning map. Select a node to edit its details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent style={{ height: '70vh' }}>
                        <MapEditor map={map} onMapChange={setMap} />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="raw" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Raw Data Diff</CardTitle>
                        <CardDescription>
                            This shows the difference between your current local edits and the last saved version of the map.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RawDataView 
                            currentData={map} 
                            initialData={initialMap} 
                            onRefresh={handleRefresh}
                            onReset={handleReset}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {/* Unified Save Button */}
        {hasUnsavedChanges && (
            <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Unsaved Changes</h3>
                            <p className="text-sm text-muted-foreground">
                                You have unsaved changes to your map. Save them to persist to the database.
                            </p>
                        </div>
                        <Button 
                            onClick={handleSaveAll} 
                            disabled={isSavingAll}
                            size="lg"
                            className="min-w-[120px]"
                        >
                            {isSavingAll ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save All Changes
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
  );
}

