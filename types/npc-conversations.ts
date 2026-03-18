// =====================================================
// NPC CONVERSATION SYSTEM - TYPE DEFINITIONS
// Types for branching NPC conversations in PathLab
// Question Tree Event (QTE) system
// =====================================================

import { NPCAvatarData } from './npc-avatars';

// =====================================================
// ENUMS AND CONSTANTS
// =====================================================

export type NPCConversationNodeType =
  | 'question'    // Node asks user to choose between options
  | 'statement'   // NPC speaks and auto-continues to next node
  | 'end';        // Terminal node (conversation complete)

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * NPCConversation - Root container for conversation tree
 */
export interface NPCConversation {
  id: string;
  seed_id: string;
  title: string;
  description: string | null;
  root_node_id: string | null;  // Starting point of conversation
  estimated_minutes: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * NPCConversationNode - Individual node in conversation tree
 * Represents a question, statement, or ending
 */
export interface NPCConversationNode {
  id: string;
  conversation_id: string;
  npc_avatar_id: string | null;
  node_type: NPCConversationNodeType;
  text_content: string;
  title: string | null;
  metadata: NPCNodeMetadata;
  created_at: string;

  // Relations (loaded via joins)
  npc_avatar?: NPCAvatarData;
  choices?: NPCConversationChoice[];
}

/**
 * NPCConversationChoice - User choice option that branches conversation
 */
export interface NPCConversationChoice {
  id: string;
  from_node_id: string;
  to_node_id: string | null;  // null for terminal choices
  choice_text: string;
  choice_label: string | null;  // e.g., "Q1", "Q2", "A", "B"
  display_order: number;
  conditions: NPCChoiceConditions | null;
  metadata: NPCChoiceMetadata;
  created_at: string;

  // Relations (loaded via joins)
  to_node?: NPCConversationNode;
}

/**
 * NPCConversationProgress - User progress through a conversation
 */
export interface NPCConversationProgress {
  id: string;
  progress_id: string;  // Links to path_activity_progress
  conversation_id: string;
  user_id: string;
  current_node_id: string | null;
  visited_node_ids: string[];
  choice_history: NPCChoiceHistoryEntry[];
  is_completed: boolean;
  completed_at: string | null;
  started_at: string;
  updated_at: string;

  // Relations (loaded via joins)
  conversation?: NPCConversation;
  current_node?: NPCConversationNode;
}

// =====================================================
// METADATA TYPES
// =====================================================

/**
 * NPCNodeMetadata - Additional data for conversation nodes
 */
export interface NPCNodeMetadata {
  emotion?: 'happy' | 'sad' | 'neutral' | 'angry' | 'surprised' | 'thoughtful';
  urgency?: 'low' | 'medium' | 'high';
  background_color?: string;
  auto_advance_delay_ms?: number;  // For statement nodes
  [key: string]: any;
}

/**
 * NPCChoiceMetadata - Additional data for choices
 */
export interface NPCChoiceMetadata {
  personality_affect?: {
    trait: string;
    value: number;
  };
  relationship_points?: number;
  unlock_content?: string;  // ID of content to unlock
  [key: string]: any;
}

/**
 * NPCChoiceConditions - Conditions for displaying a choice
 */
export interface NPCChoiceConditions {
  requires_previous_choice?: string;  // Choice ID that must have been selected
  requires_visited_node?: string;     // Node ID that must have been visited
  min_relationship_points?: number;   // Minimum relationship score
  custom?: Record<string, any>;       // Custom conditions
}

/**
 * NPCChoiceHistoryEntry - Record of a choice made by user
 */
export interface NPCChoiceHistoryEntry {
  from_node_id: string;
  choice_id: string;
  to_node_id: string | null;
  timestamp: string;
}

// =====================================================
// EXTENDED TYPES FOR QUERIES
// =====================================================

/**
 * NPCConversationTree - Full conversation tree with all nodes and choices
 */
export interface NPCConversationTree {
  conversation: NPCConversation;
  nodes: NPCConversationNodeWithChoices[];
  root_node: NPCConversationNodeWithChoices | null;
}

/**
 * NPCConversationNodeWithChoices - Node with all its choices loaded
 */
export interface NPCConversationNodeWithChoices extends NPCConversationNode {
  choices: (NPCConversationChoice & {
    to_node?: NPCConversationNodeWithChoices;
  })[];
  npc_avatar?: NPCAvatarData;
}

/**
 * NPCConversationWithProgress - Conversation tree combined with user progress
 */
export interface NPCConversationWithProgress extends NPCConversationTree {
  progress: NPCConversationProgress | null;
}

// =====================================================
// INPUT TYPES FOR MUTATIONS
// =====================================================

/**
 * CreateNPCConversationInput - Input for creating a new conversation
 */
export interface CreateNPCConversationInput {
  seed_id: string;
  title: string;
  description?: string;
  estimated_minutes?: number;
}

/**
 * UpdateNPCConversationInput - Input for updating a conversation
 */
export interface UpdateNPCConversationInput {
  title?: string;
  description?: string;
  root_node_id?: string;
  estimated_minutes?: number;
}

/**
 * CreateNPCNodeInput - Input for creating a conversation node
 */
export interface CreateNPCNodeInput {
  conversation_id: string;
  npc_avatar_id?: string;
  node_type: NPCConversationNodeType;
  text_content: string;
  title?: string;
  metadata?: NPCNodeMetadata;
}

/**
 * UpdateNPCNodeInput - Input for updating a node
 */
export interface UpdateNPCNodeInput {
  npc_avatar_id?: string;
  node_type?: NPCConversationNodeType;
  text_content?: string;
  title?: string;
  metadata?: NPCNodeMetadata;
}

/**
 * CreateNPCChoiceInput - Input for creating a choice
 */
export interface CreateNPCChoiceInput {
  from_node_id: string;
  to_node_id?: string;  // Optional for terminal choices
  choice_text: string;
  choice_label?: string;
  display_order: number;
  conditions?: NPCChoiceConditions;
  metadata?: NPCChoiceMetadata;
}

/**
 * UpdateNPCChoiceInput - Input for updating a choice
 */
export interface UpdateNPCChoiceInput {
  to_node_id?: string;
  choice_text?: string;
  choice_label?: string;
  display_order?: number;
  conditions?: NPCChoiceConditions;
  metadata?: NPCChoiceMetadata;
}

/**
 * MakeChoiceInput - Input for user making a choice in conversation
 */
export interface MakeChoiceInput {
  progress_id: string;
  choice_id: string;
}

/**
 * StartConversationInput - Input for starting a conversation
 */
export interface StartConversationInput {
  conversation_id: string;
  progress_id: string;  // Link to path_activity_progress
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

/**
 * NPCConversationResponse - Response from GET /api/pathlab/npc-conversations/:id
 */
export interface NPCConversationResponse {
  conversation: NPCConversationTree;
}

/**
 * NPCConversationListResponse - Response from GET /api/pathlab/npc-conversations
 */
export interface NPCConversationListResponse {
  conversations: NPCConversation[];
}

/**
 * NPCConversationProgressResponse - Response from conversation progress endpoints
 */
export interface NPCConversationProgressResponse {
  progress: NPCConversationProgress;
  current_node: NPCConversationNodeWithChoices | null;
  available_choices: NPCConversationChoice[];
}

/**
 * MakeChoiceResponse - Response from POST /api/pathlab/npc-conversations/choice
 */
export interface MakeChoiceResponse {
  progress: NPCConversationProgress;
  next_node: NPCConversationNodeWithChoices | null;
  is_completed: boolean;
}

// =====================================================
// BUILDER TYPES
// =====================================================

/**
 * ConversationBuilderNode - Node representation for conversation builder UI
 */
export interface ConversationBuilderNode extends NPCConversationNode {
  x?: number;  // Position for visual editor
  y?: number;
  choices: (NPCConversationChoice & {
    to_node_id: string | null;
  })[];
}

/**
 * ConversationBuilderState - State for conversation builder
 */
export interface ConversationBuilderState {
  conversation: NPCConversation;
  nodes: Map<string, ConversationBuilderNode>;
  selectedNodeId: string | null;
  isEditing: boolean;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * ConversationStats - Statistics about a conversation
 */
export interface ConversationStats {
  total_nodes: number;
  total_choices: number;
  total_end_nodes: number;
  average_path_length: number;
  unique_paths: number;
}

/**
 * ConversationValidation - Validation result for conversation tree
 */
export interface ConversationValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * PathAnalysis - Analysis of a specific path through conversation
 */
export interface PathAnalysis {
  path_id: string;
  node_sequence: string[];
  choice_sequence: string[];
  estimated_minutes: number;
  end_node_id: string;
}
