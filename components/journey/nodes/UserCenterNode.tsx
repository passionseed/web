/**
 * UserCenterNode - Central profile node at the origin of the journey map
 * Always positioned at (0, 0), non-draggable, displays user stats
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { User, Target, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserCenterNodeProps {
  data: {
    userId: string;
    userName: string;
    userAvatar?: string;
    projectCount: number;
    completionPercentage: number;
  };
}

export function UserCenterNode({ data }: UserCenterNodeProps) {
  const initials = data.userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      {/* Connection handles - user center can connect in all directions */}
      <Handle
        type="source"
        position={Position.Top}
        className="w-2 h-2 bg-blue-500/50 border-2 border-blue-400"
        style={{ pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-blue-500/50 border-2 border-blue-400"
        style={{ pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-2 h-2 bg-blue-500/50 border-2 border-blue-400"
        style={{ pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-blue-500/50 border-2 border-blue-400"
        style={{ pointerEvents: "none" }}
      />

      <div
        className="relative cursor-pointer group"
        role="button"
        tabIndex={0}
        aria-label={`${data.userName}'s Journey Center - ${data.projectCount} projects, ${data.completionPercentage}% complete`}
      >
        {/* Animated glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 blur-xl opacity-60 animate-pulse" />

        {/* Main container */}
        <div className="relative bg-white rounded-full p-2 shadow-2xl border-4 border-blue-400 w-32 h-32 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-blue-500">
          <div className="flex flex-col items-center justify-center gap-1">
            {/* User avatar */}
            <Avatar className="w-16 h-16 border-2 border-blue-300">
              <AvatarImage src={data.userAvatar} alt={data.userName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Stats */}
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700"
              >
                <Target className="w-3 h-3 mr-0.5" />
                {data.projectCount}
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700"
              >
                <TrendingUp className="w-3 h-3 mr-0.5" />
                {data.completionPercentage}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Label */}
        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 shadow-lg">
            <div className="text-sm font-bold text-gray-800 text-center flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" />
              {data.userName}
            </div>
          </div>
        </div>

        {/* Hover effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-400/20 to-transparent rounded-full" />
        </div>
      </div>
    </div>
  );
}
