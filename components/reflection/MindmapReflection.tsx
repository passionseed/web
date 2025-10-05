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
  isNew?: boolean; // Flag to control entrance animations
}

interface MindmapReflectionProps {
  onSave?: (username: string, topics: Topic[]) => void;
  onTopicsChange?: (topics: Topic[]) => void;
  initialUsername?: string;
  initialTopics?: Topic[];
  isReflectionMode?: boolean; // New prop to indicate reflection mode
}

export function MindmapReflection({ onSave, onTopicsChange, initialUsername = "", initialTopics = [], isReflectionMode = false }: MindmapReflectionProps) {
  const [username, setUsername] = useState(initialUsername || "username");
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [newTopicText, setNewTopicText] = useState("");
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [draggedTopic, setDraggedTopic] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hasDraggedBeyondThreshold, setHasDraggedBeyondThreshold] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [topicNotes, setTopicNotes] = useState("");
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
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

  // Expose debug function to window for testing notes persistence
  useEffect(() => {
    (window as any).debugMindmapNotes = () => {
      console.log('🔍 CURRENT MINDMAP STATE:');
      console.log('📋 Topics in state:', topics.map(t => ({
        id: t.id,
        text: t.text,
        notes: t.notes,
        notesLength: t.notes?.length || 0,
        hasNotes: !!t.notes
      })));
      
      console.log('💾 You can test persistence by:');
      console.log('1. Add notes to a topic');
      console.log('2. Refresh the page (Ctrl/Cmd + R)');
      console.log('3. Click the same topic again');
      console.log('4. Check if notes are still there');
    };
    
    (window as any).debugDatabaseState = async () => {
      console.log('🗃️ CHECKING DATABASE STATE:');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('❌ No user found');
          return;
        }
        
        const { data, error } = await supabase
          .from('mindmap_topics')
          .select('*')
          .eq('user_id', user.id)
          .is('reflection_id', null);
          
        if (error) {
          console.error('❌ Database query error:', error);
          return;
        }
        
        console.log(`✅ Found ${data?.length || 0} topics in database:`);
        data?.forEach((record, index) => {
          console.log(`Topic ${index + 1}:`, {
            id: record.id,
            text: record.text,
            notes: record.notes,
            notesType: typeof record.notes,
            notesIsNull: record.notes === null,
            hasNotes: !!record.notes,
            position: { x: record.position_x, y: record.position_y }
          });
        });
      } catch (error) {
        console.error('❌ Error checking database:', error);
      }
    };
    
    return () => {
      delete (window as any).debugMindmapNotes;
      delete (window as any).debugDatabaseState;
    };
  }, [topics, supabase]);

  // Load existing mindmap topics from database (always, both modes)
  useEffect(() => {
    const loadMindmapTopics = async () => {
      const operationId = `initial-load-${Date.now()}`;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log(`[${operationId}] No user found, skipping topic load`);
          return;
        }

        // Check if we need to clear notes after reflection completion
        const shouldClearNotes = sessionStorage.getItem('clear-topic-notes') === 'true';
        if (shouldClearNotes) {
          console.log(`[${operationId}] Clearing topic notes after reflection completion`);
          sessionStorage.removeItem('clear-topic-notes');
          
          // Clear notes from all topics in database
          const { error: updateError } = await supabase
            .from('mindmap_topics')
            .update({ notes: null })
            .eq('user_id', user.id)
            .is('reflection_id', null);
          
          if (updateError) {
            console.error(`[${operationId}] Error clearing notes:`, updateError);
          } else {
            console.log(`[${operationId}] Successfully cleared all topic notes`);
          }
        }

        console.log(`[${operationId}] STARTING initial load for user ${user.email}`);
        const { data, error } = await supabase
          .from('mindmap_topics')
          .select('id, user_id, text, position_x, position_y, notes, created_at')
          .eq('user_id', user.id)
          .is('reflection_id', null) // Only load general topics NOT linked to a specific reflection
          .order('created_at', { ascending: true });

        if (error) {
          console.error(`[${operationId}] Error loading mindmap topics:`, error);
          return;
        }

        if (data && data.length > 0) {
          const loadedTopics = data.map(topic => ({
            id: `topic-${topic.id}`, // Use database ID with prefix
            text: topic.text,
            x: Number(topic.position_x),
            y: Number(topic.position_y),
            notes: topic.notes || undefined,
            isNew: false // Existing topics from database should not animate
          }));
          setTopics(loadedTopics);
          console.log(`[${operationId}] COMPLETED initial load: Found ${loadedTopics.length} topics:`, 
            loadedTopics.map(t => ({ id: t.id, text: t.text, x: t.x, y: t.y, notes: t.notes })));
        } else {
          console.log(`[${operationId}] COMPLETED initial load: No persistent topics found in database`);
        }
      } catch (error) {
        console.error(`[${operationId}] FAILED initial load:`, error);
      }
    };

    // Always load persistent topics when component mounts
    loadMindmapTopics();
  }, [supabase]); // Removed isReflectionMode dependency

  // Function to save topics to database (without automatic reload)
  const saveTopicsToDatabase = useCallback(async (topicsToSave: Topic[], operationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log(`[${operationId}] No user found, skipping database save`);
        return;
      }

      console.log(`[${operationId}] STARTING save operation for user ${user.email}:`);
      console.log(`[${operationId}] Topics to save:`, topicsToSave.map(t => ({ 
        id: t.id, 
        text: t.text, 
        x: t.x, 
        y: t.y, 
        notes: t.notes,
        notesType: typeof t.notes,
        notesLength: t.notes?.length || 0,
        hasNotes: !!t.notes
      })));
      console.log(`[${operationId}] Topics to save - full objects:`, topicsToSave);

      // Delete existing general topics and replace with current ones
      console.log(`[${operationId}] Deleting existing topics...`);
      const { error: deleteError } = await supabase
        .from('mindmap_topics')
        .delete()
        .eq('user_id', user.id)
        .is('reflection_id', null);

      if (deleteError) {
        console.error(`[${operationId}] Error deleting existing topics:`, deleteError);
        throw deleteError;
      }
      console.log(`[${operationId}] Successfully deleted existing topics`);

      // Insert current topics as persistent general topics
      if (topicsToSave.length > 0) {
        const topicRecords = topicsToSave.map(topic => ({
          user_id: user.id,
          text: topic.text,
          position_x: topic.x,
          position_y: topic.y,
          notes: (topic.notes && topic.notes.trim()) ? topic.notes.trim() : null,
          reflection_id: null // Always null for general persistent topics
        }));

        console.log(`[${operationId}] Inserting ${topicRecords.length} topics...`);
        console.log(`[${operationId}] Records to insert:`, topicRecords.map(r => ({
          user_id: r.user_id,
          text: r.text,
          position_x: r.position_x,
          position_y: r.position_y,
          notes: r.notes,
          notesType: typeof r.notes,
          notesValue: r.notes,
          notesIsNull: r.notes === null,
          notesIsUndefined: r.notes === undefined,
          notesStringified: JSON.stringify(r.notes),
          reflection_id: r.reflection_id
        })));
        console.log(`[${operationId}] Raw records being inserted:`, topicRecords);
        
        // Debug each individual topic record
        topicRecords.forEach((record, index) => {
          console.log(`[${operationId}] Topic record ${index + 1} details:`, {
            originalTopicId: topicsToSave[index]?.id,
            originalNotes: topicsToSave[index]?.notes,
            recordNotes: record.notes,
            notesMatches: topicsToSave[index]?.notes === record.notes,
            allRecordFields: Object.keys(record)
          });
        });
        const { error: insertError, data: insertedData } = await supabase
          .from('mindmap_topics')
          .insert(topicRecords)
          .select();

        if (insertError) {
          console.error(`[${operationId}] Error inserting topics:`, insertError);
          throw insertError;
        }
        console.log(`[${operationId}] Successfully saved ${topicRecords.length} topics to database`);
        console.log(`[${operationId}] What was actually inserted into database:`, insertedData?.map(d => ({
          id: d.id,
          text: d.text,
          notes: d.notes,
          notesType: typeof d.notes,
          notesValue: d.notes
        })));
        console.log(`[${operationId}] Raw inserted data:`, insertedData);
      } else {
        console.log(`[${operationId}] No topics to save, cleared database`);
      }
      
      console.log(`[${operationId}] COMPLETED save operation successfully`);
    } catch (error) {
      console.error(`[${operationId}] FAILED save operation:`, error);
      throw error;
    }
  }, [supabase]);

  // Function to reload topics from database with smart updates to prevent animations
  const reloadTopicsFromDatabase = useCallback(async (operationId: string, preventAnimations = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log(`[${operationId}] No user found, skipping topic reload`);
        setTopics([]);
        return;
      }

      console.log(`[${operationId}] STARTING reload operation for user ${user.email}`);
      
      // First, let's check what exactly exists in the database with a raw query
      const { data: rawData, error: rawError } = await supabase
        .from('mindmap_topics')
        .select('*')
        .eq('user_id', user.id)
        .is('reflection_id', null)
        .order('created_at', { ascending: true });
      
      console.log(`[${operationId}] RAW DATABASE QUERY RESULTS:`, {
        error: rawError,
        dataCount: rawData?.length || 0,
        rawData: rawData
      });
      
      if (rawData) {
        rawData.forEach((record, index) => {
          console.log(`[${operationId}] Raw record ${index + 1}:`, {
            id: record.id,
            text: record.text,
            notes: record.notes,
            notesType: typeof record.notes,
            notesIsNull: record.notes === null,
            notesIsUndefined: record.notes === undefined,
            notesValue: JSON.stringify(record.notes),
            allFields: Object.keys(record)
          });
        });
      }
      
      const { data, error } = await supabase
        .from('mindmap_topics')
        .select('id, user_id, text, position_x, position_y, notes, created_at')
        .eq('user_id', user.id)
        .is('reflection_id', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`[${operationId}] Error reloading topics:`, error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`[${operationId}] Raw database data:`, data.map(t => ({
          id: t.id,
          text: t.text,
          notes: t.notes,
          notesType: typeof t.notes,
          notesLength: t.notes ? t.notes.length : 'null/undefined',
          rawRecord: t // Show the complete raw record
        })));
        
        // Also show the complete raw data array for inspection
        console.log(`[${operationId}] Complete raw database records:`, data);

        const reloadedTopics = data.map(topic => ({
          id: `topic-${topic.id}`, // Use database ID with prefix
          text: topic.text,
          x: Number(topic.position_x),
          y: Number(topic.position_y),
          notes: topic.notes || undefined, // Ensure null becomes undefined
          isNew: false // Reloaded topics should not animate
        }));
        
        console.log(`[${operationId}] Mapped reloaded topics:`, 
          reloadedTopics.map(t => ({ id: t.id, text: t.text, x: t.x, y: t.y, notes: t.notes, notesType: typeof t.notes })));

        if (preventAnimations) {
          // Smart update: preserve existing topics to prevent animations
          setTopics(currentTopics => {
            // If topics are the same, don't change anything to prevent re-renders
            const currentTopicsMap = new Map(currentTopics.map(t => [t.id, t]));
            const hasChanges = reloadedTopics.some(newTopic => {
              const existing = currentTopicsMap.get(newTopic.id);
              return !existing || 
                existing.text !== newTopic.text ||
                existing.x !== newTopic.x ||
                existing.y !== newTopic.y ||
                existing.notes !== newTopic.notes;
            }) || currentTopics.length !== reloadedTopics.length;

            // For reloaded topics, preserve the isNew flag from current topics if they exist
            const updatedTopics = reloadedTopics.map(reloadedTopic => {
              const existing = currentTopicsMap.get(reloadedTopic.id);
              return {
                ...reloadedTopic,
                isNew: existing?.isNew || false // Preserve isNew state, default to false
              };
            });

            if (!hasChanges) {
              console.log(`[${operationId}] No changes detected, keeping current topics to prevent animations`);
              return currentTopics;
            } else {
              console.log(`[${operationId}] Changes detected, updating topics`);
              return updatedTopics; // Use updatedTopics which preserves isNew flags
            }
          });
        } else {
          // When not preventing animations, still preserve isNew flags for consistency
          setTopics(currentTopics => {
            const currentTopicsMap = new Map(currentTopics.map(t => [t.id, t]));
            const updatedTopics = reloadedTopics.map(reloadedTopic => {
              const existing = currentTopicsMap.get(reloadedTopic.id);
              return {
                ...reloadedTopic,
                isNew: existing?.isNew || false
              };
            });
            return updatedTopics;
          });
        }
        
        console.log(`[${operationId}] COMPLETED reload: Found ${reloadedTopics.length} topics`);
      } else {
        setTopics([]);
        console.log(`[${operationId}] COMPLETED reload: No topics found in database`);
      }
    } catch (error) {
      console.error(`[${operationId}] FAILED reload operation:`, error);
    }
  }, [supabase]);

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

  const addTopic = useCallback(async () => {
    if (!newTopicText.trim() || isOperationInProgress) {
      console.log('Add topic blocked - no text or operation in progress');
      return;
    }
    
    const operationId = `add-topic-${Date.now()}`;
    console.log(`[${operationId}] Starting add topic operation: "${newTopicText.trim()}"`);
    
    setIsOperationInProgress(true);
    
    try {
      const newTopic: Topic = {
        id: `topic-${Date.now()}-${Math.random()}`,
        text: newTopicText.trim(),
        ...getRandomPosition(),
        isNew: true // Mark as new for entrance animation
      };
      
      const currentTopics = topics;
      const updatedTopics = [...currentTopics, newTopic];
      
      console.log(`[${operationId}] Adding topic to ${currentTopics.length} existing topics`);
      
      // Save to database first
      await saveTopicsToDatabase(updatedTopics, operationId);
      
      // Then reload from database to get consistent state (allow animations for new topics)
      await reloadTopicsFromDatabase(operationId, false);
      
      // Also save to session storage in reflection mode for navigation
      if (isReflectionMode) {
        sessionStorage.setItem('mindmap-topics', JSON.stringify(updatedTopics));
      }
      
      toast({
        title: "Topic added!",
        description: "Your topic has been saved to your mindmap"
      });
    } catch (error) {
      console.error(`[${operationId}] Failed to add topic:`, error);
      // On error, reload from database to get consistent state
      await reloadTopicsFromDatabase(operationId, true);
      
      toast({
        title: "Error adding topic",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setNewTopicText("");
      setIsAddingTopic(false);
      setIsOperationInProgress(false);
    }
  }, [newTopicText, getRandomPosition, isReflectionMode, saveTopicsToDatabase, reloadTopicsFromDatabase, topics, toast, isOperationInProgress]);

  const removeTopic = useCallback(async (id: string) => {
    if (isOperationInProgress) {
      console.log('Remove topic blocked - operation in progress');
      return;
    }
    
    const operationId = `remove-topic-${Date.now()}`;
    const topicToRemove = topics.find(t => t.id === id);
    console.log(`[${operationId}] Starting remove topic operation: "${topicToRemove?.text || id}"`);
    
    setIsOperationInProgress(true);
    
    try {
      const currentTopics = topics;
      const updatedTopics = currentTopics.filter(topic => topic.id !== id);
      
      console.log(`[${operationId}] Removing topic from ${currentTopics.length} topics, ${updatedTopics.length} will remain`);
      
      // Save to database first
      await saveTopicsToDatabase(updatedTopics, operationId);
      
      // Then reload from database to get consistent state (allow animations for topic removal)
      await reloadTopicsFromDatabase(operationId, false);
      
      // Also save to session storage in reflection mode for navigation
      if (isReflectionMode) {
        sessionStorage.setItem('mindmap-topics', JSON.stringify(updatedTopics));
      }
      
      toast({
        title: "Topic removed!",
        description: "Your topic has been deleted from your mindmap"
      });
    } catch (error) {
      console.error(`[${operationId}] Failed to remove topic:`, error);
      // On error, reload from database to get consistent state
      await reloadTopicsFromDatabase(operationId, true);
      
      toast({
        title: "Error removing topic",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsOperationInProgress(false);
    }
  }, [isReflectionMode, saveTopicsToDatabase, reloadTopicsFromDatabase, topics, toast, isOperationInProgress]);

  const handleTopicClick = useCallback((topic: Topic, event: React.MouseEvent) => {
    console.log(`🔍 CLICK ATTEMPT on "${topic.text}":`, {
      isDragging,
      hasDraggedBeyondThreshold,
      draggedTopic,
      isCurrentlyDragged: draggedTopic === topic.id
    });
    
    // Don't open dialog if user was dragging beyond threshold or currently dragging
    if (isDragging || hasDraggedBeyondThreshold || draggedTopic === topic.id) {
      console.log(`❌ CLICK BLOCKED for "${topic.text}"`);
      return;
    }
    
    event.stopPropagation();
    console.log(`✅ CLICK ALLOWED for "${topic.text}" - opening dialog`);
    setSelectedTopic(topic);
    setTopicNotes(topic.notes || "");
    setIsTopicDialogOpen(true);
    
    // Debug logging to track notes source
    console.log(`🎯 TOPIC CLICKED: "${topic.text}"`);
    console.log(`📝 Notes found:`, {
      hasNotes: !!topic.notes,
      notesContent: topic.notes,
      notesLength: topic.notes?.length || 0,
      topicId: topic.id
    });
  }, [isDragging, hasDraggedBeyondThreshold, draggedTopic]);

  const saveTopicNotes = useCallback(async () => {
    if (!selectedTopic || isOperationInProgress) {
      console.log('Save notes blocked - no topic selected or operation in progress');
      return;
    }
    
    const operationId = `save-notes-${Date.now()}`;
    console.log(`[${operationId}] Starting save notes operation for topic: ${selectedTopic.text}`);
    
    setIsOperationInProgress(true);
    
    try {
      // Get current topics and update the specific one
      const currentTopics = topics;
      const updatedTopics = currentTopics.map(topic => {
        if (topic.id === selectedTopic.id) {
          const updatedTopic = { ...topic, notes: topicNotes || undefined };
          console.log(`[${operationId}] TOPIC UPDATE DETAILS:`, {
            originalTopic: topic,
            selectedTopicId: selectedTopic.id,
            topicNotes: topicNotes,
            updatedTopic: updatedTopic,
            notesBeforeUpdate: topic.notes,
            notesAfterUpdate: updatedTopic.notes
          });
          return updatedTopic;
        }
        return topic;
      });
      
      console.log(`[${operationId}] Updated topic notes from "${selectedTopic.notes || ''}" to "${topicNotes}"`);
      console.log(`[${operationId}] Topic being updated:`, {
        id: selectedTopic.id,
        text: selectedTopic.text,
        oldNotes: selectedTopic.notes,
        newNotes: topicNotes,
        processedNotes: topicNotes || undefined
      });
      console.log(`[${operationId}] Full updated topics array:`, updatedTopics.map(t => ({
        id: t.id,
        text: t.text,
        notes: t.notes,
        notesLength: t.notes?.length || 0
      })));
      
      // Update local state immediately with the new notes
      setTopics(updatedTopics);
      
      // Save to database with the updated topics (pass updatedTopics directly)
      await saveTopicsToDatabase(updatedTopics, operationId);
      
      // Then reload from database to get consistent state (prevent animations for note saves)
      await reloadTopicsFromDatabase(operationId, true);
      
      // Update session storage in reflection mode for navigation
      if (isReflectionMode) {
        // Wait a bit for state to update, then save current topics to session storage
        setTimeout(() => {
          setTopics(currentTopics => {
            sessionStorage.setItem('mindmap-topics', JSON.stringify(currentTopics));
            console.log(`[${operationId}] Updated session storage with ${currentTopics.length} topics`);
            return currentTopics;
          });
        }, 100);
      }
      
      setIsTopicDialogOpen(false);
      setSelectedTopic(null);
      setTopicNotes("");
      
      toast({
        title: "Notes saved!",
        description: "Your notes have been updated for this topic"
      });
    } catch (error) {
      console.error(`[${operationId}] Failed to save notes:`, error);
      // On error, reload from database to get consistent state
      await reloadTopicsFromDatabase(operationId, true);
      
      toast({
        title: "Error saving notes",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsOperationInProgress(false);
    }
  }, [selectedTopic, topicNotes, toast, isReflectionMode, saveTopicsToDatabase, reloadTopicsFromDatabase, topics, isOperationInProgress]);

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
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDraggedTopic(topicId);
      setIsDragging(false);
      setHasDraggedBeyondThreshold(false);
      setDragStartPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedTopic || !canvasRef.current || !dragStartPos) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Calculate distance from start position
    const dragDistance = Math.sqrt(
      Math.pow(currentX - dragStartPos.x, 2) + Math.pow(currentY - dragStartPos.y, 2)
    );
    
    // Only start dragging if we've moved more than 5 pixels (drag threshold)
    const DRAG_THRESHOLD = 5;
    
    if (dragDistance > DRAG_THRESHOLD && !hasDraggedBeyondThreshold) {
      setHasDraggedBeyondThreshold(true);
      setIsDragging(true);
    }
    
    // Only update position if we've passed the threshold
    if (hasDraggedBeyondThreshold) {
      setTopics(prev => {
        const updatedTopics = prev.map(topic => 
          topic.id === draggedTopic 
            ? { ...topic, x: Math.max(0, Math.min(rect.width - 120, currentX - 60)), y: Math.max(0, Math.min(rect.height - 30, currentY - 15)) }
            : topic
        );
        // Save to session storage in reflection mode when dragging (for instant feedback)
        if (isReflectionMode) {
          sessionStorage.setItem('mindmap-topics', JSON.stringify(updatedTopics));
        }
        return updatedTopics;
      });
    }
  }, [draggedTopic, dragStartPos, hasDraggedBeyondThreshold, isReflectionMode]);

  const handleMouseUp = useCallback(async () => {
    // Only save to database if we actually dragged beyond the threshold
    if (draggedTopic && hasDraggedBeyondThreshold && !isOperationInProgress) {
      const operationId = `drag-complete-${Date.now()}`;
      const draggedTopicText = topics.find(t => t.id === draggedTopic)?.text || draggedTopic;
      console.log(`[${operationId}] Starting save after drag operation for topic: "${draggedTopicText}"`);
      
      setIsOperationInProgress(true);
      
      try {
        const currentTopics = topics;
        
        // Save to database first
        await saveTopicsToDatabase(currentTopics, operationId);
        
        // Then reload from database to get consistent state (prevent animations for position updates)
        await reloadTopicsFromDatabase(operationId, true);
        
        // Also save to session storage in reflection mode for navigation
        if (isReflectionMode) {
          sessionStorage.setItem('mindmap-topics', JSON.stringify(currentTopics));
        }
      } catch (error) {
        console.error(`[${operationId}] Failed to save after drag:`, error);
        // On error, reload from database to get consistent state
        await reloadTopicsFromDatabase(operationId);
      } finally {
        setIsOperationInProgress(false);
      }
    }
    
    // Reset all drag-related state
    setDraggedTopic(null);
    setDragStartPos(null);
    setHasDraggedBeyondThreshold(false);
    
    // Reset dragging state - use a short delay only if we actually dragged
    if (hasDraggedBeyondThreshold) {
      setTimeout(() => setIsDragging(false), 50); // Reduced delay
    } else {
      // No delay if we didn't drag - allows immediate clicking
      setIsDragging(false);
    }
  }, [draggedTopic, hasDraggedBeyondThreshold, saveTopicsToDatabase, reloadTopicsFromDatabase, topics, isReflectionMode, isOperationInProgress]);

  const handleSave = useCallback(async () => {
    if (isOperationInProgress) {
      console.log('Manual save blocked - operation in progress');
      return;
    }
    
    const operationId = `manual-save-${Date.now()}`;
    console.log(`[${operationId}] Starting manual save operation with ${topics.length} topics`);
    
    setIsOperationInProgress(true);
    
    try {
      const currentTopics = topics;
      
      // Save to database for persistence (both modes)
      await saveTopicsToDatabase(currentTopics, operationId);
      
      // Reload from database to ensure consistency (prevent animations for manual saves)
      await reloadTopicsFromDatabase(operationId, true);
      
      // In reflection mode, also save to session storage for navigation
      if (isReflectionMode) {
        sessionStorage.setItem('mindmap-topics', JSON.stringify(currentTopics));
      }

      // Call the optional onSave callback
      onSave?.(username, currentTopics);
      
      toast({
        title: "Mindmap saved!",
        description: `Saved ${currentTopics.length} topics${isReflectionMode ? ' for reflection' : ' to your persistent mindmap'}`
      });
      
    } catch (error) {
      console.error(`[${operationId}] Error saving mindmap:`, error);
      toast({
        title: "Error saving mindmap",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsOperationInProgress(false);
    }
  }, [username, topics, onSave, toast, isReflectionMode, saveTopicsToDatabase, reloadTopicsFromDatabase, isOperationInProgress]);

  const deleteAllTopics = useCallback(async () => {
    if (isOperationInProgress) {
      console.log('Delete all blocked - operation in progress');
      return;
    }
    
    // Show confirmation dialog
    const confirmed = window.confirm("Are you sure you want to delete all topics? This action cannot be undone.");
    if (!confirmed) return;
    
    const operationId = `delete-all-${Date.now()}`;
    console.log(`[${operationId}] Starting delete all topics operation (${topics.length} topics)`);
    
    setIsOperationInProgress(true);
    
    try {
      // Clear from database
      await saveTopicsToDatabase([], operationId);
      
      // Reload from database to ensure consistency (allow animations for clearing all)
      await reloadTopicsFromDatabase(operationId, false);
      
      // Clear session storage in reflection mode
      if (isReflectionMode) {
        sessionStorage.setItem('mindmap-topics', JSON.stringify([]));
      }
      
      // Reset UI state
      setNewTopicText("");
      setIsAddingTopic(false);
      
      toast({
        title: "All topics deleted",
        description: "All topics have been permanently removed from your mindmap"
      });
    } catch (error) {
      console.error(`[${operationId}] Error deleting all topics:`, error);
      toast({
        title: "Error deleting topics",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsOperationInProgress(false);
    }
  }, [saveTopicsToDatabase, reloadTopicsFromDatabase, toast, isReflectionMode, topics, isOperationInProgress]);

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
                onClick={deleteAllTopics}
                disabled={topics.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Topics
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
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-8 py-6 text-center font-bold text-xl shadow-xl border-4 border-white min-w-[250px] max-w-[350px] relative z-20"
            >
              {username}
            </motion.div>

            {/* Topic Bubbles */}
            <AnimatePresence>
              {topics.map((topic) => (
                <motion.div
                  key={topic.id}
                  initial={topic.isNew ? { scale: 0, opacity: 0 } : false}
                  animate={draggedTopic === topic.id ? false : { scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={draggedTopic === topic.id ? { duration: 0 } : undefined}
                  onAnimationComplete={() => {
                    // Reset isNew flag after animation completes to prevent future animations
                    if (topic.isNew) {
                      setTopics(currentTopics => 
                        currentTopics.map(t => 
                          t.id === topic.id ? { ...t, isNew: false } : t
                        )
                      );
                    }
                  }}
                  className="absolute cursor-pointer select-none bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full px-4 py-2 text-center font-medium text-sm shadow-lg border-2 border-white max-w-[120px] group hover:shadow-xl transition-shadow"
                  style={{ 
                    left: topic.x, 
                    top: topic.y,
                    zIndex: draggedTopic === topic.id ? 30 : 10
                  }}
                  onMouseDown={(e) => handleMouseDown(e, topic.id)}
                  onClick={(e) => {
                    console.log(`🖱️ RAW CLICK EVENT on "${topic.text}"`);
                    handleTopicClick(topic, e);
                  }}
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
              className="absolute inset-0 pointer-events-none z-0"
              style={{ 
                width: '100%', 
                height: '100%'
              }}
            >
              {topics.map((topic) => {
                // Canvas is 600px high, width varies - get actual center X but use fixed center Y
                const centerX = canvasRef.current ? canvasRef.current.offsetWidth / 2 : 300;
                const centerY = 300; // Fixed center Y for 600px height
                
                // Calculate bubble width based on text length more accurately
                // Using canvas measurement would be ideal, but for now estimate based on text
                // Each character is approximately 7px in the small font, plus padding
                const textWidth = topic.text.length * 7; // 7px per character for small font
                const paddingX = 32; // px-4 = 16px each side
                const bubbleWidth = Math.max(60, Math.min(120, textWidth + paddingX)); // Min 60px, max 120px
                const bubbleHeight = 36; // py-2 padding + text height + border
                
                const topicCenterX = topic.x + (bubbleWidth / 2);
                const topicCenterY = topic.y + (bubbleHeight / 2);
                
                return (
                  <line
                    key={`line-${topic.id}`}
                    x1={topicCenterX}
                    y1={topicCenterY}
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
        <DialogContent className="sm:max-w-[600px] w-[90vw] max-h-[80vh] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
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
                className="mt-2 min-h-[200px] text-base"
                rows={8}
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