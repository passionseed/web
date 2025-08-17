"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapNode } from "@/types/map";

interface TextNodeProps {
  data: MapNode & { node_type?: string };
  selected?: boolean;
  onDataChange?: (data: Partial<MapNode>) => void;
}

export function TextNode({ data, selected, onDataChange }: TextNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.title || "Double-click to edit");
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle double-click to edit
  const handleDoubleClick = () => {
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
    color: (data.metadata as any)?.textColor || "#374151",
    backgroundColor: (data.metadata as any)?.backgroundColor || "transparent",
    fontWeight: (data.metadata as any)?.fontWeight || "normal",
    textAlign: (data.metadata as any)?.textAlign || "center" as const,
  };

  const containerClassName = `
    relative min-w-32 min-h-8 p-2 rounded-lg border-2 transition-all duration-200
    ${selected 
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
