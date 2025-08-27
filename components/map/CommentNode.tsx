"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapNode } from "@/types/map";
import { MessageSquare, User } from "lucide-react";

interface CommentNodeProps {
  data: MapNode & { node_type?: string };
  selected?: boolean;
  onDataChange?: (data: Partial<MapNode>) => void;
  /** Allow the node to be edited at all. If false, editing is disabled. Defaults to true. */
  allowEdit?: boolean;
  /** Allow double-click to start editing. Defaults to true. */
  allowDoubleClick?: boolean;
  /** Show the small "Double-click to edit" hint. Defaults to true. */
  showHint?: boolean;
  /** Show the small explicit Edit button when double-click is disabled. Defaults to true. */
  showEditButton?: boolean;
  /** User role for permission checking */
  userRole?: "instructor" | "TA" | "student" | "admin";
}

export function CommentNode({
  data,
  selected,
  onDataChange,
  allowEdit = true,
  allowDoubleClick = true,
  showHint = true,
  showEditButton = true,
  userRole = "student",
}: CommentNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.title || "Click to add instructor comment");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Only instructors and TAs can edit comment nodes
  const canEdit = allowEdit && (userRole === "instructor" || userRole === "TA" || userRole === "admin");

  // Handle double-click to edit (only if enabled and editing is allowed)
  const handleDoubleClick = () => {
    if (!canEdit || !allowDoubleClick) return;
    setIsEditing(true);
  };

  // Explicit UI edit trigger (used when double-click is disabled)
  const handleStartEdit = () => {
    if (!canEdit) return;
    setIsEditing(true);
  };

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Handle text save (on blur)
  const handleSave = () => {
    setIsEditing(false);
    if (onDataChange && text !== data.title) {
      onDataChange({ title: text });
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setText(data.title || "Click to add instructor comment");
      setIsEditing(false);
    }
    // Allow Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSave();
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Set initial height
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // Get text styling based on metadata
  const textStyle = {
    fontSize: (data.metadata as any)?.fontSize || "14px",
    color: (data.metadata as any)?.textColor || "#374151",
    fontWeight: (data.metadata as any)?.fontWeight || "normal",
    textAlign: (data.metadata as any)?.textAlign || ("left" as const),
  };

  // Comment node specific styling - yellow sticky note appearance
  const containerClassName = `
    relative min-w-48 min-h-12 p-3 rounded-lg border-2 transition-all duration-200 shadow-md
    ${
      selected
        ? "border-yellow-400 bg-yellow-100/90 shadow-xl scale-105"
        : canEdit 
        ? "border-yellow-300 bg-yellow-50/90 hover:bg-yellow-100/90 shadow-md hover:shadow-lg cursor-pointer"
        : "border-yellow-200 bg-yellow-50/70 shadow-sm"
    }
    ${isEditing ? "border-yellow-500 shadow-lg" : ""}
    backdrop-blur-sm
  `.trim();

  return (
    <div
      className={containerClassName}
      onDoubleClick={handleDoubleClick}
    >
      {/* Comment icon header */}
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-4 w-4 text-yellow-600" />
        <User className="h-3 w-3 text-yellow-600" />
        <span className="text-xs font-medium text-yellow-700 uppercase tracking-wide">
          Instructor Comment
        </span>
      </div>

      {/* Selection indicator */}
      {selected && !isEditing && (
        <div className="absolute -inset-1 rounded-lg border-2 border-yellow-400 animate-pulse" />
      )}

      {/* Text content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onBlur={handleSave}
          onKeyDown={handleKeyPress}
          className="w-full bg-transparent border-none outline-none resize-none overflow-hidden"
          style={{
            fontSize: textStyle.fontSize,
            color: textStyle.color,
            fontWeight: textStyle.fontWeight,
            textAlign: textStyle.textAlign,
            minHeight: '60px',
          }}
          placeholder="Enter instructor comment..."
          rows={3}
        />
      ) : (
        <div
          className={`select-none whitespace-pre-wrap min-h-[60px] ${canEdit ? 'cursor-pointer' : ''}`}
          style={textStyle}
        >
          {text || "Click to add instructor comment"}
        </div>
      )}

      {/* Edit hint when selected */}
      {selected && !isEditing && showHint && canEdit && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap border border-gray-200">
          {allowDoubleClick ? "Double-click to edit" : "Click edit button"}
        </div>
      )}

      {/* Read-only indicator for students */}
      {selected && !canEdit && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded shadow-sm whitespace-nowrap border border-gray-200">
          Instructor comment (read-only)
        </div>
      )}

      {/* Edit button when double-click is disabled but editing is allowed */}
      {selected &&
        !isEditing &&
        canEdit &&
        !allowDoubleClick &&
        showEditButton && (
          <button
            onClick={handleStartEdit}
            className="absolute -top-2 right-2 p-1 rounded bg-yellow-200/90 shadow-sm text-xs text-yellow-800 hover:bg-yellow-300/90 border border-yellow-300"
            aria-label="Edit comment"
          >
            Edit
          </button>
        )}

      {/* Save hint when editing */}
      {isEditing && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap border border-gray-200">
          Ctrl+Enter to save, Esc to cancel
        </div>
      )}
    </div>
  );
}