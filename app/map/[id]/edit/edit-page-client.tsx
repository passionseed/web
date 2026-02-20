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
  FullLearningMap,
  getMapWithNodes,
  updateMap,
  deleteMap,
  batchUpdateMap,
  BatchMapUpdate,
} from "@/lib/supabase/maps";
import { MapCategory } from "@/types/map";
import {
  Loader2,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Save,
  Upload,
  Sparkles,
  Eye,
} from "lucide-react";
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
import { MapEditorWithProvider as MapEditor } from "@/components/map/MapEditor";
import { RawDataView } from "@/components/map/RawDataView";
import { ImageUpload } from "@/components/map/ImageUpload";
import { CoverImageMaker } from "@/components/map/CoverImageMaker";
import { MapViewerWithProvider } from "@/components/map/MapViewer";

export default function EditMapPage({
  map: initialMapData,
  seedInfo,
}: {
  map?: FullLearningMap;
  seedInfo?: { id: string; seed_type: string } | null;
}) {
  console.log(
    "🚀🚀🚀 EDITMAP COMPONENT MOUNTING - THIS SHOULD ALWAYS APPEAR 🚀🚀🚀",
  );

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const mapId = params.id as string;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch path days if this is a PathLab seed
  useEffect(() => {
    async function fetchPathDays() {
      if (seedInfo?.seed_type === "pathlab" && seedInfo.id) {
        try {
          const response = await fetch(
            `/api/pathlab/days?seedId=${seedInfo.id}`,
          );
          if (response.ok) {
            const data = await response.json();
            setPathDays(data.days || []);
            setInitialPathDays(JSON.parse(JSON.stringify(data.days || [])));
            if (data.pathId) setPathId(data.pathId);
          }
        } catch (error) {
          console.error("Failed to fetch path days:", error);
        }
      }
    }
    fetchPathDays();
  }, [seedInfo]);

  const [initialMap, setInitialMap] = useState<FullLearningMap | null>(
    initialMapData ? JSON.parse(JSON.stringify(initialMapData)) : null,
  );
  const [map, setMap] = useState<FullLearningMap | null>(
    initialMapData || null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [mapResetKey, setMapResetKey] = useState(0); // Key to force MapEditor remount on reset
  const [pathDays, setPathDays] = useState<any[]>([]);
  const [initialPathDays, setInitialPathDays] = useState<any[]>([]);
  const [pathId, setPathId] = useState<string | null>(null);

  const fetchMap = useCallback(async () => {
    console.log("📡 fetchMap called for mapId:", mapId);
    try {
      const fetchedMap = await getMapWithNodes(mapId);
      console.log("📥 fetchedMap result:", !!fetchedMap);
      if (fetchedMap) {
        setInitialMap(JSON.parse(JSON.stringify(fetchedMap))); // Deep copy for initial state
        setMap(fetchedMap);
        console.log("✅ Map data set successfully");
      } else {
        console.log("❌ Map not found");
        toast({ title: "Map not found", variant: "destructive" });
        router.push("/map");
      }
    } catch (error) {
      console.error("❌ fetchMap error:", error);
      toast({
        title: "Error",
        description: "Failed to load map data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("🏁 fetchMap completed, isLoading set to false");
    }
  }, [mapId, router, toast]);

  useEffect(() => {
    // Always fetch the complete map data with nodes, regardless of initialMapData
    // The initialMapData from server is just basic map info for access checks
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
      // Deep copy the initial map to reset all changes
      const resetMap = JSON.parse(JSON.stringify(initialMap));

      // Update the map state
      setMap(resetMap);

      // Increment the key to force MapEditor to completely remount
      // This clears ReactFlow's internal state and forces it to use metadata positions
      setMapResetKey((prev) => prev + 1);

      toast({
        title: "Changes Reset",
        description:
          "All local changes have been discarded, including node positions.",
      });
    }
  };

  const handleImageUploaded = (imageData: {
    url: string;
    blurhash?: string;
    fileName: string;
  }) => {
    // Update map with new image data using new columns
    setMap((prev) =>
      prev
        ? {
            ...prev,
            cover_image_url: imageData.url,
            cover_image_blurhash: imageData.blurhash,
            cover_image_key: imageData.fileName,
            cover_image_updated_at: new Date().toISOString(),
            // Clear old metadata.coverImage if it exists
            metadata: prev.metadata
              ? { ...prev.metadata, coverImage: undefined }
              : undefined,
          }
        : null,
    );

    // Update initial map to reflect the saved state
    setInitialMap((prev) =>
      prev
        ? {
            ...prev,
            cover_image_url: imageData.url,
            cover_image_blurhash: imageData.blurhash,
            cover_image_key: imageData.fileName,
            cover_image_updated_at: new Date().toISOString(),
            metadata: prev.metadata
              ? { ...prev.metadata, coverImage: undefined }
              : undefined,
          }
        : null,
    );
  };

  const handleImageCreated = async (file: File) => {
    // Upload the created image using the same flow as uploaded images
    if (!mapId) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapId", mapId);
      formData.append("maxWidth", "1200");
      formData.append("maxHeight", "1200");
      formData.append("quality", "85");

      const uploadResponse = await fetch("/api/maps/upload-cover-image", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Image upload failed");
      }

      const uploadResult = await uploadResponse.json();

      // Update map state with the uploaded image
      handleImageUploaded({
        url: uploadResult.url,
        blurhash: uploadResult.blurhash,
        fileName: uploadResult.fileName,
      });

      toast({
        title: "Cover image created!",
        description: "Your custom cover image has been saved.",
      });
    } catch (error) {
      console.error("Failed to upload created image:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload created image",
        variant: "destructive",
      });
    }
  };

  const handleImageRemoved = () => {
    // Clear image data from both new columns and old metadata
    setMap((prev) =>
      prev
        ? {
            ...prev,
            cover_image_url: null,
            cover_image_blurhash: null,
            cover_image_key: null,
            cover_image_updated_at: null,
            metadata: prev.metadata
              ? { ...prev.metadata, coverImage: undefined }
              : undefined,
          }
        : null,
    );
  };

  // Simple check if there are unsaved changes (will be replaced with more accurate check below)
  const hasUnsavedChangesSimple = useMemo(() => {
    if (!map || !initialMap) return false;
    return JSON.stringify(map) !== JSON.stringify(initialMap);
  }, [map, initialMap]);

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

    try {
      const batchUpdate: BatchMapUpdate = {
        map: {},
        nodes: { create: [], update: [], delete: [] },
        paths: { create: [], delete: [] },
        content: { create: [], update: [], delete: [] },
        assessments: { create: [], update: [], delete: [] },
        quizQuestions: { create: [], update: [], delete: [] },
      };

      // Detect map changes
      if (map.title !== initialMap.title) batchUpdate.map.title = map.title;
      if (map.description !== initialMap.description)
        batchUpdate.map.description = map.description;
      if (map.difficulty !== initialMap.difficulty)
        batchUpdate.map.difficulty = map.difficulty;
      if (map.category !== initialMap.category)
        batchUpdate.map.category = map.category;
      if (map.visibility !== initialMap.visibility)
        batchUpdate.map.visibility = map.visibility;
      if (map.cover_image_url !== initialMap.cover_image_url)
        batchUpdate.map.cover_image_url = map.cover_image_url;
      if (map.cover_image_blurhash !== initialMap.cover_image_blurhash)
        batchUpdate.map.cover_image_blurhash = map.cover_image_blurhash;
      if (map.cover_image_key !== initialMap.cover_image_key)
        batchUpdate.map.cover_image_key = map.cover_image_key;
      if (map.cover_image_updated_at !== initialMap.cover_image_updated_at)
        batchUpdate.map.cover_image_updated_at = map.cover_image_updated_at;

      console.log("📍 Detecting node changes...");
      // Detect node changes (create, update, delete)
      const currentNodes = map.map_nodes || [];
      const initialNodes = initialMap.map_nodes || [];

      // Nodes to delete
      const nodeIdsToDelete = initialNodes
        .filter((inode) => !currentNodes.some((cnode) => cnode.id === inode.id))
        .map((inode) => inode.id);
      batchUpdate.nodes.delete = nodeIdsToDelete;

      // Nodes to create and update
      currentNodes.forEach((cnode) => {
        const inode = initialNodes.find((n) => n.id === cnode.id);
        if (!inode) {
          // New node - only include actual column fields
          const { node_content, node_assessments, node_paths_source, node_paths_destination, id, ...nodeData } = cnode;

          // If it's a temp ID, preserve it as temp_id for mapping
          if (id?.startsWith('temp_')) {
            batchUpdate.nodes.create.push({
              ...nodeData,
              temp_id: id,
            });
          } else {
            batchUpdate.nodes.create.push(nodeData);
          }
        } else {
          // Check for differences
          const hasChanges =
            cnode.title !== inode.title ||
            cnode.instructions !== inode.instructions ||
            cnode.difficulty !== inode.difficulty ||
            cnode.sprite_url !== inode.sprite_url ||
            JSON.stringify(cnode.metadata) !== JSON.stringify(inode.metadata);

          if (hasChanges) {
            // Only include actual column fields, not relationship fields
            const { node_content, node_assessments, node_paths_source, node_paths_destination, ...nodeData } = cnode;
            batchUpdate.nodes.update.push(nodeData);
          }
        }
      });

      console.log("🛣️ Detecting path changes...");
      // Detect path changes (create, delete) - edges in React Flow
      // Gather all paths from all nodes
      const currentPaths = currentNodes.flatMap(node => node.node_paths_source || []);
      const initialPaths = initialNodes.flatMap(node => node.node_paths_source || []);

      // Paths to delete
      batchUpdate.paths.delete = initialPaths
        .filter(
          (ipath) =>
            !currentPaths.some(
              (cpath) =>
                cpath.source_node_id === ipath.source_node_id &&
                cpath.destination_node_id === ipath.destination_node_id,
            ),
        )
        .map((ipath) => ipath.id)
        .filter(id => !id.startsWith('temp_')); // Don't try to delete temp IDs

      // Paths to create
      batchUpdate.paths.create = currentPaths.filter(
        (cpath) =>
          !initialPaths.some(
            (ipath) =>
              ipath.source_node_id === cpath.source_node_id &&
              ipath.destination_node_id === cpath.destination_node_id,
          ),
      );

      console.log("📝 Detecting content and assessment changes...");
      // Detect content and assessment changes for each node
      currentNodes.forEach((cnode) => {
        const inode = initialNodes.find((n) => n.id === cnode.id);
        if (!inode) return; // New nodes handle their own content/assessments

        // Content changes
        const currentContent = cnode.node_content || [];
        const initialContent = inode.node_content || [];

        // Content to delete
        batchUpdate.content.delete.push(
          ...initialContent
            .filter((ic) => !currentContent.some((cc) => cc.id === ic.id))
            .map((ic) => ic.id),
        );

        // Content to create or update
        currentContent.forEach((cc) => {
          const ic = initialContent.find((c) => c.id === cc.id);
          const { id, ...contentData } = cc;

          if (!ic) {
            // For new content, remove temp IDs
            if (!id?.startsWith('temp_')) {
              batchUpdate.content.create.push({ ...contentData, id });
            } else {
              batchUpdate.content.create.push(contentData);
            }
          } else if (
            cc.content_type !== ic.content_type ||
            cc.content_title !== ic.content_title ||
            cc.content_url !== ic.content_url ||
            cc.content_body !== ic.content_body ||
            cc.display_order !== ic.display_order
          ) {
            batchUpdate.content.update.push({ ...contentData, id });
          }
        });

        // Assessment changes
        const currentAssessments = cnode.node_assessments || [];
        const initialAssessments = inode.node_assessments || [];

        // Assessment to delete
        batchUpdate.assessments.delete.push(
          ...initialAssessments
            .filter((ia) => !currentAssessments.some((ca) => ca.id === ia.id))
            .map((ia) => ia.id),
        );

        // Assessment to create or update
        currentAssessments.forEach((ca) => {
          const ia = initialAssessments.find((a) => a.id === ca.id);
          // Strip out relationship fields
          const { quiz_questions, id, ...assessmentData } = ca;

          if (!ia) {
            // For new assessments, preserve temp_id for mapping and remove the id field
            if (id?.startsWith('temp_')) {
              batchUpdate.assessments.create.push({
                ...assessmentData,
                temp_id: id,
              });
            } else {
              batchUpdate.assessments.create.push(assessmentData);
            }
          } else {
            // Check for assessment-level changes
            const hasAssessmentChanges =
              ca.assessment_type !== ia.assessment_type ||
              ca.points_possible !== ia.points_possible ||
              ca.is_graded !== ia.is_graded ||
              JSON.stringify(ca.metadata) !== JSON.stringify(ia.metadata);

            if (hasAssessmentChanges) {
              batchUpdate.assessments.update.push({ ...assessmentData, id });
            }
          }
        });

        // Quiz Question changes - handle separately to avoid nested issues
        const currentAssessment = currentAssessments.find(
          (a) => a.assessment_type === "quiz",
        );
        const initialAssessment = initialAssessments.find(
          (a) => a.assessment_type === "quiz",
        );

        if (currentAssessment && initialAssessment) {
          const currentQuestions = currentAssessment.quiz_questions || [];
          const initialQuestions = initialAssessment.quiz_questions || [];

          // Quiz questions can be created, updated or deleted
          // However, to keep the batch update reliable, we only track changes
          // for assessments that already have real database IDs.

          // Newly created questions (temp IDs)
          const questionsToCreate = currentQuestions.filter((q) =>
            q.id?.startsWith("temp_"),
          );
          questionsToCreate.forEach((q) => {
            const questionToCreate = {
              assessment_id: currentAssessment.id,
              question_text: q.question_text,
              options: q.options,
              correct_option: q.correct_option,
            };
            batchUpdate.quizQuestions.create.push(questionToCreate);
            console.log("➕ Adding quiz question to create:", questionToCreate);
          });

          // Deleted questions - only real IDs that exist in initial but not current
          const questionsToDelete = initialQuestions.filter((iq) => {
            if (!iq.id || iq.id.startsWith("temp_")) return false;
            const stillExists = currentQuestions.some((cq) => cq.id === iq.id);
            if (!stillExists) {
              console.log("🗑️ Question marked for deletion:", iq.id);
              return true;
            }
            return false;
          });

          questionsToDelete.forEach((iq) => {
            batchUpdate.quizQuestions.delete.push(iq.id!);
            console.log("🗑️ Adding quiz question to delete:", iq.id);
          });

          // Updated questions - only process questions that exist in both states with changes
          const questionsToUpdate = currentQuestions.filter((cq) => {
            if (!cq.id || cq.id.startsWith("temp_")) return false;

            const iq = initialQuestions.find((q) => q.id === cq.id);
            if (!iq) {
              // Question exists in current but not initial - either newly created or state sync issue
              console.log(
                "⚠️ Question in current but not initial state - skipping update:",
                cq.id,
              );
              return false;
            }

            // Compare the questions for changes
            const hasChanges =
              cq.question_text !== iq.question_text ||
              cq.correct_option !== iq.correct_option ||
              JSON.stringify(cq.options) !== JSON.stringify(iq.options);

            if (hasChanges) {
              console.log("📝 Question has changes:", cq.id);
              return true;
            }

            return false;
          });

          questionsToUpdate.forEach((cq) => {
            const questionToUpdate = {
              id: cq.id!,
              question_text: cq.question_text,
              options: cq.options,
              correct_option: cq.correct_option,
            };
            batchUpdate.quizQuestions.update.push(questionToUpdate);
            console.log("📝 Adding quiz question to update:", questionToUpdate);
          });

          console.log("📊 Quiz questions batch summary:", {
            toCreate: questionsToCreate.length,
            toDelete: questionsToDelete.length,
            toUpdate: questionsToUpdate.length,
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
        `Failed to generate batch update: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [map, initialMap]);

  // More accurate check for unsaved changes using batch update logic
  const hasUnsavedChanges = useMemo(() => {
    if (!map || !initialMap) return false;

    // Check for path days changes
    const pathDaysChanged =
      JSON.stringify(pathDays) !== JSON.stringify(initialPathDays);
    if (pathDaysChanged) return true;

    // First do a quick string comparison
    if (JSON.stringify(map) === JSON.stringify(initialMap)) return false;

    // If strings differ, check if there are actual changes that need saving
    try {
      const batchUpdate = generateBatchUpdate();
      if (!batchUpdate) return false;

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
        batchUpdate.assessments.delete.length > 0 ||
        batchUpdate.quizQuestions.create.length > 0 ||
        batchUpdate.quizQuestions.update.length > 0 ||
        batchUpdate.quizQuestions.delete.length > 0;

      return hasChanges;
    } catch (error) {
      console.error("Error checking for changes:", error);
      // If we can't determine, fall back to simple comparison
      return hasUnsavedChangesSimple;
    }
  }, [
    map,
    initialMap,
    pathDays,
    initialPathDays,
    generateBatchUpdate,
    hasUnsavedChangesSimple,
  ]);

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
    let saveSuccessful = false;
    try {
      const batchUpdate = generateBatchUpdate();

      console.log(
        "📦 Generated batch update:",
        JSON.stringify(batchUpdate, null, 2),
      );

      // Validate batch update before sending
      if (!batchUpdate) {
        throw new Error(
          "Failed to generate batch update - returned null/undefined",
        );
      }

      // Check if there are PathLab days changes
      const hasPathDaysChanges =
        seedInfo?.seed_type === "pathlab" &&
        pathId &&
        JSON.stringify(pathDays) !== JSON.stringify(initialPathDays);

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
        batchUpdate.assessments.delete.length > 0 ||
        batchUpdate.quizQuestions.create.length > 0 ||
        batchUpdate.quizQuestions.update.length > 0 ||
        batchUpdate.quizQuestions.delete.length > 0;

      if (!hasChanges && !hasPathDaysChanges) {
        console.log("ℹ️ No actual changes detected in batch update or path days");
        toast({
          title: "No Changes to Save",
          description: "All data is already up to date.",
        });
        return;
      }

      // Save map changes if there are any
      if (hasChanges) {
        console.log("📨 Sending batch update to server...");
        console.log("🎯 Map ID:", mapId);

        // Add timeout to catch hanging requests
        const savePromise = batchUpdateMap(mapId, batchUpdate);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Save operation timed out after 30 seconds")),
            30000,
          );
        });

        await Promise.race([savePromise, timeoutPromise]);

        console.log("✅ Batch update completed successfully");
      }

      // Save PathLab days if they changed
      if (hasPathDaysChanges) {
        console.log("💾 Saving changed path days...");
        try {
          const daysResponse = await fetch("/api/pathlab/days", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pathId,
              totalDays: pathDays.length,
              days: pathDays,
            }),
          });
          if (daysResponse.ok) {
            const data = await daysResponse.json();
            setInitialPathDays(
              JSON.parse(JSON.stringify(data.days || pathDays)),
            );
            console.log("✅ Path days saved successfully");
          } else {
            const errorData = await daysResponse.json();
            console.error("❌ Failed to save path days:", errorData);
            throw new Error(errorData.error || "Failed to save path days");
          }
        } catch (error) {
          console.error("❌ Error saving path days:", error);
          throw error; // Re-throw to trigger error handling below
        }
      }

      // Refresh data after save with detailed logging (only if map changes were saved)
      if (hasChanges) {
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
      }

      toast({
        title: "All Changes Saved Successfully",
        description: hasPathDaysChanges && hasChanges
          ? "Your map and PathLab days have been updated."
          : hasPathDaysChanges
            ? "PathLab days have been updated."
            : "Your map has been updated and refreshed.",
      });

      saveSuccessful = true;
    } catch (error) {
      console.error("❌ Batch save failed:", error);
      console.error("❌ Error details:", {
        name: (error as any)?.name,
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        cause: (error as any)?.cause,
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
    } finally {
      // For successful saves, clear the saving state immediately
      // For errors, the setTimeout above will handle it
      if (saveSuccessful) {
        setIsSavingAll(false);
      }
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

  const handleExportAsJson = async () => {
    console.log("🎬 handleExportAsJson called");
    if (!map) {
      console.log("❌ No map data for export");
      toast({
        title: "Export Failed",
        description: "No map data available to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Simple export function inline to avoid import issues
      const exportData = {
        map: {
          title: map.title,
          description: map.description || "",
          difficulty: map.difficulty || 1,
          estimatedHours: Math.max(
            1,
            Math.round(((map.map_nodes?.length || 1) * 30) / 60),
          ),
          visibility: map.visibility || "public",
          metadata: {
            tags: map.metadata?.tags || [],
            category: map.category || "custom",
            ...map.metadata,
          },
        },
        nodes:
          map.map_nodes?.map((node, index) => ({
            id: node.id,
            title: node.title,
            description: node.instructions || "",
            position: node.metadata?.position || {
              x: 100 + (index % 3) * 200,
              y: 100 + Math.floor(index / 3) * 150,
            },
            difficulty: node.difficulty || 1,
            estimatedMinutes: 30,
            prerequisites: [],
            content: {
              type: "lesson",
              text: node.instructions || "No content available.",
              codeBlocks: [],
              resources: [],
            },
            assessments:
              node.node_assessments?.map((assessment) => ({
                type: assessment.assessment_type,
                isGraded: assessment.is_graded || false,
                pointsPossible: assessment.points_possible || 10,
              })) || [],
          })) || [],
        connections:
          map.map_nodes?.flatMap(
            (node) =>
              node.node_paths_source?.map((path) => ({
                from: path.source_node_id,
                to: path.destination_node_id,
                type: "prerequisite",
              })) || [],
          ) || [],
      };

      // Download the JSON file
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${map.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `"${map.title}" has been exported as JSON.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description:
          error instanceof Error ? error.message : "Failed to export map.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  console.log(
    "🔍 Render check - isLoading:",
    isLoading,
    "map:",
    !!map,
    "initialMap:",
    !!initialMap,
    "isMounted:",
    isMounted,
  );

  if (isLoading) {
    console.log("⏳ Showing loading component");
    return <Loading />;
  }

  if (!map || !initialMap) {
    console.log("❌ No map data, rendering minimal UI with export button");
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center">
          <div>No map data available</div>
          {isMounted && (
            <Button type="button" variant="outline" disabled={true}>
              Export as JSON (No Data)
            </Button>
          )}
        </div>
      </div>
    );
  }

  console.log("✅ Rendering main component");

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="flex-none border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container max-w-none px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={
                    map?.map_type === "seed" && map?.parent_seed_id
                      ? `/seeds/${map.parent_seed_id}`
                      : map?.category === "journey"
                        ? "/me"
                        : `/map/${mapId}`
                  }
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {map?.map_type === "seed"
                    ? "Back to Seed"
                    : map?.category === "journey"
                      ? "Back to Portal"
                      : "Back to Map"}
                </Link>
              </Button>
              {seedInfo?.seed_type === "pathlab" && seedInfo.id && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/seeds/${seedInfo.id}/pathlab-builder`}>
                      PathLab Builder
                    </Link>
                  </Button>
                </>
              )}
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-semibold">Map Editor</h1>
                <p
                  className={`text-xs mt-0.5 h-4 ${hasUnsavedChanges ? "text-orange-600" : "text-transparent"}`}
                >
                  ⚠️ Unsaved changes
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button> */}

              {hasUnsavedChanges && (
                <>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset Changes
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={isSavingAll}
                    size="sm"
                    className="min-w-[100px]"
                  >
                    {isSavingAll ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save All
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="editor" className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="flex-none border-b bg-muted/30">
            <div className="container max-w-none px-6">
              <TabsList className="h-12 bg-transparent">
                <TabsTrigger
                  value="editor"
                  className="data-[state=active]:bg-background"
                >
                  Visual Editor
                </TabsTrigger>

                <TabsTrigger
                  value="view"
                  className="data-[state=active]:bg-background"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </TabsTrigger>

                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-background"
                >
                  Map Settings
                </TabsTrigger>
                <TabsTrigger
                  value="raw"
                  className="data-[state=active]:bg-background"
                >
                  Raw Data
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="editor" className="h-full m-0 p-0">
              <div className="h-full">
                <MapEditor
                  key={mapResetKey}
                  map={map}
                  pathDays={pathDays}
                  seedInfo={seedInfo}
                  onPathDaysChange={setPathDays}
                  onMapChange={(newMapParam) => {
                    // Handle both value and function updates
                    const newMap =
                      typeof newMapParam === "function"
                        ? newMapParam(map)
                        : newMapParam;

                    setMap(newMap);

                    if (!newMap) return;

                    // When new nodes are created, also update initialMap to include them
                    // This ensures generateBatchUpdate can detect subsequent changes to newly created nodes
                    setInitialMap((prev) => {
                      if (!prev) return prev;

                      // Find newly created nodes (ones that exist in newMap but not in initialMap)
                      const initialNodeIds = new Set(
                        prev.map_nodes.map((node) => node.id),
                      );
                      const newlyCreatedNodes = newMap.map_nodes.filter(
                        (node) =>
                          !initialNodeIds.has(node.id) &&
                          !node.id.startsWith("temp_"),
                      );

                      if (newlyCreatedNodes.length > 0) {
                        console.log(
                          "🔄 Adding newly created nodes to initialMap:",
                          newlyCreatedNodes.map((n) => ({
                            id: n.id,
                            title: n.title,
                          })),
                        );
                        return {
                          ...prev,
                          map_nodes: [...prev.map_nodes, ...newlyCreatedNodes],
                        };
                      }

                      return prev;
                    });
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="view"
              className="h-full m-0 p-0 overflow-hidden relative"
            >
              <div className="h-full w-full bg-slate-950">
                {map && <MapViewerWithProvider map={map} />}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0 overflow-auto">
              <div className="container max-w-4xl mx-auto p-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Map Configuration</CardTitle>
                    <CardDescription>
                      Configure the general settings and metadata for your
                      learning map.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="title">Map Title *</Label>
                          <Input
                            id="title"
                            value={map.title}
                            onChange={(e) =>
                              setMap((prev) =>
                                prev
                                  ? { ...prev, title: e.target.value }
                                  : null,
                              )
                            }
                            disabled={isSubmitting}
                            placeholder="Enter map title..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">
                            Category
                            {map.category === "journey" && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Personal Journey - Unchangeable)
                              </span>
                            )}
                          </Label>
                          <Select
                            value={map.category || ""}
                            onValueChange={(value: MapCategory) =>
                              setMap((prev) =>
                                prev ? { ...prev, category: value } : null,
                              )
                            }
                            disabled={
                              isSubmitting || map.category === "journey"
                            }
                          >
                            <SelectTrigger
                              className={
                                map.category === "journey"
                                  ? "opacity-60 cursor-not-allowed"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="journey" disabled>
                                Personal Journey
                              </SelectItem>
                              <SelectItem value="ai">
                                AI & Machine Learning
                              </SelectItem>
                              <SelectItem value="3d">
                                3D Design & Modeling
                              </SelectItem>
                              <SelectItem value="unity">
                                Unity Development
                              </SelectItem>
                              <SelectItem value="hacking">
                                Cybersecurity & Hacking
                              </SelectItem>
                              <SelectItem value="custom">
                                Custom Topic
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="description">Description</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Simple inline export
                                if (map) {
                                  const exportData = {
                                    map: {
                                      title: map.title,
                                      description: map.description || "",
                                      difficulty: map.difficulty || 1,
                                      estimatedHours: 2,
                                      visibility: map.visibility || "public",
                                      metadata: {
                                        tags: [],
                                        category: map.category || "custom",
                                      },
                                    },
                                    nodes:
                                      map.map_nodes?.map((node, i) => ({
                                        id: node.id,
                                        title: node.title,
                                        description: node.instructions || "",
                                        position: { x: 100 + i * 200, y: 100 },
                                        difficulty: 1,
                                        estimatedMinutes: 30,
                                        prerequisites: [],
                                        content: {
                                          type: "lesson",
                                          text: node.instructions || "",
                                          codeBlocks: [],
                                          resources: [],
                                        },
                                        assessments: [],
                                      })) || [],
                                    connections: [],
                                  };
                                  const blob = new Blob(
                                    [JSON.stringify(exportData, null, 2)],
                                    { type: "application/json" },
                                  );
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.href = url;
                                  link.download = `${map.title.replace(/[^a-z0-9]/gi, "_")}_export.json`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  toast({
                                    title: "Exported!",
                                    description: "Map exported as JSON",
                                  });
                                }
                              }}
                            >
                              📤 Export JSON
                            </Button>
                          </div>
                          <Textarea
                            id="description"
                            value={map.description || ""}
                            onChange={(e) =>
                              setMap((prev) =>
                                prev
                                  ? { ...prev, description: e.target.value }
                                  : null,
                              )
                            }
                            className="min-h-[100px]"
                            disabled={isSubmitting}
                            placeholder="Describe what students will learn in this map..."
                          />
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                          <Label>Cover Image (Optional)</Label>
                          <Tabs defaultValue="upload" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="upload" className="gap-2">
                                <Upload className="h-4 w-4" />
                                Upload Image
                              </TabsTrigger>
                              <TabsTrigger value="create" className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Create Cover
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent
                              value="upload"
                              className="space-y-2 mt-4"
                            >
                              {/* Debug info */}
                              {process.env.NODE_ENV === "development" && (
                                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                                  <div>
                                    cover_image_url:{" "}
                                    {map.cover_image_url || "null"}
                                  </div>
                                  <div>
                                    cover_image_blurhash:{" "}
                                    {map.cover_image_blurhash || "null"}
                                  </div>
                                  <div>
                                    metadata.coverImage:{" "}
                                    {map.metadata?.coverImage || "null"}
                                  </div>
                                </div>
                              )}
                              <ImageUpload
                                mapId={mapId}
                                currentImage={{
                                  url:
                                    map.cover_image_url ||
                                    map.metadata?.coverImage,
                                  blurhash:
                                    map.cover_image_blurhash || undefined,
                                }}
                                onImageUploaded={handleImageUploaded}
                                onImageRemoved={handleImageRemoved}
                                disabled={isSubmitting}
                                className="w-full"
                              />
                            </TabsContent>

                            <TabsContent value="create" className="mt-4">
                              <CoverImageMaker
                                onImageCreated={handleImageCreated}
                                disabled={isSubmitting}
                              />
                            </TabsContent>
                          </Tabs>
                        </div>

                        <div className="space-y-4 lg:col-span-2">
                          <Label htmlFor="difficulty">
                            Overall Difficulty Level: {map.difficulty || 1}/10
                          </Label>
                          <div className="px-3">
                            <Slider
                              id="difficulty"
                              min={1}
                              max={10}
                              step={1}
                              value={[map.difficulty || 1]}
                              onValueChange={(value) =>
                                setMap((prev) =>
                                  prev
                                    ? { ...prev, difficulty: value[0] }
                                    : null,
                                )
                              }
                              disabled={isSubmitting}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Beginner</span>
                              <span>Intermediate</span>
                              <span>Advanced</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-6 border-t">
                        {(() => {
                          console.log("🎯 Rendering button section");
                          return null;
                        })()}
                        <div className="flex gap-2">
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
                                  This action cannot be undone. This will
                                  permanently delete the learning map "
                                  {map.title}" and all of its associated data
                                  including nodes, paths, content, and student
                                  progress.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {(() => {
                            console.log("📤 Rendering export button");
                            return null;
                          })()}
                          {isMounted && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleExportAsJson}
                              disabled={isExporting || isSubmitting || !map}
                            >
                              {!map ? "Loading..." : "Export as JSON"}
                            </Button>
                          )}
                        </div>

                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving Settings...
                            </>
                          ) : (
                            "Save Settings"
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="raw" className="h-full m-0 overflow-auto">
              <div className="container max-w-6xl mx-auto p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Raw Data Comparison</CardTitle>
                    <CardDescription>
                      View the differences between your current edits and the
                      last saved version. This is useful for debugging and
                      understanding what changes will be applied.
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
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
