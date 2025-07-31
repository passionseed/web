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
  const nodeClassName = `relative ${selected ? "scale-110" : ""} transition-transform duration-200`;
  const imageFilter = selected
    ? "brightness(1.1) saturate(1.2)"
    : "brightness(1)";

  return (
    <>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-5 h-5 bg-blue-500 border-2 border-white shadow-md"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-md"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-white shadow-md"
      />

      <div className={nodeClassName}>
        {selected && (
          <div className="absolute -inset-2 rounded-full border-4 border-blue-400 animate-pulse" />
        )}

        <img
          src={spriteUrl}
          alt={data.title}
          className="w-max h-max object-contain drop-shadow-lg hover:drop-shadow-xl transition-all duration-200"
          style={{ filter: imageFilter }}
        />

        {/* Node label */}
        <div
          className={`absolute -top-8 -right-10 transform ${selected ? "scale-105" : ""} transition-all duration-200`}
        >
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
}
