"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapNode } from "@/types/map";

interface TextNodeProps {
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
}

export function TextNode({
  data,
  selected,
  onDataChange,
  allowEdit = true,
  allowDoubleClick = true,
  showHint = true,
  showEditButton = true,
}: TextNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.title || "Double-click to edit");
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle double-click to edit (only if enabled and editing is allowed)
  const handleDoubleClick = () => {
    if (!allowEdit || !allowDoubleClick) return;
    setIsEditing(true);
  };

  // Explicit UI edit trigger (used when double-click is disabled)
  const handleStartEdit = () => {
    if (!allowEdit) return;
    setIsEditing(true);
  };

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  // Handle text save (on Enter or blur)
  const handleSave = () => {
    setIsEditing(false);
    if (onDataChange && text !== data.title) {
      onDataChange({ title: text });
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
    color: (data.metadata as any)?.textColor || "#d5e5ff",
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
        // Allow click events to bubble to ReactFlow for selection
        // Only handle double-click for editing
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
      {/* Edit hint when selected (optional) */}
      {selected && !isEditing && showHint && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
          Double-click to edit
        </div>
      )}
      {/* If double-click is disabled but editing is allowed, optionally show an explicit edit button */}
      {selected &&
        !isEditing &&
        allowEdit &&
        !allowDoubleClick &&
        showEditButton && (
          <button
            onClick={handleStartEdit}
            className="absolute -top-3 right-2 p-1 rounded bg-white/90 shadow-sm text-xs text-gray-600 hover:bg-gray-100"
            aria-label="Edit text"
          >
            Edit
          </button>
        )}
    </div>
  );
}
