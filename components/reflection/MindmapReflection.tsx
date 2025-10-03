"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Save, Trash2, Edit3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";

interface Topic {
  id: string;
  text: string;
  x: number;
  y: number;
  notes?: string;
}

interface MindmapReflectionProps {
  onSave?: (username: string, topics: Topic[]) => void;
  onTopicsChange?: (topics: Topic[]) => void;
  initialUsername?: string;
  initialTopics?: Topic[];
}

export function MindmapReflection({ onSave, onTopicsChange, initialUsername = "", initialTopics = [] }: MindmapReflectionProps) {
  const [username, setUsername] = useState(initialUsername || "username");
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [newTopicText, setNewTopicText] = useState("");
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [draggedTopic, setDraggedTopic] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [topicNotes, setTopicNotes] = useState("");
  // Canvas is fixed 600px height, width varies but flexbox centers the username bubble
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Fetch user profile to get actual username
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!initialUsername) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            setUsername(profile.full_name || profile.username || "username");
          }
        }
      }
    };
    
    fetchUserProfile();
  }, [initialUsername, supabase]);

  // Notify parent component when topics change
  useEffect(() => {
    onTopicsChange?.(topics);
  }, [topics, onTopicsChange]);

  // Load existing mindmap topics from database
  useEffect(() => {
    const loadMindmapTopics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found, skipping topic load');
          return;
        }

        console.log('Loading mindmap topics for user:', user.id);
        const { data, error } = await supabase
          .from('mindmap_topics')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading mindmap topics:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log('Loaded topics from database:', data);
          const loadedTopics = data.map(topic => ({
            id: `topic-${topic.id}`, // Use database ID with prefix
            text: topic.text,
            x: Number(topic.position_x),
            y: Number(topic.position_y),
            notes: topic.notes || undefined
          }));
          setTopics(loadedTopics);
          console.log('Set topics in state:', loadedTopics);
        } else {
          console.log('No topics found in database');
        }
      } catch (error) {
        console.error('Exception while loading topics:', error);
      }
    };

    // Always try to load topics when component mounts
    loadMindmapTopics();
  }, [supabase]); // Removed dependency on initialTopics.length


  const getRandomPosition = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 200, y: 200 };
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = 300; // Fixed center Y for 600px height
    
    // Generate position around the center username bubble
    const angle = Math.random() * 2 * Math.PI;
    const radius = 150 + Math.random() * 100; // 150-250px from center
    
    return {
      x: Math.max(50, Math.min(rect.width - 150, centerX + Math.cos(angle) * radius)),
      y: Math.max(25, Math.min(575, centerY + Math.sin(angle) * radius)) // 575 = 600 - 25
    };
  }, []);

  const addTopic = useCallback(() => {
    if (!newTopicText.trim()) return;
    
    const newTopic: Topic = {
      id: `topic-${Date.now()}-${Math.random()}`,
      text: newTopicText.trim(),
      ...getRandomPosition()
    };
    
    setTopics(prev => [...prev, newTopic]);
    setNewTopicText("");
    setIsAddingTopic(false);
  }, [newTopicText, getRandomPosition]);

  const removeTopic = useCallback((id: string) => {
    setTopics(prev => prev.filter(topic => topic.id !== id));
  }, []);

  const handleTopicClick = useCallback((topic: Topic, event: React.MouseEvent) => {
    // Don't open dialog if user is dragging
    if (draggedTopic) return;
    
    event.stopPropagation();
    setSelectedTopic(topic);
    setTopicNotes(topic.notes || "");
    setIsTopicDialogOpen(true);
  }, [draggedTopic]);

  const saveTopicNotes = useCallback(() => {
    if (!selectedTopic) return;
    
    setTopics(prev => prev.map(topic => 
      topic.id === selectedTopic.id 
        ? { ...topic, notes: topicNotes }
        : topic
    ));
    
    setIsTopicDialogOpen(false);
    setSelectedTopic(null);
    setTopicNotes("");
    
    toast({
      title: "Notes saved!",
      description: "Your notes have been updated for this topic"
    });
  }, [selectedTopic, topicNotes, toast]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addTopic();
    } else if (e.key === "Escape") {
      setIsAddingTopic(false);
      setNewTopicText("");
    }
  }, [addTopic]);

  const handleMouseDown = useCallback((e: React.MouseEvent, topicId: string) => {
    e.preventDefault();
    setDraggedTopic(topicId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedTopic || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setTopics(prev => prev.map(topic => 
      topic.id === draggedTopic 
        ? { ...topic, x: Math.max(0, Math.min(rect.width - 120, x - 60)), y: Math.max(0, Math.min(rect.height - 30, y - 15)) }
        : topic
    ));
  }, [draggedTopic]);

  const handleMouseUp = useCallback(() => {
    setDraggedTopic(null);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save",
          variant: "destructive"
        });
        return;
      }

      console.log('Saving topics to database:', topics);

      // First, delete all existing topics for this user to avoid duplicates
      const { error: deleteError } = await supabase
        .from('mindmap_topics')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting existing topics:', deleteError);
        throw deleteError;
      }

      // Insert all current topics as individual records
      if (topics.length > 0) {
        const topicRecords = topics.map(topic => ({
          user_id: user.id,
          text: topic.text,
          position_x: topic.x,
          position_y: topic.y,
          notes: topic.notes || null
        }));

        console.log('Inserting topic records:', topicRecords);
        const { error: insertError } = await supabase
          .from('mindmap_topics')
          .insert(topicRecords);

        if (insertError) {
          console.error('Error inserting topics:', insertError);
          throw insertError;
        }
        console.log('Successfully saved topics to database');
      }

      // Call the optional onSave callback
      onSave?.(username, topics);
      
      toast({
        title: "Mindmap saved!",
        description: `Saved ${topics.length} topics to your database`
      });
      
    } catch (error) {
      console.error('Error saving mindmap:', error);
      toast({
        title: "Error saving mindmap",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }, [username, topics, onSave, toast, supabase]);

  const clearAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Clear from database
        await supabase
          .from('mindmap_topics')
          .delete()
          .eq('user_id', user.id);
      }
      
      // Clear from state
      setTopics([]);
      setUsername("username");
      setNewTopicText("");
      setIsAddingTopic(false);
      
      toast({
        title: "Mindmap cleared",
        description: "All topics have been removed"
      });
    } catch (error) {
      console.error('Error clearing mindmap:', error);
      toast({
        title: "Error clearing mindmap",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }, [supabase, toast]);

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
                disabled={topics.length === 0}
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
      </Card>

      {/* Mindmap Canvas */}
      <Card className="min-h-[600px]">
        <CardContent className="p-0">
          <div 
            ref={canvasRef}
            className="relative w-full h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden rounded-lg flex items-center justify-center"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Username Bubble (Central) - Naturally centered with flexbox */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-8 py-6 text-center font-bold text-xl shadow-xl border-4 border-white min-w-[250px] max-w-[350px] z-20"
            >
              {username}
            </motion.div>

            {/* Topic Bubbles */}
            <AnimatePresence>
              {topics.map((topic) => (
                <motion.div
                  key={topic.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute cursor-pointer select-none bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full px-4 py-2 text-center font-medium text-sm shadow-lg border-2 border-white max-w-[120px] group hover:shadow-xl transition-shadow"
                  style={{ 
                    left: topic.x, 
                    top: topic.y,
                    zIndex: draggedTopic === topic.id ? 10 : 1
                  }}
                  onMouseDown={(e) => handleMouseDown(e, topic.id)}
                  onClick={(e) => handleTopicClick(topic, e)}
                  whileDrag={{ scale: 1.1 }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="break-words text-xs">{topic.text}</span>
                    {topic.notes && (
                      <Edit3 className="h-2 w-2 opacity-70" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTopic(topic.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 rounded-full p-1"
                    >
                      <X className="h-2 w-2 text-red-600" />
                    </button>
                  </div>
                  
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Connection Lines */}
            <svg 
              className="absolute inset-0 pointer-events-none z-10"
              style={{ 
                width: '100%', 
                height: '100%'
              }}
            >
              {topics.map((topic) => {
                // Canvas is 600px high, width varies - get actual center X but use fixed center Y
                const centerX = canvasRef.current ? canvasRef.current.offsetWidth / 2 : 300;
                const centerY = 300; // Fixed center Y for 600px height
                return (
                  <line
                    key={`line-${topic.id}`}
                    x1={topic.x + 60}
                    y1={topic.y + 15}
                    x2={centerX}
                    y2={centerY}
                    stroke="rgb(148 163 184)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                );
              })}
            </svg>

            {/* Add Topic Input */}
            {isAddingTopic && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute bottom-6 left-6 bg-white dark:bg-slate-800 rounded-lg shadow-xl border p-4 min-w-[300px]"
              >
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="What topic are you working on?"
                    value={newTopicText}
                    onChange={(e) => setNewTopicText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    onClick={addTopic} 
                    disabled={!newTopicText.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingTopic(false);
                      setNewTopicText("");
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

            {/* Add Button */}
            {!isAddingTopic && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setIsAddingTopic(true)}
                className="absolute bottom-6 left-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            )}


            {/* Add topics instructions */}
            {topics.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-16 left-1/2 transform -translate-x-1/2 pointer-events-none"
              >
                <div className="text-center text-muted-foreground bg-white/80 dark:bg-slate-800/80 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm">Click the + button to add topics you're working on</p>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topic Notes Dialog */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Topic Notes: {selectedTopic?.text}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="notes" className="text-sm font-medium">
                What did you work on regarding this topic today?
              </label>
              <Textarea
                id="notes"
                placeholder="Write your notes here..."
                value={topicNotes}
                onChange={(e) => setTopicNotes(e.target.value)}
                className="mt-2 min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTopicDialogOpen(false);
                setSelectedTopic(null);
                setTopicNotes("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveTopicNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}