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
  OnNodeDrag,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { FullLearningMap } from "@/lib/supabase/maps";
import { MapNode, QuizQuestion } from "@/types/map";
import { Plus, Copy, Clipboard, Type, Save, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { NodeEditorPanel } from "./NodeEditorPanel";
import FloatingEdge, { FloatingEdgeEdit } from "./FloatingEdge";
import { isEditable } from "@/lib/dom/is-editable";

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
  SAVED = 'saved',
  SAVING = 'saving',
  PENDING = 'pending',
  ERROR = 'error'
}

// Custom node component - memoized for better performance
const CustomNode = React.memo(({
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
  const spriteUrl = useMemo(() => data.sprite_url || "/islands/crystal.png", [data.sprite_url]);
  
  // Memoize click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (id && onClick) {
      onClick(id);
    }
  }, [id, onClick]);

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
          selected ? 'scale-110' : ''
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
            selected ? 'brightness-110 saturate-120' : 'brightness-100'
          }`}
        />

        {/* Node label */}
        <div className={`absolute -top-8 -right-10 transform transition-all duration-200 ${
          selected ? 'scale-105' : ''
        }`}>
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
});

// Set display name for debugging
CustomNode.displayName = 'CustomNode';

// Text Node component for text-only elements - memoized for better performance
const TextNode = React.memo(({
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
        updated_at: new Date().toISOString()
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
});

// Set display name for debugging
TextNode.displayName = 'TextNode';

// Define node types outside component to prevent recreation warnings
const createNodeTypes = (handleNodeClick: (nodeId: string, event?: any) => void, handleNodeDataChange: (nodeId: string, data: Partial<MapNode>) => void) => ({
  default: (props: any) => (
    <CustomNode {...props} onClick={handleNodeClick} />
  ),
  text: (props: any) => (
    <TextNode {...props} onDataChange={handleNodeDataChange} onClick={handleNodeClick} />
  ),
});

export function MapEditor({ map, onMapChange }: MapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    INITIAL_NODES as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<AppNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<AppNode[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUpdatingNodeData, setIsUpdatingNodeData] = useState(false);
  const [isUpdatingAssessment, setIsUpdatingAssessment] = useState(false);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [pendingNodeUpdates, setPendingNodeUpdates] = useState<Record<string, Partial<MapNode>>>({});
  const [selectionBeforeDrag, setSelectionBeforeDrag] = useState<string[]>([]);
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);

  // Track quiz questions for batch operations
  const [pendingQuizQuestions, setPendingQuizQuestions] = useState<
    Record<string, QuizQuestion[]>
  >({});

  // Clipboard functionality
  const [copiedNodes, setCopiedNodes] = useState<MapNode[] | null>(null);

  // Auto-save state management
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>(AutoSaveStatus.SAVED);
  const [lastSavedVersion, setLastSavedVersion] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a hash of the current map state for change detection
  const generateMapHash = useCallback((currentMap: FullLearningMap) => {
    // Create a stable string representation of the map for comparison
    const mapString = JSON.stringify({
      nodes: currentMap.map_nodes.map(node => ({
        id: node.id,
        title: node.title,
        instructions: node.instructions,
        difficulty: node.difficulty,
        sprite_url: node.sprite_url,
        position: node.metadata?.position,
        node_type: (node as any).node_type,
      })),
      paths: currentMap.map_nodes.flatMap(node => 
        (node.node_paths_source || []).map(path => ({
          id: path.id,
          source: path.source_node_id,
          target: path.destination_node_id,
        }))
      ),
    });
    return btoa(mapString);
  }, []);

  // Auto-save function with error handling
  const performAutoSave = useCallback(async (mapToSave: FullLearningMap) => {
    try {
      setAutoSaveStatus(AutoSaveStatus.SAVING);
      
      // Call the auto-save API endpoint
      const response = await fetch(`/api/maps/${mapToSave.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
      
      console.log('🔄 Map auto-saved successfully');
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      setAutoSaveStatus(AutoSaveStatus.ERROR);
      
      // Show user-friendly error message
      toast({
        title: "Auto-save failed",
        description: "Your changes are safe locally. Will retry automatically.",
        variant: "destructive",
      });
      
      // Retry after 10 seconds on error
      setTimeout(() => {
        if (hasUnsavedChanges) {
          setAutoSaveStatus(AutoSaveStatus.PENDING);
          // Re-trigger auto-save using the current map state
          performAutoSave(mapToSave);
        }
      }, 10000);
    }
  }, [generateMapHash, hasUnsavedChanges, toast]);

  // Debounced auto-save (3 seconds after last change)
  const debouncedAutoSave = useCallback(
    debounce((mapToSave: FullLearningMap) => {
      if (hasUnsavedChanges && autoSaveStatus !== AutoSaveStatus.SAVING) {
        performAutoSave(mapToSave);
      }
    }, 3000),
    [performAutoSave, hasUnsavedChanges, autoSaveStatus]
  );

  // Trigger auto-save when map changes
  const triggerAutoSave = useCallback((newMap: FullLearningMap) => {
    const newHash = generateMapHash(newMap);
    console.log('🔍 triggerAutoSave called:', { 
      newHash: newHash.substring(0, 10) + '...', 
      lastSaved: lastSavedVersion.substring(0, 10) + '...', 
      hasChanged: newHash !== lastSavedVersion 
    });
    
    // Only trigger if there are actual changes
    if (newHash !== lastSavedVersion) {
      console.log('📝 Changes detected - triggering auto-save');
      setHasUnsavedChanges(true);
      setAutoSaveStatus(AutoSaveStatus.PENDING);
      
      // Cancel any existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Schedule new save
      debouncedAutoSave(newMap);
    } else {
      console.log('⏭️ No changes detected - skipping auto-save');
    }
  }, [generateMapHash, lastSavedVersion, debouncedAutoSave]);

  // Initialize last saved version on mount
  useEffect(() => {
    const initialHash = generateMapHash(map);
    setLastSavedVersion(initialHash);
  }, []); // Only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Wrapper function for map changes that triggers auto-save
  const handleMapChange = useCallback((newMap: FullLearningMap) => {
    console.log('🔄 handleMapChange called');
    onMapChange(newMap);
    triggerAutoSave(newMap);
  }, [onMapChange, triggerAutoSave]);

  // Copy/Paste functionality
  const copyNode = useCallback(async () => {
    if (selectedNodes.length === 0) {
      toast({
        title: "No nodes selected",
        description: "Please select one or more nodes to copy",
        variant: "destructive",
      });
      return;
    }

    // Deep clone the node data to avoid reference issues
    const nodesToCopy = selectedNodes.map(node => JSON.parse(JSON.stringify(node.data)));
    setCopiedNodes(nodesToCopy);

    // Clear the system text clipboard to ensure only islands can be pasted
    try {
      await navigator.clipboard.writeText("");
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      console.log("Clipboard API not available");
    }

    const nodeCount = nodesToCopy.length;
    toast({
      title: `${nodeCount} node${nodeCount > 1 ? 's' : ''} copied!`,
      description: nodeCount === 1 
        ? `"${nodesToCopy[0].title}" copied to clipboard`
        : `${nodeCount} nodes copied to clipboard`,
    });
  }, [selectedNodes, toast]);

  const pasteNode = useCallback(() => {
    if (!copiedNodes || copiedNodes.length === 0) {
      toast({
        title: "Nothing to paste",
        description: "Copy one or more nodes first using Ctrl+C",
        variant: "destructive",
      });
      return;
    }

    // Calculate base paste position (center of visible viewport)
    let basePastePosition = { x: 150, y: 150 }; // Default fallback

    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const panelOffset = selectedNode ? 0.35 : 0; // Account for right panel
      const visibleCanvasWidth = window.innerWidth * (1 - panelOffset);

      basePastePosition = {
        x: (-viewport.x + visibleCanvasWidth / 2) / viewport.zoom,
        y: (-viewport.y + window.innerHeight / 2) / viewport.zoom,
      };
    }

    // Create new nodes with proper spacing
    const newNodes: AppNode[] = [];
    const newNodeData: (MapNode & {
      node_paths_source: any[];
      node_paths_destination: any[];
      node_content: any[];
      node_assessments: any[];
    })[] = [];

    copiedNodes.forEach((copiedNode, index) => {
      const tempId = generateTempId("temp_node");
      
      // Calculate position with offset for multiple nodes
      const offset = index * 120; // 120px spacing between nodes
      let nodePosition = {
        x: basePastePosition.x + (offset % 240), // Wrap every 2 nodes horizontally
        y: basePastePosition.y + Math.floor(offset / 240) * 120, // Stack vertically after 2 nodes
      };

      // Add small offset if pasting near the original node's position
      if (copiedNode.metadata?.position) {
        const originalPos = copiedNode.metadata.position;
        const distance = Math.sqrt(
          Math.pow(nodePosition.x - originalPos.x, 2) +
            Math.pow(nodePosition.y - originalPos.y, 2)
        );

        // If too close to original, add offset
        if (distance < 100) {
          nodePosition.x += 80;
          nodePosition.y += 80;
        }
      }

      // Create new node data
      const nodeData: MapNode & {
        node_paths_source: any[];
        node_paths_destination: any[];
        node_content: any[];
        node_assessments: any[];
      } = {
        ...copiedNode,
        id: tempId,
        title: copiedNodes.length === 1 
          ? `${copiedNode.title} (Copy)`
          : `${copiedNode.title} (Copy ${index + 1})`,
        metadata: {
          ...copiedNode.metadata,
          position: nodePosition,
          temp_id: tempId,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        node_paths_source: [], // Don't copy connections
        node_paths_destination: [], // Don't copy connections
        node_content: copiedNode.node_content || [],
        node_assessments: copiedNode.node_assessments || [],
      };

      const newNode: AppNode = {
        id: tempId,
        position: nodePosition,
        data: nodeData,
        type: (copiedNode as any).node_type === "text" ? "text" : "default",
        draggable: true,
        connectable: (copiedNode as any).node_type !== "text",
        selectable: true,
      };

      newNodes.push(newNode);
      newNodeData.push(nodeData);
    });

    // Update React Flow state
    setNodes((nds) => [...nds, ...newNodes as Node[]]);

    // Update map state
    const updatedMap = {
      ...map,
      map_nodes: [...map.map_nodes, ...newNodeData],
    };
    handleMapChange(updatedMap);

    // Select the newly pasted nodes
    setSelectedNodes(newNodes);
    if (newNodes.length === 1) {
      setSelectedNode(newNodes[0]);
    } else {
      setSelectedNode(null); // Clear single selection for multiple nodes
    }

    const nodeCount = copiedNodes.length;
    toast({
      title: `${nodeCount} node${nodeCount > 1 ? 's' : ''} pasted!`,
      description: nodeCount === 1
        ? `"${newNodeData[0].title}" added to map`
        : `${nodeCount} nodes added to map`,
    });
  }, [
    copiedNodes,
    reactFlowInstance,
    selectedNode,
    map,
    onMapChange,
    setNodes,
    setSelectedNodes,
    setSelectedNode,
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
          if (copiedNodes && copiedNodes.length > 0) {
            event.preventDefault();
            pasteNode();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copyNode, pasteNode, copiedNodes]);

  // Transform map data to React Flow format - but NOT during operations that would cause deselection
  useEffect(() => {
    // CRITICAL: Don't regenerate nodes during operations that would cause deselection/flashing
    if (isDragging || selectionBeforeDrag.length > 0 || isUpdatingNodeData || isUpdatingAssessment) {
      console.log('⏭️ Skipping node transformation during operation:', {
        isDragging,
        selectionBeforeDrag: selectionBeforeDrag.length,
        isUpdatingNodeData,
        isUpdatingAssessment
      });
      return;
    }
    
    console.log('🔄 Transforming map nodes to React Flow format');
    console.log('🗂️ Map nodes being transformed:', map.map_nodes.map(n => ({id: n.id, assessments: n.node_assessments?.length || 0})));
    const transformedNodes: AppNode[] = map.map_nodes.map((node) => {
      const nodeType = (node as any).node_type === "text" ? "text" : "default";

      return {
        id: node.id,
        type: nodeType,
        data: { ...node, node_type: (node as any).node_type || "learning" },
        position: (node.metadata as any)?.position || getRandomPosition(),
        draggable: true,
        connectable: nodeType !== "text", // Text nodes can't be connected
        selectable: true,
        // Remove selected property - let ReactFlow handle selection state internally
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
    
    // Debug: Check if the selected node is being affected by the transform
    if (selectedNode) {
      const transformedSelectedNode = transformedNodes.find(n => n.id === selectedNode.id);
      if (transformedSelectedNode) {
        console.log('🔍 Transform: selectedNode assessments after transform:', transformedSelectedNode.data.node_assessments?.length || 0);
        // Update selectedNode if it was affected by the transform
        if (JSON.stringify(selectedNode.data) !== JSON.stringify(transformedSelectedNode.data)) {
          console.log('📝 Transform: Updating selectedNode to match transformed data');
          setSelectedNode(transformedSelectedNode as AppNode);
        }
      }
    }
  }, [map, setNodes, setEdges]); // Keep original dependencies to avoid size changes

  // Trigger transform when drag operations complete
  useEffect(() => {
    if (!isDragging && selectionBeforeDrag.length === 0) {
      // Drag operation completed, allow normal transforms
      console.log('✅ Drag operation completed, transforms re-enabled');
    }
  }, [isDragging, selectionBeforeDrag.length]);

  // Trigger manual transform when assessment updates complete
  useEffect(() => {
    if (!isUpdatingAssessment && selectedNode) {
      // Assessment update completed, ensure selectedNode is in sync
      console.log('✅ Assessment update completed, checking selectedNode sync');
      const mapNode = map.map_nodes.find(n => n.id === selectedNode.id);
      if (mapNode && JSON.stringify(selectedNode.data.node_assessments) !== JSON.stringify(mapNode.node_assessments)) {
        console.log('🔄 Syncing selectedNode with updated map data');
        setSelectedNode(prev => prev ? {
          ...prev,
          data: {
            ...prev.data,
            node_assessments: mapNode.node_assessments
          }
        } : null);
      }
    }
  }, [isUpdatingAssessment, selectedNode, map.map_nodes]);

  // Add node handler
  const handleAddNode = useCallback(() => {
    const tempId = generateTempId("temp_node");

    // Get center of current viewport
    let nodePosition = { x: 100, y: 100 }; // Default position

    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const canvasRect = reactFlowInstance.getViewport();

      // Calculate the center of the visible viewport
      // Account for the right panel if a node is selected
      const panelOffset = selectedNode ? 0.35 : 0; // 35% for right panel
      const visibleCanvasWidth = window.innerWidth * (1 - panelOffset);

      nodePosition = {
        x: (-viewport.x + visibleCanvasWidth / 2) / viewport.zoom,
        y: (-viewport.y + window.innerHeight / 2) / viewport.zoom,
      };
    }

    const newNodeData: MapNode & {
      node_paths_source: any[];
      node_paths_destination: any[];
      node_content: any[];
      node_assessments: any[];
    } = {
      id: tempId,
      map_id: map.id,
      title: "New Node",
      instructions: "",
      difficulty: 1,
      sprite_url: null,
      metadata: {
        position: nodePosition,
        temp_id: tempId, // FIXED: Include temp ID in metadata for reliable mapping
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      node_paths_source: [],
      node_paths_destination: [],
      node_content: [],
      node_assessments: [],
    };

    const newNode: AppNode = {
      id: tempId,
      position: nodePosition,
      data: newNodeData,
      type: "default",
      draggable: true,
      connectable: true,
      selectable: true,
    };

    setNodes((nds) => [...nds, newNode as Node]);

    const updatedMap = {
      ...map,
      map_nodes: [...map.map_nodes, newNodeData],
    };
    handleMapChange(updatedMap as any);
    triggerAutoSave(updatedMap);

    toast({ title: "Node Added!" });
  }, [map, onMapChange, setNodes, toast, reactFlowInstance, selectedNode]);

  // Add text node handler
  const handleAddTextNode = useCallback(() => {
    const tempId = generateTempId("temp_text");

    // Get center of current viewport
    let nodePosition = { x: 150, y: 150 }; // Default position

    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const panelOffset = selectedNode ? 0.35 : 0; // 35% for right panel
      const visibleCanvasWidth = window.innerWidth * (1 - panelOffset);

      nodePosition = {
        x: (-viewport.x + visibleCanvasWidth / 2) / viewport.zoom,
        y: (-viewport.y + window.innerHeight / 2) / viewport.zoom,
      };
    }

    const newTextData: MapNode & {
      node_paths_source: any[];
      node_paths_destination: any[];
      node_content: any[];
      node_assessments: any[];
      node_type: string;
    } = {
      id: tempId,
      map_id: map.id,
      title: "Double-click to edit",
      instructions: null,
      difficulty: 1,
      sprite_url: null,
      metadata: {
        position: nodePosition,
        fontSize: "16px",
        textColor: "#374151",
        backgroundColor: "transparent",
        fontWeight: "normal",
        textAlign: "center",
        temp_id: tempId,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      node_type: "text",
      node_paths_source: [],
      node_paths_destination: [],
      node_content: [],
      node_assessments: [],
    };

    const newNode: AppNode = {
      id: tempId,
      position: nodePosition,
      data: newTextData,
      type: "text",
      draggable: true,
      connectable: false, // Text nodes shouldn't connect
      selectable: true,
    };

    setNodes((nds) => [...nds, newNode as Node]);

    const updatedMap = {
      ...map,
      map_nodes: [...map.map_nodes, newTextData],
    };
    handleMapChange(updatedMap as any);

    toast({ title: "Text Added!" });
  }, [map, onMapChange, setNodes, toast, reactFlowInstance, selectedNode]);

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

      deleted.forEach((node) => {
        toast({ title: `Node "${node.data.title}" deleted (Auto-saving)` });
      });
    },
    [toast, map, onMapChange]
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

  // Node drag handler
  // const onNodeDragStop: NodeDragHandler = useCallback(
  //   (_, node) => {
  //     const updatedMap = {
  //       ...map,
  //       map_nodes: map.map_nodes.map((mapNode) => {
  //         if (mapNode.id === node.id) {
  //           return {
  //             ...mapNode,
  //             metadata: { ...mapNode.metadata, position: node.position },
  //           };
  //         }
  //         return mapNode;
  //       }),
  //     };
  //     handleMapChange(updatedMap);
  //   },
  //   [map, onMapChange]
  // );

  // Node drag start handler
  const onNodeDragStart: OnNodeDrag = useCallback((_, node) => {
    console.log('🚀 Drag started for node:', node.id, 'Currently selected nodes:', selectedNodes.map(n => n.id));
    setIsDragging(true);
    
    // If dragging a node that's not currently selected, select it first
    const isDraggedNodeSelected = selectedNodes.some(n => n.id === node.id);
    
    if (!isDraggedNodeSelected) {
      console.log('🎯 Dragged node not selected - auto-selecting it:', node.data.title);
      
      // Convert ReactFlow node to AppNode and select it
      const draggedAppNode = node as AppNode;
      setSelectedNode(draggedAppNode);
      setSelectedNodes([draggedAppNode]);
      
      // Update ReactFlow visual state
      if (reactFlowInstance) {
        const currentNodes = reactFlowInstance.getNodes();
        const updatedNodes = currentNodes.map(n => ({
          ...n,
          selected: n.id === node.id
        }));
        reactFlowInstance.setNodes(updatedNodes);
      }
      
      // Store the new selection for drag restoration
      setSelectionBeforeDrag([node.id]);
    } else {
      // Store the current selection state before drag starts
      if (reactFlowInstance) {
        const currentNodes = reactFlowInstance.getNodes();
        const selectedNodeIds = currentNodes.filter(n => n.selected).map(n => n.id);
        console.log('📝 Storing selected nodes before drag:', selectedNodeIds);
        setSelectionBeforeDrag(selectedNodeIds);
      }
    }
  }, [selectedNodes, reactFlowInstance, setSelectedNode, setSelectedNodes]);

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_, draggedNode) => {
      console.log('🎯 Drag stopped for node:', draggedNode.id);
      
      // CRITICAL: Don't clear isDragging immediately - wait for selection to be restored first
      
      // Get the current node positions from React Flow
      const currentNodes = reactFlowInstance?.getNodes() || [];
      
      // Update ONLY the map state for persistence - do NOT trigger React Flow re-renders
      let finalUpdatedMap: FullLearningMap | null = null;
      const newMap = {
        ...map,
        map_nodes: map.map_nodes.map((mapNode) => {
          // Check if this node was moved during drag
          const currentNode = currentNodes.find(cn => cn.id === mapNode.id);
          if (currentNode) {
            const oldPos = mapNode.metadata?.position;
            // Only update if position actually changed
            if (
              !oldPos ||
              Math.abs(oldPos.x - currentNode.position.x) > 1 ||
              Math.abs(oldPos.y - currentNode.position.y) > 1
            ) {
              return {
                ...mapNode,
                metadata: { ...mapNode.metadata, position: currentNode.position },
              };
            }
          }
          return mapNode;
        }),
      };
      
      // Update map state directly without triggering re-render
      finalUpdatedMap = newMap;
      onMapChange(newMap);
      
      // Restore selection IMMEDIATELY and aggressively
      const restoreSelection = () => {
        if (reactFlowInstance && selectionBeforeDrag.length > 0) {
          console.log('🔧 Restoring node selection after drag:', selectionBeforeDrag);
          const nodes = reactFlowInstance.getNodes();
          const updatedNodes = nodes.map(node => ({
            ...node,
            selected: selectionBeforeDrag.includes(node.id)
          }));
          reactFlowInstance.setNodes(updatedNodes);
        }
      };
      
      // Immediate restoration
      restoreSelection();
      
      // Additional restoration attempts
      setTimeout(restoreSelection, 1);
      setTimeout(restoreSelection, 10);
      setTimeout(restoreSelection, 50);
      
      // Now clear isDragging and stored selection after selection is restored
      setTimeout(() => {
        setIsDragging(false);
        setSelectionBeforeDrag([]);
        
        // Trigger auto-save after all updates are complete
        if (finalUpdatedMap) {
          triggerAutoSave(finalUpdatedMap);
        }
      }, 100);
    },
    [map, onMapChange, reactFlowInstance, triggerAutoSave, selectionBeforeDrag]
  );

  // Track the last clicked node to prevent ReactFlow from overriding our selection
  const [lastClickedNodeId, setLastClickedNodeId] = useState<string | null>(null);

  // Handle node click when multiple nodes are selected
  const handleNodeClick = useCallback(
    (nodeId: string, event?: any) => {
      console.log('🖱️ Node clicked:', nodeId, 'Current selected node:', selectedNode?.id, 'Last clicked:', lastClickedNodeId);
      
      // Prevent the default ReactFlow behavior
      if (event) {
        event.stopPropagation();
      }
      
      // Set the last clicked node immediately to prevent ReactFlow interference
      setLastClickedNodeId(nodeId);
      
      // Find the clicked node from current nodes
      const clickedReactFlowNode = reactFlowInstance?.getNodes()?.find(node => node.id === nodeId);
      
      if (!clickedReactFlowNode) {
        console.log('❌ Could not find clicked node in ReactFlow nodes');
        return;
      }
      
      const nodeAsAppNode = clickedReactFlowNode as AppNode;
      
      // If clicking the same node that's already selected, don't do anything
      if (selectedNode?.id === nodeId && selectedNodes.length === 1) {
        console.log('✅ Same node already selected, no change needed');
        return;
      }
      
      console.log('🎯 Selecting new node:', nodeAsAppNode.data.title);
      
      // Block ReactFlow's onSelectionChange temporarily
      setIsUpdatingNodeData(true);
      
      // Immediately update our state
      setSelectedNode(nodeAsAppNode);
      setSelectedNodes([nodeAsAppNode]);
      
      // Update ReactFlow state and clear the block
      if (reactFlowInstance) {
        const currentNodes = reactFlowInstance.getNodes();
        const updatedNodes = currentNodes.map(node => ({
          ...node,
          selected: node.id === nodeId
        }));
        reactFlowInstance.setNodes(updatedNodes);
        
        // Clear the block after ReactFlow processes the change
        setTimeout(() => {
          setIsUpdatingNodeData(false);
        }, 50);
      } else {
        setIsUpdatingNodeData(false);
      }
      
      // Open editor panel
      if (rightPanelRef.current && leftPanelRef.current) {
        rightPanelRef.current.resize(35);
        leftPanelRef.current.resize(65);
      }
      
      // Clear the last clicked node after a brief delay
      setTimeout(() => {
        setLastClickedNodeId(null);
      }, 100);
    },
    [selectedNode, selectedNodes, setSelectedNode, setSelectedNodes, rightPanelRef, leftPanelRef, reactFlowInstance, lastClickedNodeId]
  );

  // Selection change handler with dynamic panel resizing and node centering
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedNodeIds = params.nodes.map(n => n.id);
      console.log('🔍 onSelectionChange called:', {
        nodeIds: selectedNodeIds,
        nodeCount: params.nodes.length,
        currentSelectedNode: selectedNode?.id,
        lastClickedNodeId,
        isDragging,
        isUpdatingNodeData,
        isEditingNode,
        selectionBeforeDragLength: selectionBeforeDrag.length
      });
      
      // CRITICAL: Block if we just manually clicked a node - don't let ReactFlow override our selection
      if (lastClickedNodeId) {
        console.log('⏭️ Blocking selection change - manual node click in progress for:', lastClickedNodeId);
        return;
      }
      
      // Block during active drag operations
      if (isDragging) {
        console.log('⏭️ Blocking selection change - drag in progress');
        return;
      }
      
      // Block during node data updates (our manual selection changes)
      if (isUpdatingNodeData || isUpdatingAssessment) {
        console.log('⏭️ Blocking selection change - node data update in progress');
        return;
      }
      
      // Block if we have a pending drag selection restore
      if (selectionBeforeDrag.length > 0) {
        console.log('⏭️ Blocking selection change - pending drag restore');
        return;
      }
      
      // Only block input focus for actual text editing in the editor panel
      const activeElement = document.activeElement;
      if (activeElement && 
          (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') &&
          activeElement.closest('.node-editor-panel')) {
        console.log('⏭️ Blocking selection change - input focused in editor panel');
        return;
      }
      
      // Block if actively editing node title to prevent deselection during typing
      if (isEditingNode) {
        console.log('⏭️ Blocking selection change - actively editing node');
        return;
      }
      
      console.log('✅ Processing ReactFlow selection change:', selectedNodeIds);
      const selectedNodesList = params.nodes as AppNode[];
      
      // Only allow ReactFlow to drive selection changes if we haven't manually set one
      if (selectedNodesList.length === 1) {
        const newSelectedNode = selectedNodesList[0];
        // Only update if it's actually a different node and we haven't manually selected something else
        if (selectedNode?.id !== newSelectedNode.id) {
          console.log('🔄 ReactFlow updating selection to:', newSelectedNode.id, newSelectedNode.data.title);
          setSelectedNode(newSelectedNode);
        } else {
          console.log('✅ Same node, no update needed');
        }
      } else {
        // Multiple nodes or no nodes selected
        setSelectedNode(params.nodes.length === 1 ? (selectedNodesList[0] || null) : null);
      }
      
      setSelectedNodes(selectedNodesList);
      
      // Handle multiple node selection
      if (params.nodes.length > 1) {
        // Multiple nodes selected - show multi-selection state
        setSelectedNode(null); // Clear single selection
        console.log(`Selected ${params.nodes.length} nodes:`, selectedNodesList.map(n => n.data.title || n.id));
        
        // Collapse right panel when multiple nodes are selected
        if (rightPanelRef.current && leftPanelRef.current) {
          rightPanelRef.current.resize(0);
          leftPanelRef.current.resize(100);
        }
        return;
      }
      
      const node = params.nodes[0];
      const newSelectedNode = (node as unknown as AppNode) || null;

      setSelectedNode(newSelectedNode);
      // Ensure selectedNodes is also updated for single selection
      if (newSelectedNode) {
        setSelectedNodes([newSelectedNode]);
      } else {
        setSelectedNodes([]);
      }

      // Animate panel resize based on selection
      if (newSelectedNode && rightPanelRef.current && leftPanelRef.current) {
        // Node selected: expand right panel to 35%, shrink left to 65% (matching default)
        rightPanelRef.current.resize(35);
        leftPanelRef.current.resize(65);
      } else if (!newSelectedNode) {
        // Node deselected: panel will disappear automatically due to conditional rendering
        // No manual resize needed since right panel is conditionally rendered
      }
    },
    [isDragging, isUpdatingNodeData, isUpdatingAssessment, isEditingNode, reactFlowInstance, selectionBeforeDrag, lastClickedNodeId]
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
      const isTitleOnlyUpdate = Object.keys(data).length === 1 && data.title !== undefined;
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
      const shouldUpdateVisuals = isEditingComplete || 
                                 isAssessmentUpdate ||
                                 (!isTitleOnlyUpdate && !isContentUpdate);
      
      if (shouldUpdateVisuals) {
        console.log("🔄 Updating React Flow nodes:", Object.keys(data), "Assessment update:", isAssessmentUpdate);
        if (isAssessmentUpdate) {
          console.log("📊 Assessment data being applied:", data.node_assessments);
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
        console.log("⏭️ Skipping React Flow visual update for:", Object.keys(data), "to prevent flashing");
      }

      // Clear the flag after a short delay to allow React Flow to process the update
      if (isAssessmentUpdate) {
        setTimeout(() => {
          console.log("🔓 Clearing isUpdatingAssessment - allowing transform to run");
          setIsUpdatingAssessment(false);
        }, 100); // Longer delay for assessment updates to ensure map state is updated first
      } else {
        setTimeout(() => {
          setIsUpdatingNodeData(false);
        }, 50);
      }

      // Update selected node if it's the one being changed (but don't trigger re-renders)
      if (selectedNode?.id === nodeId) {
        console.log("🔄 Updating selectedNode data:", { nodeId, data });
        setSelectedNode((prev) => {
          if (!prev) return null;
          const updatedNode = { ...prev, data: { ...prev.data, ...data } };
          console.log("✅ Updated selectedNode:", updatedNode.data.node_assessments);
          return updatedNode;
        });
      }

      // Always update map state (this is needed for persistence)
      const updatedMap = {
        ...map,
        map_nodes: map.map_nodes.map((node) => {
          if (node.id === nodeId) {
            const updatedNode = { ...node, ...data };
            if (isAssessmentUpdate) {
              console.log("📊 Updating map node with assessment data:", updatedNode.node_assessments);
            }
            return updatedNode;
          }
          return node;
        }),
      };

      console.log("📝 Calling handleMapChange with updated map");
      handleMapChange(updatedMap as any);
    },
    [map, handleMapChange, selectedNode, setNodes]
  );

  // Stable node types to prevent React Flow warnings
  const nodeTypes = useMemo(
    () => createNodeTypes(handleNodeClick, handleNodeDataChange),
    [handleNodeClick, handleNodeDataChange]
  );

  // Node delete handler
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find((node) => node.id === nodeId);
      if (!nodeToDelete) return;

      console.log('🗑️ Deleting node:', nodeId);
      
      // Block selection changes during deletion to prevent flashing
      setIsUpdatingNodeData(true);

      // Remove from React Flow state
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

      // Clear selection if deleted node was selected
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
      // Clear from multi-selection if it was selected
      if (selectedNodes.some(node => node.id === nodeId)) {
        setSelectedNodes(prev => prev.filter(node => node.id !== nodeId));
      }

      // Clear the blocking flag after deletion is complete
      setTimeout(() => {
        setIsUpdatingNodeData(false);
      }, 100);

      toast({
        title: `Node "${nodeToDelete.data.title}" deleted (Auto-saving)`,
      });
    },
    [nodes, selectedNode, selectedNodes, setNodes, setEdges, map, handleMapChange, toast]
  );

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Canvas Area */}
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={selectedNode ? 65 : 100}
          minSize={40}
          maxSize={85}
          className="relative transition-[width] duration-300 ease-in-out"
        >
          <div className="h-full w-full bg-slate-50 dark:bg-slate-950 relative">
            {/* Enhanced Floating Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg">
              <Button onClick={handleAddNode} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Node
              </Button>
              <Button
                onClick={handleAddTextNode}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Type className="h-4 w-4" />
                Add Text
              </Button>

              {/* Copy/Paste buttons */}
              <div className="h-4 w-px bg-border" />
              <Button
                onClick={copyNode}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={selectedNodes.length === 0}
                title={`Copy ${selectedNodes.length} selected node${selectedNodes.length !== 1 ? 's' : ''} (Ctrl+C)`}
              >
                <Copy className="h-4 w-4" />
                Copy{selectedNodes.length > 1 ? ` (${selectedNodes.length})` : ''}
              </Button>
              <Button
                onClick={pasteNode}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={!copiedNodes || copiedNodes.length === 0}
                title={`Paste ${copiedNodes?.length || 0} node${(copiedNodes?.length || 0) !== 1 ? 's' : ''} (Ctrl+V)`}
              >
                <Clipboard className="h-4 w-4" />
                Paste{copiedNodes && copiedNodes.length > 1 ? ` (${copiedNodes.length})` : ''}
              </Button>

              <div className="h-4 w-px bg-border" />
              
              {/* Auto-save status indicator */}
              <div className="flex items-center gap-1 px-2">
                {autoSaveStatus === AutoSaveStatus.SAVED && (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">Saved</span>
                  </>
                )}
                {autoSaveStatus === AutoSaveStatus.SAVING && (
                  <>
                    <Save className="h-3 w-3 text-blue-500 animate-pulse" />
                    <span className="text-xs text-blue-600">Saving...</span>
                  </>
                )}
                {autoSaveStatus === AutoSaveStatus.PENDING && (
                  <>
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-600">Pending</span>
                  </>
                )}
                {autoSaveStatus === AutoSaveStatus.ERROR && (
                  <>
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">Error</span>
                  </>
                )}
              </div>

              <div className="h-4 w-px bg-border" />
              <div className="text-xs text-muted-foreground px-2">
                {nodes.length} nodes • {edges.length} paths
                {selectedNodes.length > 1 && (
                  <span className="text-blue-500 font-medium ml-2">
                    • {selectedNodes.length} selected
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
              onNodeDragStart={onNodeDragStart}
              onNodeDragStop={onNodeDragStop}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onNodeClick={(event, node) => handleNodeClick(node.id, event)}
              nodeTypes={nodeTypes}
              edgeTypes={EDGE_TYPES}
              snapToGrid={true}
              snapGrid={[20, 20]}
              fitView
              attributionPosition="bottom-left"
              panOnScroll
              selectionOnDrag={!isDragging} // Disable selection during drag
              multiSelectionKeyCode={["Meta", "Control"]}
              selectNodesOnDrag={!isDragging} // Disable node selection during drag
              panOnDrag={[2]}
              selectionKeyCode={["Meta", "Control"]}
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
        {selectedNode && (
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
                  selectedNode={selectedNode}
                  onNodeDataChange={handleNodeDataChange}
                  onNodeDelete={handleDeleteNode}
                  onEditingStateChange={setIsEditingNode}
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
