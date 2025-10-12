"use client";

import React, {
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesDelete,
  OnEdgesDelete,
  OnSelectionChangeParams,
  Handle,
  Position,
  MarkerType,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { FullLearningMap } from "@/lib/supabase/maps";
import { MapNode, QuizQuestion } from "@/types/map";
import { createNode } from "@/lib/supabase/nodes";
import {
  Plus,
  Copy,
  Clipboard,
  Type,
  Save,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { NodeEditorPanel } from "./NodeEditorPanel";
import FloatingEdge, { FloatingEdgeEdit } from "./FloatingEdge";
import { isEditable } from "@/lib/dom/is-editable";
import { log } from "console";

// Type definitions
type AppNode = Node<any, "default" | "text">;
type AppEdge = Edge;

interface MapEditorProps {
  map: FullLearningMap;
  onMapChange: React.Dispatch<React.SetStateAction<FullLearningMap | null>>;
}

// Constants
const INITIAL_NODES: AppNode[] = [];
const INITIAL_EDGES: AppEdge[] = [];

const EDGE_TYPES = {
  floating: FloatingEdgeEdit,
};

const EDGE_STYLE = {
  stroke: "#83460d",
  strokeWidth: 2,
};

const NODE_STYLE = {
  backgroundColor: "#ffffff00",
  border: "2px solid #cccccc00",
  flexGrow: 1,
  textColor: "#dddddd",
  aspectRatio: "1 / 1",
} as const;

// Utility functions
const generateTempId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random()}`;

const getRandomPosition = () => ({
  x: Math.random() * 400,
  y: Math.random() * 400,
});

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Auto-save status enum
enum AutoSaveStatus {
  SAVED = "saved",
  SAVING = "saving",
  PENDING = "pending",
  ERROR = "error",
}

// Custom node component - memoized for better performance
const CustomNode = React.memo(
  ({
    data,
    selected,
    id,
    onClick,
  }: {
    data: MapNode;
    selected?: boolean;
    id?: string;
    onClick?: (nodeId: string) => void;
  }) => {
    // Memoize sprite URL to prevent recalculation
    const spriteUrl = useMemo(
      () => data.sprite_url || "/islands/crystal.png",
      [data.sprite_url]
    );


    // Memoize click handler - DO NOT stopPropagation to allow ReactFlow's onNodeClick
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        // Let the event bubble up to ReactFlow for selection handling
        if (id && onClick) {
          onClick(id);
        }
      },
      [id, onClick]
    );

    return (
      <>
        {/* Connection handles - properly positioned and typed */}
        {/* Top handle - target only (for incoming connections) */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="w-4 h-4 bg-blue-500 border-2 border-white shadow-md opacity-80 hover:opacity-100 transition-opacity"
        />

        {/* Bottom handle - source only (for outgoing connections) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="w-4 h-4 bg-green-500 border-2 border-white shadow-md opacity-80 hover:opacity-100 transition-opacity"
        />

        {/* Left handle - target only (for incoming connections) */}
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md opacity-80 hover:opacity-100 transition-opacity"
        />

        {/* Right handle - source only (for outgoing connections) */}
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="w-3 h-3 bg-green-500 border-2 border-white shadow-md opacity-80 hover:opacity-100 transition-opacity"
        />

        <div
          className={`relative transition-transform duration-200 cursor-pointer ${
            selected ? "scale-110" : ""
          }`}
          onClick={handleClick}
        >
          {/* Selection indicator */}
          {selected && (
            <div className="absolute -inset-2 rounded-full border-4 border-blue-400 animate-pulse" />
          )}

          {/* Node image with stable styling */}
          <img
            src={spriteUrl}
            alt={data.title}
            loading="lazy" // Improve performance
            className={`w-max h-max object-contain drop-shadow-lg hover:drop-shadow-xl transition-all duration-200 ${
              selected ? "brightness-110 saturate-120" : "brightness-100"
            }`}
          />

          {/* Node label */}
          <div
            className={`absolute -top-8 -right-10 transform transition-all duration-200 ${
              selected ? "scale-105" : ""
            }`}
          >
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1 shadow-lg">
              <div className="text-xs font-bold text-gray-800 text-center whitespace-normal max-w-24 truncate">
                {data.title}
              </div>
              <div className="text-xs text-gray-500 text-center">
                ⭐ {data.difficulty}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
);

// Set display name for debugging
CustomNode.displayName = "CustomNode";

// Text Node component for text-only elements - memoized for better performance
const TextNode = React.memo(
  ({
    data,
    selected,
    id,
    onDataChange,
    onClick,
  }: {
    data: MapNode & { node_type?: string };
    selected?: boolean;
    id: string;
    onDataChange?: (nodeId: string, data: Partial<MapNode>) => void;
    onClick?: (nodeId: string) => void;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(data.title || "Double-click to edit");
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync local text state with data changes from external sources (like NodeEditorPanel)
    useEffect(() => {
      if (!isEditing) {
        setText(data.title || "Double-click to edit");
      }
    }, [data.title, isEditing]);

    // Handle double-click to edit
    const handleDoubleClick = () => {
      setIsEditing(true);
    };

    // Handle text change - only update local state, no immediate data changes
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value);
      // Note: We don't call onDataChange here to prevent node refreshing
      // Changes are saved only on blur/enter via handleSave
    };

    // Handle text save (on Enter or blur)
    const handleSave = () => {
      setIsEditing(false);
      if (onDataChange && text !== data.title) {
        // Include updated_at to signal that editing is complete and visual sync is needed
        onDataChange(id, {
          title: text,
          updated_at: new Date().toISOString(),
        });
      }
    };

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        setText(data.title || "Double-click to edit");
        setIsEditing(false);
      }
    };

    // Focus input when editing starts
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    // Get text styling based on metadata
    const textStyle = {
      fontSize: (data.metadata as any)?.fontSize || "16px",
      color: (data.metadata as any)?.textColor || "#c1c1c1",
      backgroundColor: (data.metadata as any)?.backgroundColor || "transparent",
      fontWeight: (data.metadata as any)?.fontWeight || "normal",
      textAlign: (data.metadata as any)?.textAlign || ("center" as const),
    };

    const containerClassName = `
    relative min-w-32 min-h-8 p-2 rounded-lg border-2 transition-all duration-200
    ${
      selected
        ? "border-blue-400 bg-blue-50/80 shadow-lg scale-105"
        : "border-gray-200 bg-white/90 hover:bg-white shadow-sm"
    }
    ${isEditing ? "border-blue-500 shadow-md" : ""}
    backdrop-blur-sm
  `.trim();

    return (
      <div
        className={containerClassName}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) {
            onClick(id);
          }
        }}
        style={{ backgroundColor: textStyle.backgroundColor }}
      >
        {/* Selection indicator */}
        {selected && !isEditing && (
          <div className="absolute -inset-1 rounded-lg border-2 border-blue-400 animate-pulse" />
        )}

        {/* Text content */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            onBlur={handleSave}
            onKeyDown={handleKeyPress}
            className="w-full bg-transparent border-none outline-none text-center"
            style={{
              fontSize: textStyle.fontSize,
              color: textStyle.color,
              fontWeight: textStyle.fontWeight,
              textAlign: textStyle.textAlign,
            }}
            placeholder="Enter text..."
          />
        ) : (
          <div
            className="cursor-pointer select-none whitespace-nowrap"
            style={textStyle}
          >
            {text || "Double-click to edit"}
          </div>
        )}

        {/* Edit hint when selected */}
        {selected && !isEditing && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
            Double-click to edit
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
TextNode.displayName = "TextNode";

// Define node types outside component to prevent recreation warnings
const NODE_TYPES = {
  default: (props: any) => <CustomNode {...props} />,
  text: (props: any) => <TextNode {...props} />,
};

export function MapEditor({ map, onMapChange }: MapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    INITIAL_NODES as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  // ReactFlow is the single source of truth for selection state
  // Helper functions to read selection from ReactFlow instance
  const [isUpdatingNodeData, setIsUpdatingNodeData] = useState(false);
  const [isUpdatingAssessment, setIsUpdatingAssessment] = useState(false);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [isSelectionDragging, setIsSelectionDragging] = useState(false);
  const [isRestoringSelection, setIsRestoringSelection] = useState(false);
  const [isManuallySelecting, setIsManuallySelecting] = useState(false);
  const [isDraggingNodes, setIsDraggingNodes] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useState<string | null>(null);
  const transformTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingNodeUpdates, setPendingNodeUpdates] = useState<
    Record<string, Partial<MapNode>>
  >({});
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);



  // Helper functions - ReactFlow as single source of truth for selection
  const getSelectedNodes = useCallback((): AppNode[] => {
    if (!reactFlowInstance) return [];
    return reactFlowInstance.getNodes().filter(node => node.selected) as AppNode[];
  }, [reactFlowInstance]);

  const getSelectedNode = useCallback((): AppNode | null => {
    const selected = getSelectedNodes();
    return selected.length === 1 ? selected[0] : null;
  }, [getSelectedNodes]);

  // Track quiz questions for batch operations
  const [pendingQuizQuestions, setPendingQuizQuestions] = useState<
    Record<string, QuizQuestion[]>
  >({});

  // Unified selection handler for both click and drag-fallback scenarios
  const handleNodeSelection = useCallback((node: any, isMultiSelect: boolean, source: string = "unknown") => {
    console.log(`🎯 handleNodeSelection called from: ${source}`, {
      nodeId: node.id,
      isMultiSelect,
      dragDistance: dragDistance,
      timestamp: new Date().toISOString(),
    });
    
    if (!reactFlowInstance) {
      console.warn("⚠️ ReactFlow instance not available for selection");
      return;
    }
    
    // Prevent transforms during manual selection
    setIsManuallySelecting(true);
    
    const currentNodes = reactFlowInstance.getNodes();
    
    if (isMultiSelect) {
      // Multi-select: toggle this node's selection
      const updatedNodes = currentNodes.map(n => ({
        ...n,
        selected: n.id === node.id ? !n.selected : n.selected
      }));
      reactFlowInstance.setNodes(updatedNodes);
      console.log("🔄 Multi-select toggle for node:", node.id);
    } else {
      // Single select: clear all others and select this one
      const updatedNodes = currentNodes.map(n => ({
        ...n,
        selected: n.id === node.id
      }));
      reactFlowInstance.setNodes(updatedNodes);
      console.log("✅ Single-select for node:", node.id);
    }
    
    // Clear the manual selection flag after a brief delay
    setTimeout(() => {
      setIsManuallySelecting(false);
    }, 50);
  }, [reactFlowInstance, dragDistance, setIsManuallySelecting]);

  // Enhanced debug effect for selection state tracking
  useEffect(() => {
    const selectedNodes = getSelectedNodes();
    const selectedNode = getSelectedNode();

    // Get ReactFlow's internal selection state for comparison
    const reactFlowNodes = reactFlowInstance?.getNodes() || [];
    const reactFlowSelected = reactFlowNodes.filter(n => n.selected);

    console.log("🔍 SELECTION STATE DEBUG:", {
      helperSelectedCount: selectedNodes.length,
      helperSelectedIds: selectedNodes.map(n => n.id),
      reactFlowSelectedCount: reactFlowSelected.length,
      reactFlowSelectedIds: reactFlowSelected.map(n => n.id),
      singleNodeFromHelper: selectedNode?.id || null,
      statesMatch: selectedNodes.length === reactFlowSelected.length &&
                  selectedNodes.every(n => reactFlowSelected.some(rf => rf.id === n.id))
    });

    // Alert about desync issues
    if (selectedNodes.length !== reactFlowSelected.length) {
      console.warn("⚠️ SELECTION DESYNC DETECTED! Helper vs ReactFlow mismatch");
    }
  }, [getSelectedNodes, getSelectedNode, reactFlowInstance]);

  // ========================================
  // Cross-Tab Clipboard Management
  // ========================================

  const CLIPBOARD_STORAGE_KEY = 'map_editor_clipboard';

  // State to track clipboard for UI updates
  const [clipboardNodeCount, setClipboardNodeCount] = useState<number>(0);

  // Save copied nodes to localStorage for cross-tab access
  const saveCopiedNodesToStorage = useCallback((nodes: MapNode[]) => {
    try {
      const clipboardData = {
        nodes,
        timestamp: new Date().toISOString(),
        version: 1, // For future compatibility
      };
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(clipboardData));
      setClipboardNodeCount(nodes.length);
      console.log(`📋 Saved ${nodes.length} nodes to cross-tab clipboard`);
    } catch (error) {
      console.error("❌ Failed to save clipboard to localStorage:", error);
      toast({
        title: "Clipboard save failed",
        description: "Unable to save to clipboard. Storage may be full.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load copied nodes from localStorage
  const loadCopiedNodesFromStorage = useCallback((): MapNode[] | null => {
    try {
      const stored = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
      if (!stored) return null;

      const clipboardData = JSON.parse(stored);
      const nodes = clipboardData.nodes;

      if (!Array.isArray(nodes) || nodes.length === 0) {
        return null;
      }

      console.log(`📋 Loaded ${nodes.length} nodes from cross-tab clipboard`);
      return nodes;
    } catch (error) {
      console.error("❌ Failed to load clipboard from localStorage:", error);
      return null;
    }
  }, []);

  // Clear clipboard storage
  const clearCopiedNodesFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(CLIPBOARD_STORAGE_KEY);
      setClipboardNodeCount(0);
      console.log("🗑️ Cleared cross-tab clipboard");
    } catch (error) {
      console.error("❌ Failed to clear clipboard:", error);
    }
  }, []);

  // Initialize clipboard count on mount
  useEffect(() => {
    const nodes = loadCopiedNodesFromStorage();
    setClipboardNodeCount(nodes?.length || 0);
  }, [loadCopiedNodesFromStorage]);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only respond to changes in our clipboard key
      if (e.key === CLIPBOARD_STORAGE_KEY) {
        try {
          if (e.newValue) {
            const clipboardData = JSON.parse(e.newValue);
            const nodeCount = clipboardData.nodes?.length || 0;
            setClipboardNodeCount(nodeCount);
            console.log(`📋 Clipboard updated from another tab: ${nodeCount} nodes`);

            // Optional: Show toast notification
            if (nodeCount > 0) {
              toast({
                title: "Clipboard updated",
                description: `${nodeCount} node${nodeCount !== 1 ? 's' : ''} copied in another tab`,
              });
            }
          } else {
            // Clipboard cleared in another tab
            setClipboardNodeCount(0);
          }
        } catch (error) {
          console.error("❌ Error handling storage event:", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [toast]);

  // Auto-save state management
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>(
    AutoSaveStatus.SAVED
  );
  const [lastSavedVersion, setLastSavedVersion] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a hash of the current map state for change detection
  const generateMapHash = useCallback((currentMap: FullLearningMap) => {
    // Create a stable string representation of the map for comparison
    const mapString = JSON.stringify({
      nodes: currentMap.map_nodes.map((node) => ({
        id: node.id,
        title: node.title,
        instructions: node.instructions,
        difficulty: node.difficulty,
        sprite_url: node.sprite_url,
        position: node.metadata?.position,
        node_type: (node as any).node_type,
      })),
      paths: currentMap.map_nodes.flatMap((node) =>
        (node.node_paths_source || []).map((path) => ({
          id: path.id,
          source: path.source_node_id,
          target: path.destination_node_id,
        }))
      ),
    });
    return btoa(encodeURIComponent(mapString));
  }, []);

  // Auto-save function with enhanced error handling
  const performAutoSave = useCallback(
    async (mapToSave: FullLearningMap) => {
      try {
        setAutoSaveStatus(AutoSaveStatus.SAVING);

        // Call the auto-save API endpoint
        const response = await fetch(`/api/maps/${mapToSave.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mapToSave),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Save failed: ${response.statusText} - ${errorText}`);
        }

        const savedResponse = await response.json();

        // Update tracking state - use the original map since we know it was saved
        const newHash = generateMapHash(mapToSave);
        setLastSavedVersion(newHash);
        setHasUnsavedChanges(false);
        setAutoSaveStatus(AutoSaveStatus.SAVED);

        console.log("🔄 Map auto-saved successfully");

        // Show success feedback for manual saves
        const isManualSave = !saveTimeoutRef.current;
        if (isManualSave) {
          toast({
            title: "Changes saved!",
            description: "All your changes have been saved successfully.",
          });
        }
      } catch (error) {
        console.error("❌ Auto-save failed:", error);
        setAutoSaveStatus(AutoSaveStatus.ERROR);

        // Enhanced error handling with retry button
        toast({
          title: "Save failed",
          description: "Your changes are safe locally. Check your connection.",
          variant: "destructive",
          action: (
            <button
              onClick={() => performAutoSave(mapToSave)}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Retry
            </button>
          ),
        });

        // Auto-retry after 15 seconds if still have unsaved changes
        setTimeout(() => {
          if (hasUnsavedChanges && autoSaveStatus === AutoSaveStatus.ERROR) {
            console.log("🔄 Auto-retrying failed save after 15s...");
            setAutoSaveStatus(AutoSaveStatus.PENDING);
            performAutoSave(mapToSave);
          }
        }, 15000);
      }
    },
    [generateMapHash, hasUnsavedChanges, toast, autoSaveStatus]
  );

  // Debounced auto-save (3 seconds after last change) - TEMPORARILY DISABLED
  const debouncedAutoSave = useCallback(
    debounce((mapToSave: FullLearningMap) => {
      console.log(
        "⚠️ Auto-save temporarily disabled due to server client compatibility issue"
      );
      // TODO: Re-enable after fixing server-side batchUpdateMap function
      // if (hasUnsavedChanges && autoSaveStatus !== AutoSaveStatus.SAVING) {
      //   performAutoSave(mapToSave);
      // }
    }, 3000),
    [performAutoSave, hasUnsavedChanges, autoSaveStatus]
  );

  // Manual/Force save function that bypasses debounce
  const forceSave = useCallback(
    async (mapToSave?: FullLearningMap) => {
      const targetMap = mapToSave || map;

      // Check if there are actually unsaved changes
      const currentHash = generateMapHash(targetMap);
      if (currentHash === lastSavedVersion) {
        toast({
          title: "No changes to save",
          description: "All changes are already saved.",
        });
        return;
      }

      console.log("💾 Force save triggered");

      // Cancel any pending debounced saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Perform immediate save
      try {
        await performAutoSave(targetMap);
        return true; // Success
      } catch (error) {
        console.error("Force save failed:", error);
        return false; // Failure
      }
    },
    [map, generateMapHash, lastSavedVersion, performAutoSave, toast]
  );

  // Emergency save function for page visibility changes
  const emergencySave = useCallback(
    async (targetMap: FullLearningMap) => {
      if (!hasUnsavedChanges) return;

      console.log("🚨 Emergency save triggered");
      try {
        // Try sendBeacon first (more reliable for page unload scenarios)
        const data = JSON.stringify(targetMap);
        const success = navigator.sendBeacon(`/api/maps/${targetMap.id}`, data);

        if (success) {
          console.log("✅ Emergency save via sendBeacon successful");
        } else {
          // Fallback to regular fetch if sendBeacon fails
          console.log("⚠️ sendBeacon failed, trying fetch...");
          await fetch(`/api/maps/${targetMap.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: data,
            keepalive: true, // Important for page unload scenarios
          });
          console.log("✅ Emergency save via fetch successful");
        }
      } catch (error) {
        console.error("❌ Emergency save failed:", error);
        // Store in localStorage as last resort
        try {
          localStorage.setItem(
            `map_backup_${targetMap.id}`,
            JSON.stringify({
              map: targetMap,
              timestamp: new Date().toISOString(),
              hash: generateMapHash(targetMap),
            })
          );
          console.log("💾 Map backed up to localStorage");
        } catch (storageError) {
          console.error("❌ Failed to backup to localStorage:", storageError);
        }
      }
    },
    [hasUnsavedChanges, generateMapHash]
  );

  // Trigger auto-save when map changes
  const triggerAutoSave = useCallback(
    (newMap: FullLearningMap) => {
      const newHash = generateMapHash(newMap);
      console.log("🔍 triggerAutoSave called:", {
        newHash: newHash.substring(0, 10) + "...",
        lastSaved: lastSavedVersion.substring(0, 10) + "...",
        hasChanged: newHash !== lastSavedVersion,
      });

      // Only trigger if there are actual changes
      if (newHash !== lastSavedVersion) {
        console.log("📝 Changes detected - triggering auto-save");
        setHasUnsavedChanges(true);
        setAutoSaveStatus(AutoSaveStatus.PENDING);

        // Cancel any existing save timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Schedule new save
        debouncedAutoSave(newMap);
      } else {
        console.log("⏭️ No changes detected - skipping auto-save");
      }
    },
    [generateMapHash, lastSavedVersion, debouncedAutoSave]
  );

  // Initialize last saved version on mount and check for recovery data
  useEffect(() => {
    const initialHash = generateMapHash(map);
    setLastSavedVersion(initialHash);

    // Check for any backed up data in localStorage
    try {
      const backupKey = `map_backup_${map.id}`;
      const backupData = localStorage.getItem(backupKey);
      if (backupData) {
        const backup = JSON.parse(backupData);
        const backupHash = backup.hash;

        // If backup is newer than current map, offer recovery
        if (backupHash !== initialHash) {
          console.log(
            "🔍 Found localStorage backup that differs from current map"
          );
          toast({
            title: "Recovery available",
            description:
              "Found unsaved changes from a previous session. Would you like to recover them?",
            action: (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // This would need to be implemented to merge/restore the backup
                    console.log("User chose to recover backup");
                    localStorage.removeItem(backupKey);
                    toast({ title: "Recovery feature coming soon!" });
                  }}
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  Recover
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem(backupKey);
                    toast({ title: "Backup discarded" });
                  }}
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium"
                >
                  Discard
                </button>
              </div>
            ),
          });
        } else {
          // Backup is same as current, clean it up
          localStorage.removeItem(backupKey);
        }
      }
    } catch (error) {
      console.error("Error checking localStorage backup:", error);
    }
  }, [map.id, generateMapHash, toast]); // Only run once on mount

  // Unsaved changes warning on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      // If page becomes hidden and we have unsaved changes, try to force save
      if (document.visibilityState === "hidden" && hasUnsavedChanges) {
        emergencySave(map);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasUnsavedChanges, map, emergencySave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Wrapper function for map changes (manual save only - no auto-save)
  const handleMapChange = useCallback(
    (newMap: FullLearningMap) => {
      console.log("🔄 handleMapChange called");
      onMapChange(newMap);
      // Auto-save disabled - users will manually save with "Save All" button
      // triggerAutoSave(newMap);
    },
    [onMapChange]
  );

  // Copy/Paste functionality
  const copyNode = useCallback(async () => {
    const currentSelectedNodes = getSelectedNodes();
    if (currentSelectedNodes.length === 0) {
      toast({
        title: "No nodes selected",
        description: "Please select one or more nodes to copy",
        variant: "destructive",
      });
      return;
    }

    // Deep clone the node data to avoid reference issues
    const nodesToCopy = currentSelectedNodes.map((node) =>
      JSON.parse(JSON.stringify(node.data))
    );

    // Save to localStorage for cross-tab access
    saveCopiedNodesToStorage(nodesToCopy);

    // Clear the system text clipboard to ensure only islands can be pasted
    try {
      await navigator.clipboard.writeText("");
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      console.log("Clipboard API not available");
    }

    const nodeCount = nodesToCopy.length;
    toast({
      title: `${nodeCount} node${nodeCount > 1 ? "s" : ""} copied!`,
      description:
        nodeCount === 1
          ? `"${nodesToCopy[0].title}" copied to cross-tab clipboard`
          : `${nodeCount} nodes copied to cross-tab clipboard`,
    });
  }, [getSelectedNodes, toast, saveCopiedNodesToStorage]);

  const pasteNode = useCallback(async () => {
    // Load copied nodes from localStorage (cross-tab clipboard)
    const copiedNodes = loadCopiedNodesFromStorage();

    if (!copiedNodes || copiedNodes.length === 0) {
      toast({
        title: "Nothing to paste",
        description: "Copy one or more nodes first using Ctrl+C",
        variant: "destructive",
      });
      return;
    }

    try {

    // Calculate base paste position (center of visible viewport)
    let basePastePosition = { x: 150, y: 150 }; // Default fallback

    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const currentSelectedNode = getSelectedNode();
      const panelOffset = currentSelectedNode ? 0.35 : 0; // Account for right panel
      const visibleCanvasWidth = window.innerWidth * (1 - panelOffset);

      basePastePosition = {
        x: (-viewport.x + visibleCanvasWidth / 2) / viewport.zoom,
        y: (-viewport.y + window.innerHeight / 2) / viewport.zoom,
      };
    }

    console.log("💾 Creating pasted nodes with temporary IDs for later saving...");

    // Calculate the bounding box of all copied nodes to preserve relative positioning
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    copiedNodes.forEach((node) => {
      if (node.metadata?.position) {
        const pos = node.metadata.position;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x);
        maxY = Math.max(maxY, pos.y);
      }
    });

    // Calculate center of original selection
    const originalCenter = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };

    // Check if we need to offset to avoid overlapping with original
    const groupWidth = maxX - minX;
    const groupHeight = maxY - minY;
    const distanceFromOriginal = Math.sqrt(
      Math.pow(basePastePosition.x - originalCenter.x, 2) +
        Math.pow(basePastePosition.y - originalCenter.y, 2)
    );

    // If pasting too close to original, add offset
    const finalPastePosition = { ...basePastePosition };
    if (distanceFromOriginal < Math.max(groupWidth, groupHeight, 150)) {
      finalPastePosition.x += 100;
      finalPastePosition.y += 100;
    }

    // Create nodes with temporary IDs (to be saved later with Save All)
    const newNodes: AppNode[] = [];
    const newNodeData: (MapNode & {
      node_paths_source: any[];
      node_paths_destination: any[];
      node_content: any[];
      node_assessments: any[];
    })[] = [];

    // Process each node: create with temporary IDs for later saving
    for (let index = 0; index < copiedNodes.length; index++) {
      const copiedNode = copiedNodes[index];
      
      // Calculate position preserving relative layout
      let nodePosition;
      if (copiedNode.metadata?.position && copiedNodes.length > 1) {
        // For multiple nodes, preserve relative positioning
        const originalPos = copiedNode.metadata.position;
        const relativeToCenter = {
          x: originalPos.x - originalCenter.x,
          y: originalPos.y - originalCenter.y,
        };
        nodePosition = {
          x: finalPastePosition.x + relativeToCenter.x,
          y: finalPastePosition.y + relativeToCenter.y,
        };
      } else {
        // For single nodes, use the paste position directly
        nodePosition = finalPastePosition;
      }

      // Create node with temporary ID
      const tempId = `temp_node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const nodeData = {
        id: tempId,
        map_id: map.id,
        title:
          copiedNodes.length === 1
            ? `${copiedNode.title} (Copy)`
            : `${copiedNode.title} (Copy ${index + 1})`,
        instructions: copiedNode.instructions || "",
        difficulty: copiedNode.difficulty || 1,
        sprite_url: copiedNode.sprite_url,
        metadata: {
          ...copiedNode.metadata,
          position: nodePosition,
        },
        node_type: copiedNode.node_type || "learning",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        last_modified_by: null,
        node_paths_source: [], // Don't copy connections
        node_paths_destination: [], // Don't copy connections
        node_content: [],
        node_assessments: [],
      };

      console.log("✅ Created pasted node with temporary ID:", tempId);

      // Create copied assessments with temp IDs for proper saving
      const copiedAssessments = (copiedNode.node_assessments || []).map((assessment: any) => {
        const tempAssessmentId = `temp_assessment_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        
        // Copy quiz questions with temp IDs too
        const copiedQuizQuestions = (assessment.quiz_questions || []).map((question: any) => ({
          ...question,
          id: `temp_question_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          assessment_id: tempAssessmentId,
        }));

        return {
          ...assessment,
          id: tempAssessmentId,
          node_id: tempId, // Update to the new temporary node ID
          quiz_questions: copiedQuizQuestions,
        };
      });

      // Add assessments to the nodeData
      nodeData.node_assessments = copiedAssessments;

      const newNode: AppNode = {
        id: tempId, // Use temporary ID
        position: nodePosition,
        data: nodeData,
        type: copiedNode.node_type === "text" ? "text" : "default",
        draggable: true,
        connectable: copiedNode.node_type !== "text",
        selectable: true,
        style: NODE_STYLE,
      };

      newNodes.push(newNode);
      newNodeData.push(nodeData);
    }

    // Clear ReactFlow's selection state
    if (reactFlowInstance) {
      const currentNodes = reactFlowInstance.getNodes();
      const clearedNodes = currentNodes.map((node) => ({
        ...node,
        selected: false,
      }));
      reactFlowInstance.setNodes(clearedNodes);
    }

    // Update React Flow state with new nodes
    setNodes((nds) => [...nds, ...(newNodes as Node[])]);

    // Update map state with nodes that have temporary IDs (will be saved with Save All)
    const updatedMap = {
      ...map,
      map_nodes: [...map.map_nodes, ...newNodeData],
    };
    handleMapChange(updatedMap);

    const nodeCount = copiedNodes.length;
    toast({
      title: `${nodeCount} node${nodeCount > 1 ? "s" : ""} pasted!`,
      description:
        nodeCount === 1
          ? `"${newNodeData[0].title}" added to map`
          : `${nodeCount} nodes added to map`,
    });

    } catch (error) {
      console.error("❌ Failed to paste nodes:", error);
      toast({
        title: "Failed to paste nodes",
        description: (error as Error).message || "Unknown error",
        variant: "destructive",
      });
    }
  }, [
    loadCopiedNodesFromStorage,
    reactFlowInstance,
    getSelectedNode,
    map,
    handleMapChange,
    setNodes,
    toast,
  ]);

  // Keyboard shortcuts (respect editable contexts)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (isEditable(event.target)) return;

      // Check for modifier key (Ctrl on Windows/Linux, Cmd on Mac)
      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (!isModifierPressed) return;

      const key = event.key?.toLowerCase?.() ?? event.key;

      switch (key) {
        case "c":
          // Copy node when not typing
          event.preventDefault();
          copyNode();
          break;
        case "v":
          // Paste nodes only if we have some in clipboard; otherwise allow normal paste
          const clipboardNodes = loadCopiedNodesFromStorage();
          if (clipboardNodes && clipboardNodes.length > 0) {
            event.preventDefault();
            pasteNode();
          }
          break;
        case "s":
          // Force save with Ctrl+S
          event.preventDefault();
          forceSave();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copyNode, pasteNode, loadCopiedNodesFromStorage, forceSave]);

  // Transform map data to React Flow format - but NOT during operations that would cause deselection
  useEffect(() => {
    // CRITICAL: Don't regenerate nodes during operations that would cause deselection/flashing
    if (
      isUpdatingNodeData ||
      isUpdatingAssessment ||
      isAddingNode ||
      isDeletingNode ||
      isSelectionDragging ||
      isRestoringSelection ||
      isManuallySelecting ||
      isDraggingNodes
    ) {
      console.log("⏭️ Skipping node transformation during operation:", {
        isUpdatingNodeData,
        isUpdatingAssessment,
        isAddingNode,
        isDeletingNode,
        isSelectionDragging,
        isRestoringSelection,
        isManuallySelecting,
        isDraggingNodes,
      });
      return;
    }

    // Debounce rapid successive transforms to prevent selection flicker
    if (transformTimeoutRef.current) {
      clearTimeout(transformTimeoutRef.current);
    }
    
    transformTimeoutRef.current = setTimeout(() => {

    // Capture current selection state BEFORE transformation
    const currentSelected = reactFlowInstance?.getNodes().filter(n => n.selected) || [];
    const selectedIds = currentSelected.map(n => n.id);
    
    console.log("🔄 TRANSFORM START - Preserving selection:", {
      selectedCount: currentSelected.length,
      selectedIds: selectedIds,
      transformTrigger: "map data change"
    });
    
    console.log("🗂️ Map nodes being transformed:", map.map_nodes.length);
    
    const transformedNodes: AppNode[] = map.map_nodes.map((node) => {
      const nodeType = (node as any).node_type === "text" ? "text" : "default";
      
      // Preserve existing selection state and position from current nodes
      const existingNode = reactFlowInstance?.getNode(node.id);
      // For newly created nodes, only select if it's the newly created node
      // For existing nodes, preserve their current selection state
      const isSelected = newlyCreatedNodeId 
        ? node.id === newlyCreatedNodeId 
        : (existingNode?.selected || false);
      // Use current position if node exists in ReactFlow, otherwise use stored metadata position
      const currentPosition = existingNode?.position || (node.metadata as any)?.position || getRandomPosition();
      
      if (isSelected) {
        console.log(`📌 Preserving selection for node: ${node.id}`);
      }

      return {
        id: node.id,
        type: nodeType,
        data: { ...node, node_type: (node as any).node_type || "learning" },
        position: currentPosition,
        draggable: true, // Re-enable dragging for natural ReactFlow behavior
        connectable: nodeType !== "text", // Text nodes can't be connected
        selectable: true,
        selected: isSelected, // CRITICAL: Preserve selection state for pulse rings
        style: NODE_STYLE,
      };
    });

    const transformedEdges: AppEdge[] = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source?.forEach((path) => {
        transformedEdges.push({
          id: path.id,
          source: path.source_node_id,
          target: path.destination_node_id,
          type: "floating",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: EDGE_STYLE,
        });
      });
    });

    setNodes(transformedNodes as Node[]);
    setEdges(transformedEdges);

    // Check selection state immediately after setNodes
    setTimeout(() => {
      const afterSelected = reactFlowInstance?.getNodes().filter(n => n.selected) || [];
      console.log("🔄 TRANSFORM END - Selection after setNodes:", {
        beforeCount: selectedIds.length,
        afterCount: afterSelected.length,
        beforeIds: selectedIds,
        afterIds: afterSelected.map(n => n.id),
        selectionLost: selectedIds.length > 0 && afterSelected.length === 0,
        selectionChanged: JSON.stringify(selectedIds.sort()) !== JSON.stringify(afterSelected.map(n => n.id).sort())
      });
      
      if (selectedIds.length > 0 && afterSelected.length === 0) {
        console.error("🚨 SELECTION LOST during transform! Restoring:", selectedIds);
        
        setIsRestoringSelection(true);
        
        // Restore lost selection
        const allNodes = reactFlowInstance?.getNodes() || [];
        const restoredNodes = allNodes.map(node => ({
          ...node,
          selected: selectedIds.includes(node.id)
        }));
        
        reactFlowInstance?.setNodes(restoredNodes);
        console.log("✅ Selection restored for nodes:", selectedIds);
        
        // Clear the restoration flag after a brief delay
        setTimeout(() => {
          setIsRestoringSelection(false);
        }, 100);
      }
    }, 0);
    }, 50); // 50ms debounce for transforms
    
    // Cleanup timeout on unmount
    return () => {
      if (transformTimeoutRef.current) {
        clearTimeout(transformTimeoutRef.current);
      }
    };
  }, [map, setNodes, setEdges, isUpdatingNodeData, isUpdatingAssessment, isAddingNode, isDeletingNode, isSelectionDragging, isRestoringSelection, isManuallySelecting, isDraggingNodes, reactFlowInstance]);


  // ReactFlow handles node data and selection internally - no manual sync needed

  // Add node handler - immediately saves to database
  const handleAddNode = useCallback(async () => {
    console.log("🆕 Adding new node - saving to database immediately");
    setIsAddingNode(true);

    // Mark that we're creating a new node to control selection in transform effect
    setNewlyCreatedNodeId("creating");

    try {
      // Get center of current viewport
      let nodePosition = { x: 100, y: 100 }; // Default position

      if (reactFlowInstance) {
        const viewport = reactFlowInstance.getViewport();
        
        // Calculate the center of the visible viewport
        // Account for the right panel if a node is selected
        const currentSelectedNode = getSelectedNode();
        const panelOffset = currentSelectedNode ? 0.35 : 0; // 35% for right panel
        const visibleCanvasWidth = window.innerWidth * (1 - panelOffset);

        nodePosition = {
          x: (-viewport.x + visibleCanvasWidth / 2) / viewport.zoom,
          y: (-viewport.y + window.innerHeight / 2) / viewport.zoom,
        };
      }

      // Save node directly to database
      const savedNode = await createNode({
        map_id: map.id,
        title: "New Node",
        instructions: "",
        difficulty: 1,
        sprite_url: null,
        metadata: {
          position: nodePosition,
        },
        node_type: "learning"
      });

      console.log("✅ Node saved to database with ID:", savedNode.id);
      
      // Set the newly created node ID for selection control
      setNewlyCreatedNodeId(savedNode.id);

      // Create the full node data structure for local state
      const newNodeData: MapNode & {
        node_paths_source: any[];
        node_paths_destination: any[];
        node_content: any[];
        node_assessments: any[];
      } = {
        ...savedNode,
        node_paths_source: [],
        node_paths_destination: [],
        node_content: [],
        node_assessments: [],
      };

      const newNode: AppNode = {
        id: savedNode.id,
        position: nodePosition,
        data: newNodeData,
        type: "default",
        draggable: true,
        connectable: true,
        selectable: true,
        selected: true, // Auto-select the new node
        style: NODE_STYLE,
      };

      // Add the new selected node (existing nodes already cleared above)
      setNodes((nds) => [...nds, newNode as Node]);

      // Update map state
      const updatedMap = {
        ...map,
        map_nodes: [...map.map_nodes, newNodeData],
      };

      handleMapChange(updatedMap as any);

      toast({ 
        title: "Node Created!", 
        description: "Node was saved to the database and is ready for use."
      });

    } catch (error) {
      console.error("❌ Failed to create node:", error);
      toast({
        title: "Failed to create node",
        description: "Could not save the node to the database. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingNode(false);
      // Clear the newly created node flag after a delay to allow transform to complete
      setTimeout(() => {
        setNewlyCreatedNodeId(null);
      }, 200);
    }
  }, [
    map,
    setNodes,
    toast,
    reactFlowInstance,
    getSelectedNode,
    handleMapChange,
  ]);

  // Add text node handler - immediately saves to database
  const handleAddTextNode = useCallback(async () => {
    console.log("🆕 Adding new text node - saving to database immediately");
    setIsAddingNode(true);

    // Mark that we're creating a new text node to control selection in transform effect
    setNewlyCreatedNodeId("creating");

    try {
      // Get center of current viewport
      let nodePosition = { x: 150, y: 150 }; // Default position

      if (reactFlowInstance) {
        const viewport = reactFlowInstance.getViewport();
        const currentSelectedNode = getSelectedNode();
        const panelOffset = currentSelectedNode ? 0.35 : 0; // 35% for right panel
        const visibleCanvasWidth = window.innerWidth * (1 - panelOffset);

        nodePosition = {
          x: (-viewport.x + visibleCanvasWidth / 2) / viewport.zoom,
          y: (-viewport.y + window.innerHeight / 2) / viewport.zoom,
        };
      }

      // Save text node directly to database
      const savedNode = await createNode({
        map_id: map.id,
        title: "Double-click to edit",
        instructions: null,
        difficulty: 1,
        sprite_url: null,
        metadata: {
          position: nodePosition,
          fontSize: "16px",
          textColor: "#d5e5ff",
          backgroundColor: "transparent",
          fontWeight: "normal",
          textAlign: "center",
        },
        node_type: "text"
      });

      console.log("✅ Text node saved to database with ID:", savedNode.id);
      
      // Set the newly created node ID for selection control
      setNewlyCreatedNodeId(savedNode.id);

      // Create the full node data structure for local state
      const newTextData: MapNode & {
        node_paths_source: any[];
        node_paths_destination: any[];
        node_content: any[];
        node_assessments: any[];
        node_type: string;
      } = {
        ...savedNode,
        node_type: "text",
        node_paths_source: [],
        node_paths_destination: [],
        node_content: [],
        node_assessments: [],
      };

      const newNode: AppNode = {
        id: savedNode.id,
        position: nodePosition,
        data: newTextData,
        type: "text",
        draggable: true,
        connectable: false, // Text nodes shouldn't connect
        selectable: true,
        selected: true, // Auto-select the new text node
        style: NODE_STYLE,
      };

      // Add the new selected text node (existing nodes already cleared above)
      setNodes((nds) => [...nds, newNode as Node]);

      // Update map state
      const updatedMap = {
        ...map,
        map_nodes: [...map.map_nodes, newTextData],
      };
      handleMapChange(updatedMap as any);

      toast({ 
        title: "Text Node Created!", 
        description: "Text node was saved to the database and is ready for editing."
      });

    } catch (error) {
      console.error("❌ Failed to create text node:", error);
      toast({
        title: "Failed to create text node",
        description: "Could not save the text node to the database. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingNode(false);
      // Clear the newly created node flag after a delay to allow transform to complete
      setTimeout(() => {
        setNewlyCreatedNodeId(null);
      }, 200);
    }
  }, [
    map,
    setNodes,
    toast,
    reactFlowInstance,
    getSelectedNode,
    handleMapChange,
  ]);

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      // Validate connection
      if (params.source === params.target) {
        toast({
          title: "Cannot connect node to itself",
          variant: "destructive",
        });
        return;
      }

      const existingConnection = edges.find(
        (edge) => edge.source === params.source && edge.target === params.target
      );
      if (existingConnection) {
        toast({ title: "Connection already exists", variant: "destructive" });
        return;
      }

      // Create new edge with better temp ID handling
      const tempId = generateTempId("temp_path");
      const newEdge: AppEdge = {
        id: tempId,
        ...params,
        type: "floating",
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      // Update map state with proper temp ID tracking
      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => {
          if (node.id === params.source) {
            const newPath = {
              id: tempId,
              source_node_id: params.source!,
              destination_node_id: params.target!,
            };

            return {
              ...node,
              node_paths_source: [
                ...(Array.isArray(node.node_paths_source)
                  ? node.node_paths_source
                  : []),
                newPath,
              ],
            };
          }
          return node;
        }),
      };

      console.log("🔗 Created path:", {
        tempId,
        source: params.source,
        target: params.target,
      });
      handleMapChange(updatedMap);
      toast({ title: "Path created!" });
    },
    [setEdges, edges, toast, map, onMapChange]
  );

  // Node deletion handler
  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      const deletedIds = deleted.map((node) => node.id);

      console.log(
        "🗑️ ReactFlow deleting nodes - preventing full refresh:",
        deletedIds
      );
      setIsDeletingNode(true);

      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes
          .filter((node) => !deletedIds.includes(node.id))
          .map((node) => ({
            ...node,
            node_paths_source: (node.node_paths_source || []).filter(
              (path) => !deletedIds.includes(path.destination_node_id)
            ),
            node_paths_destination: (node.node_paths_destination || []).filter(
              (path) => !deletedIds.includes(path.source_node_id)
            ),
          })),
      };

      handleMapChange(updatedMap);

      // ReactFlow will automatically clear selection for deleted nodes

      // Clear the blocking flag after deletion is complete
      setTimeout(() => {
        setIsDeletingNode(false);
        console.log(
          "✅ ReactFlow delete operation complete - full refresh re-enabled"
        );
      }, 100);

      deleted.forEach((node) => {
        toast({ title: `Node "${node.data.title}" deleted (Auto-saving)` });
      });
    },
    [toast, map, handleMapChange]
  );

  // Edge deletion handler
  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      const deletedIds = deleted.map((edge) => edge.id);

      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => ({
          ...node,
          node_paths_source: (node.node_paths_source || []).filter(
            (path) => !deletedIds.includes(path.id)
          ),
          node_paths_destination: (node.node_paths_destination || []).filter(
            (path) => !deletedIds.includes(path.id)
          ),
        })),
      };

      handleMapChange(updatedMap);
      toast({ title: "Path deleted (Auto-saving)" });
    },
    [toast, map, onMapChange]
  );




  // Simplified selection change handler - ReactFlow is source of truth
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedNodeIds = params.nodes.map((n) => n.id);
      console.log("🔍 onSelectionChange called:", {
        nodeIds: selectedNodeIds,
        nodeCount: params.nodes.length,
        isSelectionDragging,
      });

      // Handle panel opening logic based on ReactFlow's selection
      if (params.nodes.length > 1) {
        // Multiple nodes selected - collapse right panel
        console.log(
          `Selected ${params.nodes.length} nodes - closing editor panel`
        );
        if (rightPanelRef.current && leftPanelRef.current) {
          rightPanelRef.current.resize(0);
          leftPanelRef.current.resize(100);
        }
      } else if (params.nodes.length === 1 && !isSelectionDragging) {
        // Single node selected and NOT during drag operation - open editor
        console.log(
          "Single node selected - opening editor panel"
        );
        if (rightPanelRef.current && leftPanelRef.current) {
          rightPanelRef.current.resize(35);
          leftPanelRef.current.resize(65);
        }
      } else if (params.nodes.length === 0) {
        // No nodes selected - panel will disappear automatically
        console.log("No nodes selected - editor panel will close");
      }
    },
    [isSelectionDragging, rightPanelRef, leftPanelRef]
  );

  // Enhanced node data change handler to capture quiz questions
  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Partial<MapNode>) => {
      console.log(
        "🔧 MapEditor: Node data change for",
        nodeId,
        Object.keys(data)
      );

      // If this update includes assessments with quiz questions, track them
      if (data.node_assessments) {
        const assessment = data.node_assessments[0];
        if (
          assessment?.assessment_type === "quiz" &&
          assessment.quiz_questions
        ) {
          console.log(
            "📊 MapEditor: Tracking quiz questions for node",
            nodeId,
            assessment.quiz_questions.length
          );
          setPendingQuizQuestions((prev) => ({
            ...prev,
            [nodeId]: assessment.quiz_questions || [],
          }));
        }
      }

      // Prevent React Flow visual updates for operations that don't need them
      const isTitleOnlyUpdate =
        Object.keys(data).length === 1 && data.title !== undefined;
      const isEditingComplete = data.updated_at !== undefined; // Signal from blur handler
      const isAssessmentUpdate = data.node_assessments !== undefined;
      const isContentUpdate = data.node_content !== undefined;

      // Set flag to prevent selection changes during node data updates
      if (isAssessmentUpdate) {
        setIsUpdatingAssessment(true);
      } else {
        setIsUpdatingNodeData(true);
      }

      // Only update React Flow visual nodes for specific cases to prevent flashing
      // ALWAYS allow assessment updates to show in UI (both add and delete)
      const shouldUpdateVisuals =
        isEditingComplete ||
        isAssessmentUpdate ||
        (!isTitleOnlyUpdate && !isContentUpdate);

      if (shouldUpdateVisuals) {
        console.log(
          "🔄 Updating React Flow nodes:",
          Object.keys(data),
          "Assessment update:",
          isAssessmentUpdate
        );
        if (isAssessmentUpdate) {
          console.log(
            "📊 Assessment data being applied:",
            data.node_assessments
          );
        }
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === nodeId) {
              const newData = { ...node.data, ...data };
              return { ...node, data: newData };
            }
            return node;
          })
        );
      } else {
        console.log(
          "⏭️ Skipping React Flow visual update for:",
          Object.keys(data),
          "to prevent flashing"
        );
      }

      // Clear the flag after a short delay to allow React Flow to process the update
      if (isAssessmentUpdate) {
        setTimeout(() => {
          console.log(
            "🔓 Clearing isUpdatingAssessment - allowing transform to run"
          );
          setIsUpdatingAssessment(false);
        }, 100); // Longer delay for assessment updates to ensure map state is updated first
      } else {
        setTimeout(() => {
          setIsUpdatingNodeData(false);
        }, 50);
      }

      // ReactFlow will handle node data updates internally

      // Always update map state (this is needed for persistence)
      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => {
          if (node.id === nodeId) {
            const updatedNode = { ...node, ...data };
            if (isAssessmentUpdate) {
              console.log(
                "📊 Updating map node with assessment data:",
                updatedNode.node_assessments
              );
            }
            return updatedNode;
          }
          return node;
        }),
      };

      console.log("📝 Calling handleMapChange with updated map");
      handleMapChange(updatedMap as any);
    },
    [map, handleMapChange, setNodes]
  );

  // Use stable node types to prevent React Flow warnings

  // Node delete handler
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find((node) => node.id === nodeId);
      if (!nodeToDelete) return;

      console.log("🗑️ Deleting node - preventing full refresh:", nodeId);

      // Block selection changes and full refresh during deletion
      setIsUpdatingNodeData(true);
      setIsDeletingNode(true);

      // Remove from React Flow state immediately (no refresh)
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );

      // Update map state
      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes
          .filter((node) => node.id !== nodeId)
          .map((node) => ({
            ...node,
            node_paths_source: (node.node_paths_source || []).filter(
              (path) => path.destination_node_id !== nodeId
            ),
            node_paths_destination: (node.node_paths_destination || []).filter(
              (path) => path.source_node_id !== nodeId
            ),
          })),
      };

      handleMapChange(updatedMap);

      // ReactFlow will automatically handle selection updates

      // Clear the blocking flags after deletion is complete
      setTimeout(() => {
        setIsUpdatingNodeData(false);
        setIsDeletingNode(false);
        console.log(
          "✅ Node delete operation complete - full refresh re-enabled"
        );
      }, 100);

      toast({
        title: `Node "${nodeToDelete.data.title}" deleted (Auto-saving)`,
      });
    },
    [
      nodes,
      setNodes,
      setEdges,
      map,
      handleMapChange,
      toast,
    ]
  );

  // Handle node saving when a temporary node gets a real ID
  const handleNodeSaved = useCallback((oldNodeId: string, newNodeId: string) => {
    console.log("💾 Node saved, updating ID from", oldNodeId, "to", newNodeId);

    // Set flags to prevent transforms during the ID update process
    setIsUpdatingNodeData(true);
    
    // Preserve current selection state before any updates
    const currentNodes = reactFlowInstance?.getNodes() || [];
    const wasSelected = currentNodes.find(n => n.id === oldNodeId)?.selected || false;
    
    console.log("🔍 Selection state before update:", {
      oldNodeId,
      newNodeId, 
      wasSelected,
      totalNodes: currentNodes.length
    });

    // Update React Flow nodes with preserved selection
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === oldNodeId) {
          return { 
            ...node, 
            id: newNodeId,
            selected: wasSelected // Preserve selection state
          };
        }
        return node;
      })
    );

    // Update React Flow edges
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        source: edge.source === oldNodeId ? newNodeId : edge.source,
        target: edge.target === oldNodeId ? newNodeId : edge.target,
      }))
    );

    // Update map state WITHOUT triggering handleMapChange (which causes refresh)
    // We'll update the map state directly to avoid triggering transforms
    const updatedMapState = {
      ...map,
      map_nodes: map.map_nodes.map((node) =>
        node.id === oldNodeId ? { ...node, id: newNodeId } : node
      ),
    };
    
    // Update the map state directly without triggering auto-save or transforms
    onMapChange(updatedMapState);

    // Clear the update flag after a brief delay
    setTimeout(() => {
      setIsUpdatingNodeData(false);
      console.log("✅ Node ID update complete, transforms re-enabled");
    }, 100);

    toast({
      title: "Node saved",
      description: "The node is now available for assessments.",
    });
  }, [setNodes, setEdges, map, onMapChange, reactFlowInstance, toast]);

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Canvas Area */}
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={getSelectedNode() ? 65 : 100}
          minSize={40}
          maxSize={85}
          className="relative transition-[width] duration-300 ease-in-out"
        >
          <div className="h-full w-full bg-slate-50 dark:bg-slate-950 relative">
            {/* Enhanced Floating Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg">
              <Button 
                onClick={handleAddNode} 
                size="sm" 
                className="gap-2" 
                disabled={isAddingNode}
              >
                {isAddingNode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isAddingNode ? "Creating..." : "Add Node"}
              </Button>
              <Button
                onClick={handleAddTextNode}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={isAddingNode}
              >
                {isAddingNode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Type className="h-4 w-4" />
                )}
                {isAddingNode ? "Creating..." : "Add Text"}
              </Button>

              {/* Copy/Paste buttons */}
              <div className="h-4 w-px bg-border" />
              <Button
                onClick={copyNode}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={getSelectedNodes().length === 0}
                title={`Copy ${getSelectedNodes().length} selected node${getSelectedNodes().length !== 1 ? "s" : ""} (Ctrl+C)`}
              >
                <Copy className="h-4 w-4" />
                Copy
                {getSelectedNodes().length > 1 ? ` (${getSelectedNodes().length})` : ""}
              </Button>
              <Button
                onClick={pasteNode}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={clipboardNodeCount === 0}
                title={`Paste ${clipboardNodeCount} node${clipboardNodeCount !== 1 ? "s" : ""} (Ctrl+V)${clipboardNodeCount > 0 ? " - works across tabs!" : ""}`}
              >
                <Clipboard className="h-4 w-4" />
                Paste
                {clipboardNodeCount > 1
                  ? ` (${clipboardNodeCount})`
                  : ""}
              </Button>

              {/* Save functionality - re-enabled now that content/assessments save directly */}
              {true && (
                <>

                  {/* Enhanced Auto-save status indicator */}
                  <div className="flex items-center gap-2 px-2">
                    <div className="flex items-center gap-1">
                      {autoSaveStatus === AutoSaveStatus.SAVED && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">
                            All Saved
                          </span>
                        </>
                      )}
                      {autoSaveStatus === AutoSaveStatus.SAVING && (
                        <>
                          <Save className="h-4 w-4 text-blue-500 animate-pulse" />
                          <span className="text-sm font-medium text-blue-600">
                            Saving...
                          </span>
                        </>
                      )}
                      {autoSaveStatus === AutoSaveStatus.PENDING && (
                        <>
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium text-amber-600">
                            Unsaved Changes
                          </span>
                        </>
                      )}
                      {autoSaveStatus === AutoSaveStatus.ERROR && (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                          <span className="text-sm font-medium text-red-600">
                            Save Failed
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2 h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => forceSave()}
                            title="Retry saving now"
                          >
                            Retry
                          </Button>
                        </>
                      )}
                    </div>
                    {hasUnsavedChanges && (
                      <div
                        className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"
                        title="You have unsaved changes"
                      />
                    )}
                  </div>
                </>
              )}

              <div className="h-4 w-px bg-border" />
              <div className="text-xs text-muted-foreground px-2">
                {nodes.length} nodes • {edges.length} paths
                {getSelectedNodes().length > 1 && (
                  <span className="text-blue-500 font-medium ml-2">
                    • {getSelectedNodes().length} selected
                  </span>
                )}
              </div>
            </div>

            {/* Keyboard Shortcuts Helper */}
            <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-3 shadow-lg max-w-xs">
              <div className="text-xs font-medium mb-2">Quick Actions</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Add Node</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">+</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Copy Node</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                    Ctrl+C
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span>Paste Node</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                    Ctrl+V
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span>Delete Selected</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                    Del
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span>Multi-Select</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                    Ctrl + Click/Drag
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span>Pan Canvas</span>
                  <span className="text-xs">Space + Drag</span>
                </div>
                <div className="flex justify-between">
                  <span>Zoom</span>
                  <span className="text-xs">Mouse Wheel</span>
                </div>
              </div>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodesDelete={onNodesDelete}
              onEdgesDelete={onEdgesDelete}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onSelectionStart={() => {
                console.log("🎯 Selection drag started");
                setIsSelectionDragging(true);
              }}
              onSelectionEnd={() => {
                console.log("🎯 Selection drag ended");
                setTimeout(() => {
                  setIsSelectionDragging(false);
                }, 50);
              }}
              onNodeDragStart={(event, node) => {
                console.log("🚀 Node drag started:", node.id);
                const startPos = { x: event.clientX, y: event.clientY };
                setDragStartPos(startPos);
                setDragDistance(0);
                setIsDraggingNodes(true);
              }}
              onNodeDrag={(event, node) => {
                if (dragStartPos) {
                  const distance = Math.sqrt(
                    Math.pow(event.clientX - dragStartPos.x, 2) + 
                    Math.pow(event.clientY - dragStartPos.y, 2)
                  );
                  setDragDistance(distance);
                  // Only log drag distance at key thresholds to avoid spam
                  if (distance === 0 || distance % 10 < 1 || distance < 5) {
                    console.log("📏 Drag distance:", distance.toFixed(2) + "px");
                  }
                }
              }}
              onNodeDragStop={(event, node, nodes) => {
                console.log("🛑 Node drag stopped:", node.id, "Distance:", dragDistance.toFixed(2) + "px");
                
                // If drag distance is very small, treat as a failed click
                const CLICK_FALLBACK_THRESHOLD = 5; // pixels
                if (dragDistance < CLICK_FALLBACK_THRESHOLD) {
                  console.log("🖱️ Treating minimal drag as click:", node.id, "Distance:", dragDistance.toFixed(2) + "px");
                  const isMultiSelect = event.ctrlKey || event.metaKey;
                  handleNodeSelection(node, isMultiSelect, "drag-to-click fallback");
                } else {
                  // Genuine drag - update position in metadata
                  const updatedNode = nodes.find(n => n.id === node.id);
                  if (updatedNode) {
                    console.log("💾 Saving new position:", updatedNode.position);
                    handleNodeDataChange(node.id, {
                      metadata: {
                        ...(node.data.metadata || {}),
                        position: updatedNode.position
                      }
                    });
                  }
                }
                
                // Reset drag tracking
                setDragStartPos(null);
                setDragDistance(0);
                setTimeout(() => {
                  setIsDraggingNodes(false);
                }, 100);
              }}
              
              onPaneClick={() => {
                console.log("🖱️ Canvas clicked - deselecting all nodes");
                if (!reactFlowInstance) return;
                
                // Manually deselect all nodes
                const currentNodes = reactFlowInstance.getNodes();
                const deselectedNodes = currentNodes.map(n => ({ ...n, selected: false }));
                reactFlowInstance.setNodes(deselectedNodes);
              }}
              onNodeClick={(event, node) => {
                console.log("🖱️ Node clicked:", node.id, "Ctrl/Cmd:", event.ctrlKey || event.metaKey);
                const isMultiSelect = event.ctrlKey || event.metaKey;
                handleNodeSelection(node, isMultiSelect, "onNodeClick");
              }}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              snapToGrid={true}
              snapGrid={[20, 20]}
              fitView
              attributionPosition="bottom-left"
              panOnScroll
              selectionOnDrag={true} // Enable multi-select box dragging
              multiSelectionKeyCode={["Meta", "Control"]} // Only allow multi-select with Ctrl/Cmd  
              selectNodesOnDrag={false} // Handle selection manually to avoid drag conflicts
              panOnDrag={[2]} // Only right mouse button for panning
              nodeDragThreshold={15} // Increase threshold to prevent accidental drags
              connectionMode={ConnectionMode.Loose}
              deleteKeyCode={["Delete", "Backspace"]}
            >
              <Background gap={20} size={1} color="#94a3b8" />
              <MiniMap
                position="bottom-right"
                nodeBorderRadius={8}
                nodeStrokeWidth={2}
                nodeColor={(node) => {
                  if (node.selected) return "#3b82f6";
                  switch (node.type) {
                    case "input":
                      return "#4CAF50";
                    case "output":
                      return "#9C27B0";
                    default:
                      return "#FF9800";
                  }
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
                nodeStrokeColor="#ffffff"
                bgColor="#f8fafc"
                maskColor="rgba(255, 255, 255, 0.7)"
                maskStrokeColor="#e2e8f0"
                maskStrokeWidth={1}
                pannable
                zoomable
                ariaLabel="Map overview"
                offsetScale={5}
              />
            </ReactFlow>
          </div>
        </ResizablePanel>

        {/* Node Editor Panel */}
        {getSelectedNode() && (
          <>
            <ResizableHandle
              withHandle
              className="w-1.5 bg-border hover:bg-primary/20 transition-colors"
            />
            <ResizablePanel
              ref={rightPanelRef}
              defaultSize={35}
              minSize={25}
              maxSize={60}
              className="transition-all duration-300 ease-in-out border-l bg-background"
            >
              <div className="h-full overflow-hidden">
                <NodeEditorPanel
                  selectedNode={getSelectedNode()}
                  onNodeDataChange={handleNodeDataChange}
                  onNodeDelete={handleDeleteNode}
                  onEditingStateChange={setIsEditingNode}
                  mapId={map.id}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

// Wrapper component that provides ReactFlow context
export function MapEditorWithProvider({ map, onMapChange }: MapEditorProps) {
  return (
    <ReactFlowProvider>
      <MapEditor map={map} onMapChange={onMapChange} />
    </ReactFlowProvider>
  );
}
