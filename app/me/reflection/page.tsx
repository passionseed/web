"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { getMindMapNodes, createMindMapNode, updateMindMapNode, deleteMindMapNode, getDailyEntry, createOrUpdateDailyEntry, type MindMapNode as DBMindMapNode, type MindMapDailyEntry } from "@/lib/supabase/mindmap";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  angle: number;
}

export default function ReflectionHome() {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [newNodeText, setNewNodeText] = useState("");
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDailyEntry, setShowDailyEntry] = useState(false);
  const [selectedNodeForDaily, setSelectedNodeForDaily] = useState<MindMapNode | null>(null);
  const [dailyEntryContent, setDailyEntryContent] = useState("");
  const [currentDailyEntry, setCurrentDailyEntry] = useState<MindMapDailyEntry | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 100, // Account for header
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Check authentication and load mindmap data on component mount
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setIsAuthenticated(true);
      await loadMindMapData();
    } catch (error) {
      console.error('Authentication check failed:', error);
      router.push('/login');
    }
  };

  const loadMindMapData = async () => {
    try {
      const dbNodes = await getMindMapNodes();
      const mappedNodes: MindMapNode[] = dbNodes.map(node => ({
        id: node.id,
        text: node.text,
        x: Number(node.x),
        y: Number(node.y),
        angle: Number(node.angle)
      }));
      setNodes(mappedNodes);
    } catch (error) {
      console.error('Failed to load mindmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const radius = Math.min(dimensions.width, dimensions.height) * 0.2;

  const addNode = async (text: string) => {
    if (!text.trim()) return;

    const angle = nodes.length * (360 / 8); // Distribute evenly, max 8 nodes
    const radians = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(radians);
    const y = centerY + radius * Math.sin(radians);

    try {
      const newNode = await createMindMapNode({
        text: text.trim(),
        x,
        y,
        angle,
      });

      if (newNode) {
        const mappedNode: MindMapNode = {
          id: newNode.id,
          text: newNode.text,
          x: Number(newNode.x),
          y: Number(newNode.y),
          angle: Number(newNode.angle)
        };
        setNodes([...nodes, mappedNode]);
      }
    } catch (error) {
      console.error('Failed to create mindmap node:', error);
    }

    setNewNodeText("");
    setIsAddingNode(false);
  };

  const removeNode = async (nodeId: string) => {
    try {
      const success = await deleteMindMapNode(nodeId);
      if (success) {
        setNodes(nodes.filter((node) => node.id !== nodeId));
      }
    } catch (error) {
      console.error('Failed to delete mindmap node:', error);
    }
    setSelectedNodeId(null);
  };

  const updateNodeText = async (nodeId: string, newText: string) => {
    if (!newText.trim()) {
      removeNode(nodeId);
      return;
    }
    
    try {
      const updatedNode = await updateMindMapNode(nodeId, { text: newText.trim() });
      if (updatedNode) {
        setNodes(nodes.map((node) => 
          node.id === nodeId ? { ...node, text: newText.trim() } : node
        ));
      }
    } catch (error) {
      console.error('Failed to update mindmap node:', error);
    }
    setSelectedNodeId(null);
  };

  const openDailyEntryModal = async (node: MindMapNode) => {
    setSelectedNodeForDaily(node);
    
    // Load existing daily entry if it exists
    const existingEntry = await getDailyEntry(node.id);
    if (existingEntry) {
      setCurrentDailyEntry(existingEntry);
      setDailyEntryContent(existingEntry.content);
    } else {
      setCurrentDailyEntry(null);
      setDailyEntryContent("");
    }
    
    setShowDailyEntry(true);
  };

  const closeDailyEntryModal = () => {
    setShowDailyEntry(false);
    setSelectedNodeForDaily(null);
    setDailyEntryContent("");
    setCurrentDailyEntry(null);
  };

  const saveDailyEntry = async () => {
    if (!selectedNodeForDaily || !dailyEntryContent.trim()) return;

    try {
      const savedEntry = await createOrUpdateDailyEntry(selectedNodeForDaily.id, dailyEntryContent);
      if (savedEntry) {
        setCurrentDailyEntry(savedEntry);
      }
    } catch (error) {
      console.error('Failed to save daily entry:', error);
    }

    closeDailyEntryModal();
  };

  const getTodayString = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-900">
        <div className="border-b border-gray-700 p-4">
          <h1 className="text-2xl font-semibold text-white">Reflection</h1>
          <p className="text-sm text-gray-400">
            Reflect on what you're doing and learning by adding topics to your mindmap
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Loading your reflection mindmap...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <h1 className="text-2xl font-semibold text-white">Reflection</h1>
        <p className="text-sm text-gray-400">
          Reflect on what you're doing and learning by adding topics to your mindmap
        </p>
      </div>

      {/* Mind Map Container */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        <svg width="100%" height="100%" className="absolute inset-0">
            {/* Center circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r={80}
              fill="#1f2937"
              stroke="#60a5fa"
              strokeWidth={3}
              className="drop-shadow-lg"
            />
            
            {/* Center text */}
            <text
              x={centerX}
              y={centerY - 8}
              textAnchor="middle"
              className="text-lg font-semibold fill-gray-200"
            >
              What are you
            </text>
            <text
              x={centerX}
              y={centerY + 8}
              textAnchor="middle"
              className="text-lg font-semibold fill-gray-200"
            >
              doing + learning?
            </text>

            {/* Lines connecting center to nodes */}
            {nodes.map((node) => (
              <line
                key={`line-${node.id}`}
                x1={centerX}
                y1={centerY}
                x2={node.x}
                y2={node.y}
                stroke="#6b7280"
                strokeWidth={2}
                opacity={0.8}
              />
            ))}

            {/* Topic nodes */}
            {nodes.map((node) => (
              <g key={node.id}>
                <ellipse
                  cx={node.x}
                  cy={node.y}
                  rx={60}
                  ry={30}
                  fill="#374151"
                  stroke={selectedNodeId === node.id ? "#f87171" : "#8b5cf6"}
                  strokeWidth={2}
                  className="drop-shadow cursor-pointer hover:stroke-purple-400"
                  onClick={() => openDailyEntryModal(node)}
                  onDoubleClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
                />
                <foreignObject
                  x={node.x - 55}
                  y={node.y - 12}
                  width={110}
                  height={24}
                  className="pointer-events-none"
                >
                  <div className="flex items-center justify-center h-full">
                    {selectedNodeId === node.id ? (
                      <Input
                        defaultValue={node.text}
                        className="text-sm p-1 h-6 text-center bg-transparent border-none focus:ring-0 text-white"
                        onBlur={(e) => updateNodeText(node.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateNodeText(node.id, e.currentTarget.value);
                          }
                          if (e.key === "Escape") {
                            setSelectedNodeId(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-200 text-center px-2">
                        {node.text}
                      </span>
                    )}
                  </div>
                </foreignObject>
              </g>
            ))}

            {/* Add node button */}
            {nodes.length < 8 && (
              <g>
                <circle
                  cx={centerX + radius * Math.cos((nodes.length * 360 / 8) * Math.PI / 180)}
                  cy={centerY + radius * Math.sin((nodes.length * 360 / 8) * Math.PI / 180)}
                  r={25}
                  fill="#059669"
                  stroke="#374151"
                  strokeWidth={3}
                  className="cursor-pointer hover:fill-emerald-500 drop-shadow"
                  onClick={() => setIsAddingNode(true)}
                />
                <text
                  x={centerX + radius * Math.cos((nodes.length * 360 / 8) * Math.PI / 180)}
                  y={centerY + radius * Math.sin((nodes.length * 360 / 8) * Math.PI / 180) + 7}
                  textAnchor="middle"
                  className="text-xl font-bold fill-white pointer-events-none"
                >
                  +
                </text>
              </g>
            )}
          </svg>

          {/* Input modal for adding new nodes */}
          <AnimatePresence>
            {isAddingNode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 flex items-center justify-center"
                onClick={() => setIsAddingNode(false)}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold mb-4 text-white">Add a topic</h3>
                  <Input
                    placeholder="Enter topic..."
                    value={newNodeText}
                    onChange={(e) => setNewNodeText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addNode(newNodeText);
                      }
                      if (e.key === "Escape") {
                        setIsAddingNode(false);
                      }
                    }}
                    className="mb-4 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingNode(false)} 
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => addNode(newNodeText)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                      Add Topic
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 text-sm text-gray-300 bg-gray-800/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-600">
          Click + to add topics • Click topics for daily updates • Double-click to edit topic names
        </div>

        {/* Daily Entry Modal */}
        <AnimatePresence>
          {showDailyEntry && selectedNodeForDaily && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center"
              onClick={closeDailyEntryModal}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-600 max-w-lg w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {selectedNodeForDaily.text}
                  </h3>
                  <p className="text-sm text-gray-400">
                    What are you doing about this today?
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {getTodayString()}
                  </p>
                </div>
                
                <Textarea
                  placeholder="Describe what you're working on or learning about this topic today..."
                  value={dailyEntryContent}
                  onChange={(e) => setDailyEntryContent(e.target.value)}
                  className="mb-4 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 resize-none h-32"
                  autoFocus
                />
                
                <div className="flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={closeDailyEntryModal}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveDailyEntry} 
                    disabled={!dailyEntryContent.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    {currentDailyEntry ? 'Update' : 'Save'} Entry
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}