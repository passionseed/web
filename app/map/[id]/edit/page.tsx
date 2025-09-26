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
import { MapEditorWithProvider as MapEditor } from "@/components/map/MapEditor";
import { RawDataView } from "@/components/map/RawDataView";
import { ImageUpload } from "@/components/map/ImageUpload";

export default function EditMapPage() {
  console.log("🚀🚀🚀 EDITMAP COMPONENT MOUNTING - THIS SHOULD ALWAYS APPEAR 🚀🚀🚀");
  
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const mapId = params.id as string;
  
  // Emergency fallback - add a simple button outside all logic
  if (typeof window !== 'undefined') {
    console.log("💻 Client-side rendering confirmed");
  }
  
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [initialMap, setInitialMap] = useState<FullLearningMap | null>(null);
  const [map, setMap] = useState<FullLearningMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
        : null
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
        : null
    );
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
        : null
    );
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
    let saveSuccessful = false;
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
        batchUpdate.assessments.delete.length > 0 ||
        batchUpdate.quizQuestions.create.length > 0 ||
        batchUpdate.quizQuestions.update.length > 0 ||
        batchUpdate.quizQuestions.delete.length > 0;

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

      saveSuccessful = true;
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
    } finally {
      // For successful saves, clear the saving state immediately
      // For errors, the setTimeout above will handle it
      if (saveSuccessful) {
        setIsSavingAll(false);
      }
    }
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
      if (
        JSON.stringify(map.metadata) !== JSON.stringify(initialMap.metadata)
      ) {
        mapChanges.metadata = map.metadata;
        console.log("📝 Map metadata changed");
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
      const createdNodes = map.map_nodes.filter(
        (node) =>
          node.id.startsWith("temp_node_") || node.id.startsWith("temp_text_")
      );
      console.log(
        "➕ Created nodes:",
        createdNodes.length,
        createdNodes.map((n) => ({
          id: n.id,
          title: n.title,
          type: (n as any).node_type,
        }))
      );

      createdNodes.forEach((node) => {
        const nodeToCreate = {
          map_id: map.id,
          title: node.title,
          instructions: node.instructions,
          difficulty: node.difficulty,
          sprite_url: node.sprite_url,
          metadata: node.metadata,
          // Include node_type for text nodes
          ...((node as any).node_type && {
            node_type: (node as any).node_type,
          }),
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
            JSON.stringify(initialNode.metadata) ||
          (node as any).node_type !== (initialNode as any).node_type;

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
          // Include node_type for text nodes
          ...((node as any).node_type && {
            node_type: (node as any).node_type,
          }),
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
        // Skip content processing for text nodes (they don't have content)
        if ((node as any).node_type === "text") {
          console.log(`⏭️ Skipping content for text node ${node.id}`);
          return;
        }

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
        // Skip assessment processing for text nodes (they don't have assessments)
        if ((node as any).node_type === "text") {
          console.log(`⏭️ Skipping assessments for text node ${node.id}`);
          return;
        }

        const initialNode = initialNodeMap.get(node.id);
        const currentAssessment = node.node_assessments?.[0] || null;
        const initialAssessment = initialNode?.node_assessments?.[0] || null;

        // Created assessment
        if (!initialAssessment && currentAssessment) {
          const assessmentToCreate = {
            node_id: node.id,
            assessment_type: currentAssessment.assessment_type,
            // Add grading fields
            points_possible: currentAssessment.points_possible,
            is_graded: currentAssessment.is_graded,
            // Add group assessment fields
            is_group_assessment: currentAssessment.is_group_assessment,
            group_formation_method: currentAssessment.group_formation_method,
            group_submission_mode: currentAssessment.group_submission_mode,
            target_group_size: currentAssessment.target_group_size,
            allow_uneven_groups: currentAssessment.allow_uneven_groups,
            groups_config: currentAssessment.groups_config,
            // Add metadata for checklist assessments
            ...(currentAssessment.metadata && {
              metadata: currentAssessment.metadata,
            }),
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
              console.log(
                "➕ Adding quiz question to create:",
                questionToCreate
              );
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

        // Updated assessment (type, metadata, grading fields, or group settings)
        if (
          initialAssessment &&
          currentAssessment &&
          (initialAssessment.assessment_type !==
            currentAssessment.assessment_type ||
            JSON.stringify(initialAssessment.metadata) !==
              JSON.stringify(currentAssessment.metadata) ||
            initialAssessment.points_possible !== currentAssessment.points_possible ||
            initialAssessment.is_graded !== currentAssessment.is_graded ||
            initialAssessment.is_group_assessment !== currentAssessment.is_group_assessment ||
            initialAssessment.group_formation_method !== currentAssessment.group_formation_method ||
            initialAssessment.group_submission_mode !== currentAssessment.group_submission_mode ||
            initialAssessment.target_group_size !== currentAssessment.target_group_size ||
            initialAssessment.allow_uneven_groups !== currentAssessment.allow_uneven_groups ||
            JSON.stringify(initialAssessment.groups_config) !== JSON.stringify(currentAssessment.groups_config))
        ) {
          const assessmentToUpdate = {
            id: initialAssessment.id,
            assessment_type: currentAssessment.assessment_type,
            // Add grading fields
            points_possible: currentAssessment.points_possible,
            is_graded: currentAssessment.is_graded,
            // Add group assessment fields
            is_group_assessment: currentAssessment.is_group_assessment,
            group_formation_method: currentAssessment.group_formation_method,
            group_submission_mode: currentAssessment.group_submission_mode,
            target_group_size: currentAssessment.target_group_size,
            allow_uneven_groups: currentAssessment.allow_uneven_groups,
            groups_config: currentAssessment.groups_config,
            // Add metadata for checklist assessments
            ...(currentAssessment.metadata && {
              metadata: currentAssessment.metadata,
            }),
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
              console.log(
                "➕ Adding quiz question to create:",
                questionToCreate
              );
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
              console.log(
                "📝 Adding quiz question to update:",
                questionToUpdate
              );
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
          estimatedHours: Math.max(1, Math.round((map.map_nodes?.length || 1) * 30 / 60)),
          visibility: map.visibility || "public",
          metadata: {
            tags: map.metadata?.tags || [],
            category: map.category || "custom",
            ...map.metadata
          }
        },
        nodes: map.map_nodes?.map((node, index) => ({
          id: node.id,
          title: node.title,
          description: node.instructions || "",
          position: node.metadata?.position || {
            x: 100 + (index % 3) * 200,
            y: 100 + Math.floor(index / 3) * 150
          },
          difficulty: node.difficulty || 1,
          estimatedMinutes: 30,
          prerequisites: [],
          content: {
            type: "lesson",
            text: node.instructions || "No content available.",
            codeBlocks: [],
            resources: []
          },
          assessments: node.node_assessments?.map(assessment => ({
            type: assessment.assessment_type,
            isGraded: assessment.is_graded || false,
            pointsPossible: assessment.points_possible || 10
          })) || []
        })) || [],
        connections: map.map_nodes?.flatMap(node => 
          node.node_paths_source?.map(path => ({
            from: path.source_node_id,
            to: path.destination_node_id,
            type: "prerequisite"
          })) || []
        ) || []
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
        description: error instanceof Error ? error.message : "Failed to export map.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  console.log("🔍 Render check - isLoading:", isLoading, "map:", !!map, "initialMap:", !!initialMap, "isMounted:", isMounted);
  
  
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
            <Button
              type="button"
              variant="outline"
              disabled={true}
            >
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
                <Link href={`/map/${mapId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Map
                </Link>
              </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

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
                <MapEditor map={map} onMapChange={setMap} />
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
                                prev ? { ...prev, title: e.target.value } : null
                              )
                            }
                            disabled={isSubmitting}
                            placeholder="Enter map title..."
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
                                      metadata: { tags: [], category: map.category || "custom" }
                                    },
                                    nodes: map.map_nodes?.map((node, i) => ({
                                      id: node.id,
                                      title: node.title,
                                      description: node.instructions || "",
                                      position: { x: 100 + i * 200, y: 100 },
                                      difficulty: 1,
                                      estimatedMinutes: 30,
                                      prerequisites: [],
                                      content: { type: "lesson", text: node.instructions || "", codeBlocks: [], resources: [] },
                                      assessments: []
                                    })) || [],
                                    connections: []
                                  };
                                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.href = url;
                                  link.download = `${map.title.replace(/[^a-z0-9]/gi, "_")}_export.json`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  toast({ title: "Exported!", description: "Map exported as JSON" });
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
                                  : null
                              )
                            }
                            className="min-h-[100px]"
                            disabled={isSubmitting}
                            placeholder="Describe what students will learn in this map..."
                          />
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                          <Label>Cover Image (Optional)</Label>
                          {/* Debug info */}
                          {process.env.NODE_ENV === "development" && (
                            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                              <div>
                                cover_image_url: {map.cover_image_url || "null"}
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
                                map.cover_image_url || map.metadata?.coverImage,
                              blurhash: map.cover_image_blurhash || undefined,
                            }}
                            onImageUploaded={handleImageUploaded}
                            onImageRemoved={handleImageRemoved}
                            disabled={isSubmitting}
                            className="w-full"
                          />
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
                                    : null
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
                        {(() => { console.log("🎯 Rendering button section"); return null; })()}
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
                                  permanently delete the learning map "{map.title}
                                  " and all of its associated data including
                                  nodes, paths, content, and student progress.
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

                          {(() => { console.log("📤 Rendering export button"); return null; })()}
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
