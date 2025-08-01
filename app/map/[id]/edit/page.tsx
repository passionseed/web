"use client";

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useMemo,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  getMapWithNodes,
  updateMap,
  deleteMap,
  FullLearningMap,
  batchUpdateMap,
  BatchMapUpdate,
} from "@/lib/supabase/maps";
import { MapCategory } from "@/types/map";
import { Loader2, Trash2, ArrowLeft, RefreshCw, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      toast({
        title: "Error",
        description: "Failed to load map data.",
        variant: "destructive",
      });
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
      toast({
        title: "Data Refreshed",
        description: "Latest map data has been loaded.",
      });
    });
  };

  const handleReset = () => {
    if (initialMap) {
      setMap(JSON.parse(JSON.stringify(initialMap)));
      toast({
        title: "Changes Reset",
        description: "All local changes have been discarded.",
      });
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!map || !initialMap) return false;
    return JSON.stringify(map) !== JSON.stringify(initialMap);
  }, [map, initialMap]);

  const handleSaveAll = async () => {
    if (!map || !hasUnsavedChanges) {
      console.log("❌ Save aborted - no map or no changes", {
        map: !!map,
        hasUnsavedChanges,
      });
      return;
    }

    console.log("🚀 Starting save process...");
    console.log("📊 Current map state:", JSON.stringify(map, null, 2));
    console.log("📊 Initial map state:", JSON.stringify(initialMap, null, 2));

    setIsSavingAll(true);
    try {
      const batchUpdate = generateBatchUpdate();

      console.log(
        "📦 Generated batch update:",
        JSON.stringify(batchUpdate, null, 2)
      );

      // Validate batch update before sending
      if (!batchUpdate) {
        throw new Error(
          "Failed to generate batch update - returned null/undefined"
        );
      }

      // Check if there are actually changes to save
      const hasChanges =
        Object.keys(batchUpdate.map).length > 0 ||
        batchUpdate.nodes.create.length > 0 ||
        batchUpdate.nodes.update.length > 0 ||
        batchUpdate.nodes.delete.length > 0 ||
        batchUpdate.paths.create.length > 0 ||
        batchUpdate.paths.delete.length > 0 ||
        batchUpdate.content.create.length > 0 ||
        batchUpdate.content.update.length > 0 ||
        batchUpdate.content.delete.length > 0 ||
        batchUpdate.assessments.create.length > 0 ||
        batchUpdate.assessments.update.length > 0 ||
        batchUpdate.assessments.delete.length > 0;

      if (!hasChanges) {
        console.log("ℹ️ No actual changes detected in batch update");
        toast({
          title: "No Changes to Save",
          description: "All data is already up to date.",
        });
        return;
      }

      console.log("📨 Sending batch update to server...");
      console.log("🎯 Map ID:", mapId);

      // Add timeout to catch hanging requests
      const savePromise = batchUpdateMap(mapId, batchUpdate);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Save operation timed out after 30 seconds")),
          30000
        );
      });

      await Promise.race([savePromise, timeoutPromise]);

      console.log("✅ Batch update completed successfully");

      // Refresh data after save with detailed logging
      console.log("🔄 Refreshing map data after save...");
      const updatedMap = await getMapWithNodes(mapId);

      if (!updatedMap) {
        throw new Error("Failed to fetch updated map data after save");
      }

      console.log("📊 Updated map data:", JSON.stringify(updatedMap, null, 2));

      // Update state with fresh data
      const newInitialMap = JSON.parse(JSON.stringify(updatedMap));
      setInitialMap(newInitialMap);
      setMap(updatedMap);

      console.log("✅ State updated with fresh data");

      toast({
        title: "All Changes Saved Successfully",
        description: "Your map has been updated and refreshed.",
      });
    } catch (error) {
      console.error("❌ Batch save failed:", error);
      console.error("❌ Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause,
      });

      // Try to determine the specific failure point
      let errorMessage = "Unknown error occurred";
      let troubleshooting = "";

      if (error instanceof Error) {
        errorMessage = error.message;

        if (error.message.includes("timeout")) {
          troubleshooting =
            "The save operation took too long. Check your network connection.";
        } else if (error.message.includes("constraint")) {
          troubleshooting =
            "Database constraint violation. Some data may be invalid.";
        } else if (error.message.includes("permission")) {
          troubleshooting = "Permission denied. Check if you have edit access.";
        } else if (error.message.includes("network")) {
          troubleshooting = "Network error. Check your internet connection.";
        } else {
          troubleshooting = "Check the console for detailed error information.";
        }
      }

      toast({
        title: "Save Failed",
        description: `${errorMessage}. ${troubleshooting}`,
        variant: "destructive",
      });

      // Don't reset the saving state immediately to prevent rapid retry attempts
      setTimeout(() => setIsSavingAll(false), 2000);
      return;
    }

    setIsSavingAll(false);
  };

  // Generate batch update object from differences
  const generateBatchUpdate = useCallback((): BatchMapUpdate => {
    console.log("🔧 Generating batch update...");

    if (!map || !initialMap) {
      console.error("❌ Cannot generate batch update - missing map data", {
        map: !!map,
        initialMap: !!initialMap,
      });
      throw new Error("Missing map or initialMap data");
    }

    const batchUpdate: BatchMapUpdate = {
      map: {},
      nodes: { create: [], update: [], delete: [] },
      paths: { create: [], delete: [] },
      content: { create: [], update: [], delete: [] },
      assessments: { create: [], update: [], delete: [] },
      quizQuestions: { create: [], update: [], delete: [] },
    };

    try {
      // Check for map-level changes
      console.log("🔍 Checking map-level changes...");
      const mapChanges: Partial<FullLearningMap> = {};
      if (map.title !== initialMap.title) {
        mapChanges.title = map.title;
        console.log("📝 Map title changed:", {
          from: initialMap.title,
          to: map.title,
        });
      }
      if (map.description !== initialMap.description) {
        mapChanges.description = map.description;
        console.log("📝 Map description changed");
      }
      if (map.difficulty !== initialMap.difficulty) {
        mapChanges.difficulty = map.difficulty;
        console.log("📝 Map difficulty changed:", {
          from: initialMap.difficulty,
          to: map.difficulty,
        });
      }
      if (map.category !== initialMap.category) {
        mapChanges.category = map.category;
        console.log("📝 Map category changed:", {
          from: initialMap.category,
          to: map.category,
        });
      }
      batchUpdate.map = mapChanges;

      // Check for node changes
      console.log("🔍 Checking node changes...");
      const initialNodeMap = new Map(
        initialMap.map_nodes.map((n) => [n.id, n])
      );
      const currentNodeMap = new Map(map.map_nodes.map((n) => [n.id, n]));

      console.log("📊 Node comparison:", {
        initialNodes: initialMap.map_nodes.length,
        currentNodes: map.map_nodes.length,
        initialNodeIds: Array.from(initialNodeMap.keys()),
        currentNodeIds: Array.from(currentNodeMap.keys()),
      });

      // Find deleted nodes - IMPORTANT: Only include real nodes (not temp)
      const deletedNodes = initialMap.map_nodes.filter(
        (node) => !currentNodeMap.has(node.id) && !node.id.startsWith("temp_")
      );
      console.log(
        "🗑️ Deleted nodes:",
        deletedNodes.length,
        deletedNodes.map((n) => ({ id: n.id, title: n.title }))
      );

      deletedNodes.forEach((node) => {
        batchUpdate.nodes.delete.push(node.id);
        console.log("🗑️ Adding node to delete:", node.id);
      });

      // Find created nodes (temporary IDs)
      const createdNodes = map.map_nodes.filter((node) =>
        node.id.startsWith("temp_node_")
      );
      console.log(
        "➕ Created nodes:",
        createdNodes.length,
        createdNodes.map((n) => ({ id: n.id, title: n.title }))
      );

      createdNodes.forEach((node) => {
        const nodeToCreate = {
          map_id: map.id,
          title: node.title,
          instructions: node.instructions,
          difficulty: node.difficulty,
          sprite_url: node.sprite_url,
          metadata: node.metadata,
        };
        batchUpdate.nodes.create.push(nodeToCreate);
        console.log("➕ Adding node to create:", nodeToCreate);
      });

      // Find updated nodes (exclude temp nodes and only real changes)
      const updatedNodes = map.map_nodes.filter((node) => {
        if (node.id.startsWith("temp_")) return false;
        const initialNode = initialNodeMap.get(node.id);
        if (!initialNode) return false;

        const nodeChanged =
          node.title !== initialNode.title ||
          node.instructions !== initialNode.instructions ||
          node.difficulty !== initialNode.difficulty ||
          node.sprite_url !== initialNode.sprite_url ||
          JSON.stringify(node.metadata) !==
            JSON.stringify(initialNode.metadata);

        return nodeChanged;
      });

      console.log(
        "📝 Updated nodes:",
        updatedNodes.length,
        updatedNodes.map((n) => ({ id: n.id, title: n.title }))
      );

      updatedNodes.forEach((node) => {
        const nodeToUpdate = {
          id: node.id,
          title: node.title,
          instructions: node.instructions,
          difficulty: node.difficulty,
          sprite_url: node.sprite_url,
          metadata: node.metadata,
        };
        batchUpdate.nodes.update.push(nodeToUpdate);
        console.log("📝 Adding node to update:", nodeToUpdate);
      });

      // Handle path changes with better validation
      console.log("🔍 Checking path changes...");
      const allInitialPaths = initialMap.map_nodes
        .flatMap((node) => node.node_paths_source || [])
        .filter(Boolean);
      const allCurrentPaths = map.map_nodes
        .flatMap((node) => node.node_paths_source || [])
        .filter(Boolean);

      console.log("📊 Path comparison:", {
        initialPaths: allInitialPaths.length,
        currentPaths: allCurrentPaths.length,
        initialPathIds: allInitialPaths.map((p) => p.id),
        currentPathIds: allCurrentPaths.map((p) => p.id),
      });

      // Find deleted paths (exclude temp paths and paths connected to deleted nodes)
      const deletedPaths = allInitialPaths.filter((path) => {
        if (path.id.startsWith("temp_")) return false;

        // Don't add to delete list if connected nodes are being deleted (cascade will handle it)
        const sourceNodeDeleted = batchUpdate.nodes.delete.includes(
          path.source_node_id
        );
        const destNodeDeleted = batchUpdate.nodes.delete.includes(
          path.destination_node_id
        );
        if (sourceNodeDeleted || destNodeDeleted) return false;

        return !allCurrentPaths.some((p) => p.id === path.id);
      });
      console.log("🗑️ Deleted paths:", deletedPaths.length, deletedPaths);

      deletedPaths.forEach((path) => {
        batchUpdate.paths.delete.push(path.id);
        console.log("🗑️ Adding path to delete:", path.id);
      });

      // Find created paths (temporary IDs)
      const createdPaths = allCurrentPaths.filter((path) =>
        path.id.startsWith("temp_")
      );
      console.log("➕ Created paths:", createdPaths.length, createdPaths);

      createdPaths.forEach((path) => {
        if (path.source_node_id && path.destination_node_id) {
          const pathToCreate = {
            source_node_id: path.source_node_id,
            destination_node_id: path.destination_node_id,
          };
          batchUpdate.paths.create.push(pathToCreate);
          console.log("➕ Adding path to create:", pathToCreate);
        } else {
          console.warn("⚠️ Invalid path found:", path);
        }
      });

      // Handle content changes for each node
      console.log("🔍 Checking content changes...");
      map.map_nodes.forEach((node) => {
        const initialNode = initialNodeMap.get(node.id);

        // For new nodes, add all their content as new
        if (node.id.startsWith("temp_node_")) {
          const nodeContent = node.node_content || [];
          console.log(
            `➕ Processing content for new node ${node.id}:`,
            nodeContent.length
          );

          nodeContent.forEach((content) => {
            if (
              content.content_type &&
              (content.content_url || content.content_body)
            ) {
              const contentToCreate = {
                node_id: node.id, // Will be mapped after node creation
                content_type: content.content_type,
                content_url: content.content_url,
                content_body: content.content_body,
              };
              batchUpdate.content.create.push(contentToCreate);
              console.log("➕ Adding content to create:", contentToCreate);
            }
          });
          return;
        }

        if (!initialNode) {
          console.warn("⚠️ No initial node found for:", node.id);
          return;
        }

        const initialContent = initialNode.node_content || [];
        const currentContent = node.node_content || [];

        console.log(`🔍 Checking content for node ${node.id}:`, {
          initial: initialContent.length,
          current: currentContent.length,
        });

        // Find created content (temp IDs)
        const createdContent = currentContent.filter((content) =>
          content.id?.startsWith("temp_")
        );
        console.log(
          `➕ Created content for node ${node.id}:`,
          createdContent.length
        );

        createdContent.forEach((content) => {
          if (
            content.content_type &&
            (content.content_url || content.content_body)
          ) {
            const contentToCreate = {
              node_id: node.id,
              content_type: content.content_type,
              content_url: content.content_url,
              content_body: content.content_body,
            };
            batchUpdate.content.create.push(contentToCreate);
            console.log("➕ Adding content to create:", contentToCreate);
          }
        });

        // Find deleted content (but not for nodes being deleted - cascade will handle it)
        if (!batchUpdate.nodes.delete.includes(node.id)) {
          const deletedContent = initialContent.filter(
            (content) =>
              !currentContent.some((c) => c.id === content.id) &&
              !content.id?.startsWith("temp_")
          );
          console.log(
            `🗑️ Deleted content for node ${node.id}:`,
            deletedContent.length
          );

          deletedContent.forEach((content) => {
            batchUpdate.content.delete.push(content.id);
            console.log("🗑️ Adding content to delete:", content.id);
          });
        }

        // Find updated content
        const updatedContent = currentContent.filter((content) => {
          if (!content.id || content.id.startsWith("temp_")) return false;

          const initialContentItem = initialContent.find(
            (c) => c.id === content.id
          );
          if (!initialContentItem) return false;

          return JSON.stringify(content) !== JSON.stringify(initialContentItem);
        });

        console.log(
          `📝 Updated content for node ${node.id}:`,
          updatedContent.length
        );

        updatedContent.forEach((content) => {
          const contentToUpdate = {
            id: content.id!,
            content_type: content.content_type,
            content_url: content.content_url,
            content_body: content.content_body,
          };
          batchUpdate.content.update.push(contentToUpdate);
          console.log("📝 Adding content to update:", contentToUpdate);
        });
      });

      // ---------- Assessment & Quiz Question Changes ----------
      console.log("🔍 Checking assessment changes...");
      map.map_nodes.forEach((node) => {
        const initialNode = initialNodeMap.get(node.id);
        const currentAssessment = node.node_assessments?.[0] || null;
        const initialAssessment = initialNode?.node_assessments?.[0] || null;

        // Created assessment
        if (!initialAssessment && currentAssessment) {
          const assessmentToCreate = {
            node_id: node.id,
            assessment_type: currentAssessment.assessment_type,
          };
          batchUpdate.assessments.create.push(assessmentToCreate);
          console.log("➕ Adding assessment to create:", assessmentToCreate);

          if (currentAssessment.assessment_type === "quiz") {
            (currentAssessment.quiz_questions || []).forEach((q) => {
              const questionToCreate = {
                assessment_id: currentAssessment.id,
                question_text: q.question_text,
                options: q.options,
                correct_option: q.correct_option,
              };
              batchUpdate.quizQuestions.create.push(questionToCreate);
              console.log("➕ Adding quiz question to create:", questionToCreate);
            });
          }
          return;
        }

        // Deleted assessment
        if (initialAssessment && !currentAssessment) {
          batchUpdate.assessments.delete.push(initialAssessment.id);
          console.log("🗑️ Adding assessment to delete:", initialAssessment.id);

          if (initialAssessment.assessment_type === "quiz") {
            (initialAssessment.quiz_questions || []).forEach((q) => {
              if (q.id && !q.id.startsWith("temp_")) {
                batchUpdate.quizQuestions.delete.push(q.id);
                console.log("🗑️ Adding quiz question to delete:", q.id);
              }
            });
          }
          return;
        }

        // Updated assessment type
        if (
          initialAssessment &&
          currentAssessment &&
          initialAssessment.assessment_type !== currentAssessment.assessment_type
        ) {
          const assessmentToUpdate = {
            id: initialAssessment.id,
            assessment_type: currentAssessment.assessment_type,
          };
          batchUpdate.assessments.update.push(assessmentToUpdate);
          console.log("📝 Adding assessment to update:", assessmentToUpdate);
        }

        // Handle quiz questions if quiz type
        if (
          currentAssessment?.assessment_type === "quiz" &&
          initialAssessment?.assessment_type === "quiz"
        ) {
          const initialQuestions = initialAssessment.quiz_questions || [];
          const currentQuestions = currentAssessment.quiz_questions || [];

          // Created questions
          currentQuestions
            .filter((q) => q.id?.startsWith("temp_"))
            .forEach((q) => {
              const questionToCreate = {
                assessment_id: currentAssessment.id,
                question_text: q.question_text,
                options: q.options,
                correct_option: q.correct_option,
              };
              batchUpdate.quizQuestions.create.push(questionToCreate);
              console.log("➕ Adding quiz question to create:", questionToCreate);
            });

          // Deleted questions
          initialQuestions
            .filter((iq) => !currentQuestions.some((cq) => cq.id === iq.id))
            .forEach((iq) => {
              if (iq.id && !iq.id.startsWith("temp_")) {
                batchUpdate.quizQuestions.delete.push(iq.id);
                console.log("🗑️ Adding quiz question to delete:", iq.id);
              }
            });

          // Updated questions
          currentQuestions
            .filter((cq) => {
              if (!cq.id || cq.id.startsWith("temp_")) return false;
              const iq = initialQuestions.find((q) => q.id === cq.id);
              if (!iq) return false;
              return JSON.stringify(cq) !== JSON.stringify(iq);
            })
            .forEach((cq) => {
              const questionToUpdate = {
                id: cq.id!,
                question_text: cq.question_text,
                options: cq.options,
                correct_option: cq.correct_option,
              };
              batchUpdate.quizQuestions.update.push(questionToUpdate);
              console.log("📝 Adding quiz question to update:", questionToUpdate);
            });
        }
      });

      console.log("✅ Batch update generation completed");
      console.log("📊 Final batch update summary:", {
        mapChanges: Object.keys(batchUpdate.map).length,
        nodesToCreate: batchUpdate.nodes.create.length,
        nodesToUpdate: batchUpdate.nodes.update.length,
        nodesToDelete: batchUpdate.nodes.delete.length,
        pathsToCreate: batchUpdate.paths.create.length,
        pathsToDelete: batchUpdate.paths.delete.length,
        contentToCreate: batchUpdate.content.create.length,
        contentToUpdate: batchUpdate.content.update.length,
        contentToDelete: batchUpdate.content.delete.length,
      });

      return batchUpdate;
    } catch (error) {
      console.error("❌ Error generating batch update:", error);
      throw new Error(
        `Failed to generate batch update: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, [map, initialMap]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!map || !map.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedMap = await updateMap(mapId, {
        title: map.title,
        description: map.description,
      });
      setInitialMap(JSON.parse(JSON.stringify({ ...map, ...updatedMap }))); // Update initial state on save
      toast({
        title: "Map Updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update map.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMap(mapId);
      toast({
        title: "Map Deleted",
        description: `The map "${map?.title}" has been removed.`,
      });
      router.push("/map");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete map.",
        variant: "destructive",
      });
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
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
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
                  onChange={(e) =>
                    setMap((prev) =>
                      prev ? { ...prev, title: e.target.value } : null
                    )
                  }
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={map.category || ""}
                  onValueChange={(value: MapCategory) =>
                    setMap((prev) =>
                      prev ? { ...prev, category: value } : null
                    )
                  }
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
                  value={map.description || ""}
                  onChange={(e) =>
                    setMap((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  className="min-h-[60px]"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">
                  Overall Difficulty: {map.difficulty || 1}
                </Label>
                <Slider
                  id="difficulty"
                  min={1}
                  max={10}
                  step={1}
                  value={[map.difficulty || 1]}
                  onValueChange={(value) =>
                    setMap((prev) =>
                      prev ? { ...prev, difficulty: value[0] } : null
                    )
                  }
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    type="button"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Map
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the learning map and all of its associated data (nodes,
                      paths, etc.).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Continue
                    </AlertDialogAction>
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
                Add, connect, and edit the nodes of your learning map. Select a
                node to edit its details.
              </CardDescription>
            </CardHeader>
            <CardContent style={{ height: "70vh" }}>
              <MapEditor map={map} onMapChange={setMap} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="raw" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Data Diff</CardTitle>
              <CardDescription>
                This shows the difference between your current local edits and
                the last saved version of the map.
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
        <Card className="border-orange-800 bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Unsaved Changes</h3>
                <p className="text-sm text-muted-foreground">
                  You have unsaved changes to your map. Save them to persist to
                  the database.
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
