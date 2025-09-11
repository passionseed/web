"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { MapNode } from "@/types/map";

interface CustomNodeProps {
  data: MapNode;
  selected?: boolean;
}

export function CustomNode({ data, selected }: CustomNodeProps) {
  const spriteUrl = data.sprite_url || "/islands/crystal.png";
  const nodeClassName = `relative transition-all duration-300 ease-out ${
    selected ? "scale-110" : "scale-100 hover:scale-105"
  }`;
  const imageFilter = selected
    ? "brightness(1.2) saturate(1.3) drop-shadow(0 0 12px rgba(59, 130, 246, 0.5))"
    : "brightness(1) hover:brightness(1.05)";

  return (
    <>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-5 h-5 bg-blue-500 border-2 border-white shadow-md transition-all duration-200"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-md transition-all duration-200"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md transition-all duration-200"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-md transition-all duration-200"
      />

      <div className={nodeClassName}>
        {/* Selection indicator - smooth ring animation */}
        {selected && (
          <div className="absolute -inset-3 rounded-full">
            <div className="w-full h-full rounded-full border-3 border-blue-400 bg-blue-50/20 animate-pulse" />
            <div className="absolute inset-0.5 w-full h-full rounded-full border-2 border-blue-300 opacity-60" />
          </div>
        )}

        <img
          src={spriteUrl}
          alt={data.title}
          className="relative w-max h-max object-contain transition-all duration-300"
          style={{ filter: imageFilter }}
        />

        {/* Node label */}
        <div
          className={`absolute -top-8 -right-10 transform transition-all duration-300 ${
            selected ? "scale-105 -translate-y-1" : "scale-100"
          }`}
        >
          <div 
            className={`border rounded-lg px-3 py-1 shadow-lg transition-all duration-300 ${
              selected 
                ? "bg-blue-50/95 border-blue-300 shadow-xl" 
                : "bg-white/90 border-gray-200"
            }`}
          >
            <div className={`text-xs font-bold text-center whitespace-normal max-w-24 truncate transition-colors duration-300 ${
              selected ? "text-blue-900" : "text-gray-800"
            }`}>
              {data.title}
            </div>
            <div className={`text-xs text-center transition-colors duration-300 ${
              selected ? "text-blue-600" : "text-gray-500"
            }`}>
              ⭐ {data.difficulty}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
