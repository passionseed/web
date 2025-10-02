"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Bubble {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface MindmapReflectionProps {
  onSave?: (bubbles: Bubble[], centralIdea: string) => void;
  initialCentralIdea?: string;
  initialBubbles?: Bubble[];
}

const BUBBLE_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200", 
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-red-100 text-red-800 border-red-200",
];

export function MindmapReflection({ onSave, initialCentralIdea = "", initialBubbles = [] }: MindmapReflectionProps) {
  const [centralIdea, setCentralIdea] = useState(initialCentralIdea);
  const [bubbles, setBubbles] = useState<Bubble[]>(initialBubbles);
  const [newBubbleText, setNewBubbleText] = useState("");
  const [isAddingBubble, setIsAddingBubble] = useState(false);
  const [draggedBubble, setDraggedBubble] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getRandomPosition = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 200, y: 200 };
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Generate position in a circle around the center
    const angle = Math.random() * 2 * Math.PI;
    const radius = 100 + Math.random() * 150; // 100-250px from center
    
    return {
      x: Math.max(50, Math.min(rect.width - 100, centerX + Math.cos(angle) * radius)),
      y: Math.max(50, Math.min(rect.height - 50, centerY + Math.sin(angle) * radius))
    };
  }, []);

  const addBubble = useCallback(() => {
    if (!newBubbleText.trim()) return;
    
    const newBubble: Bubble = {
      id: `bubble-${Date.now()}-${Math.random()}`,
      text: newBubbleText.trim(),
      ...getRandomPosition(),
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)]
    };
    
    setBubbles(prev => [...prev, newBubble]);
    setNewBubbleText("");
    setIsAddingBubble(false);
  }, [newBubbleText, getRandomPosition]);

  const removeBubble = useCallback((id: string) => {
    setBubbles(prev => prev.filter(bubble => bubble.id !== id));
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBubble();
    } else if (e.key === "Escape") {
      setIsAddingBubble(false);
      setNewBubbleText("");
    }
  }, [addBubble]);

  const handleMouseDown = useCallback((e: React.MouseEvent, bubbleId: string) => {
    e.preventDefault();
    setDraggedBubble(bubbleId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedBubble || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setBubbles(prev => prev.map(bubble => 
      bubble.id === draggedBubble 
        ? { ...bubble, x: Math.max(0, Math.min(rect.width - 100, x - 50)), y: Math.max(0, Math.min(rect.height - 30, y - 15)) }
        : bubble
    ));
  }, [draggedBubble]);

  const handleMouseUp = useCallback(() => {
    setDraggedBubble(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!centralIdea.trim()) {
      toast({
        title: "Central idea required",
        description: "Please enter what you're currently doing",
        variant: "destructive"
      });
      return;
    }
    
    if (bubbles.length === 0) {
      toast({
        title: "Add some activities",
        description: "Please add at least one activity bubble",
        variant: "destructive"
      });
      return;
    }

    onSave?.(bubbles, centralIdea);
    toast({
      title: "Mindmap saved!",
      description: "Your reflection has been saved successfully"
    });
  }, [bubbles, centralIdea, onSave, toast]);

  const clearAll = useCallback(() => {
    setBubbles([]);
    setCentralIdea("");
    setNewBubbleText("");
    setIsAddingBubble(false);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            What are you currently doing?
            <div className="ml-auto flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                disabled={bubbles.length === 0 && !centralIdea}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Mindmap
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter your main focus (e.g., 'Learning React', 'Building my game', 'Studying for exams')"
            value={centralIdea}
            onChange={(e) => setCentralIdea(e.target.value)}
            className="text-lg"
          />
        </CardContent>
      </Card>

      {/* Mindmap Canvas */}
      <Card className="min-h-[600px]">
        <CardContent className="p-0">
          <div 
            ref={canvasRef}
            className="relative w-full h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden rounded-lg"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Central Idea Circle */}
            {centralIdea && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-6 py-4 text-center font-semibold text-lg shadow-lg border-4 border-white min-w-[200px] max-w-[300px]"
              >
                {centralIdea}
              </motion.div>
            )}

            {/* Activity Bubbles */}
            <AnimatePresence>
              {bubbles.map((bubble) => (
                <motion.div
                  key={bubble.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className={`absolute cursor-move select-none ${bubble.color} rounded-full px-4 py-2 text-sm font-medium border-2 shadow-lg hover:shadow-xl transition-shadow group max-w-[200px]`}
                  style={{ 
                    left: bubble.x, 
                    top: bubble.y,
                    zIndex: draggedBubble === bubble.id ? 10 : 1
                  }}
                  onMouseDown={(e) => handleMouseDown(e, bubble.id)}
                  whileDrag={{ scale: 1.1 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="break-words">{bubble.text}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBubble(bubble.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  
                  {/* Connection line to center */}
                  {centralIdea && (
                    <svg 
                      className="absolute inset-0 pointer-events-none -z-10"
                      style={{ 
                        width: '100vw', 
                        height: '100vh',
                        left: -bubble.x,
                        top: -bubble.y
                      }}
                    >
                      <line
                        x1={bubble.x + 50}
                        y1={bubble.y + 15}
                        x2="50%"
                        y2="50%"
                        stroke="rgb(148 163 184)"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.5"
                      />
                    </svg>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Bubble Input */}
            {isAddingBubble && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute bottom-6 left-6 bg-white dark:bg-slate-800 rounded-lg shadow-xl border p-4 min-w-[300px]"
              >
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="What activity are you doing? (Press Enter to add)"
                    value={newBubbleText}
                    onChange={(e) => setNewBubbleText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={addBubble} disabled={!newBubbleText.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingBubble(false);
                      setNewBubbleText("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to add, Escape to cancel
                </p>
              </motion.div>
            )}

            {/* Add Button (when not adding) */}
            {!isAddingBubble && centralIdea && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setIsAddingBubble(true)}
                className="absolute bottom-6 left-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="h-6 w-6" />
              </motion.button>
            )}

            {/* Instructions */}
            {bubbles.length === 0 && centralIdea && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center text-muted-foreground bg-white/80 dark:bg-slate-800/80 rounded-lg p-6 backdrop-blur-sm">
                  <p className="text-lg font-medium">Click the + button to add activities</p>
                  <p className="text-sm">Add bubbles for the specific things you're working on</p>
                </div>
              </motion.div>
            )}

            {/* Getting started instructions */}
            {!centralIdea && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium">Start by entering what you're currently doing above</p>
                  <p className="text-sm">Then add specific activities as bubbles around your main focus</p>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}