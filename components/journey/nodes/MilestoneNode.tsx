/**
 * MilestoneNode - Individual milestone node for project milestone maps
 * Rectangular node with gradient design matching project nodes
 * Zoom-responsive with progressive disclosure
 */

import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { CheckCircle, Circle, Clock, Ban, Forward, Edit, BookOpen, Check, X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProjectMilestone, MilestoneStatus } from "@/types/journey";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MilestoneNodeProps {
  data: {
    milestone: ProjectMilestone;
    latestJournalPreview?: string;
    numericZoom?: number;
    onOpenProgress?: () => void;
    onEdit?: () => void;
    onAddJournal?: () => void;
    onUpdateMilestone?: (milestoneId: string, updates: Partial<ProjectMilestone>) => void;
  };
  selected?: boolean;
}

const statusConfig: Record<
  MilestoneStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    bgGradient: string;
    borderColor: string;
    glowColor: string;
    label: string;
  }
> = {
  not_started: {
    icon: Circle,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    bgGradient: "from-gray-50 to-gray-100",
    borderColor: "border-gray-300",
    glowColor: "from-gray-300 to-gray-400",
    label: "Not Started",
  },
  in_progress: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-50", 
    bgGradient: "from-blue-50 to-blue-100",
    borderColor: "border-blue-400",
    glowColor: "from-blue-400 to-cyan-400",
    label: "In Progress",
  },
  blocked: {
    icon: Ban,
    color: "text-red-600",
    bgColor: "bg-red-50",
    bgGradient: "from-red-50 to-red-100",
    borderColor: "border-red-400",
    glowColor: "from-red-400 to-orange-400",
    label: "Blocked",
  },
  completed: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    bgGradient: "from-green-50 to-green-100",
    borderColor: "border-green-400",
    glowColor: "from-green-400 to-emerald-400",
    label: "Completed",
  },
  skipped: {
    icon: Forward,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    bgGradient: "from-orange-50 to-orange-100",
    borderColor: "border-orange-400",
    glowColor: "from-orange-400 to-yellow-400",
    label: "Skipped",
  },
};

export function MilestoneNode({ data, selected = false }: MilestoneNodeProps) {
  const { milestone, latestJournalPreview, numericZoom = 1 } = data;
  const config = statusConfig[milestone.status];
  const StatusIcon = config.icon;

  // Inline editing state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempDescription, setTempDescription] = useState(milestone.description || '');
  const [tempTitle, setTempTitle] = useState(milestone.title || '');

  // Handler functions for inline editing
  const handleSaveDescription = () => {
    if (data.onUpdateMilestone) {
      data.onUpdateMilestone(milestone.id, { description: tempDescription });
    }
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setTempDescription(milestone.description || '');
    setIsEditingDescription(false);
  };

  const handleSaveTitle = () => {
    if (data.onUpdateMilestone) {
      data.onUpdateMilestone(milestone.id, { title: tempTitle });
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = () => {
    setTempTitle(milestone.title || '');
    setIsEditingTitle(false);
  };

  // Calculate progress 
  const progressPercentage =
    (milestone as any).progress_percentage || (milestone.status === "completed" ? 100 : 0);
  
  // Get custom style or use defaults
  const nodeStyle = milestone.style || {};

  // Debug: Log zoom values and milestone data to understand what's happening
  console.log(`Milestone "${milestone.title}" zoom:`, numericZoom);
  console.log(`Milestone data:`, milestone);
  console.log(`Latest journal preview:`, latestJournalPreview);
  
  // Determine zoom level for progressive disclosure - EXACTLY 3 states
  // Using different thresholds based on typical ReactFlow zoom behavior
  const isState1 = numericZoom < 0.8;      // State 1: Just name + progress %
  const isState2 = numericZoom >= 0.8 && numericZoom < 1.2;  // State 2: + description
  const isState3 = numericZoom >= 1.2;    // State 3: + detailed notes
  
  console.log(`Zoom state: 1=${isState1}, 2=${isState2}, 3=${isState3}`);

  // Calculate width based on zoom state - discrete steps, no gradual scaling
  let nodeWidth;
  if (isState1) {
    nodeWidth = 160;  // Small - just essentials
  } else if (isState2) {
    nodeWidth = 220;  // Medium - with description
  } else {
    nodeWidth = 280;  // Large - with all details
  }

  // Calculate icon size based on zoom
  const iconSize = isState1 ? 1.5 : isState2 ? 1.75 : 2;

  // Calculate progress ring offset for top-right indicator
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (progressPercentage / 100) * circumference;

  // Activity indicator (in progress status shows pulse)
  const hasRecentActivity = milestone.status === 'in_progress';

  return (
    <div className="relative">

      {/* Dynamic connection handles - position calculated automatically for floating edges */}
      <Handle
        type="source"
        position={Position.Top}
        id="source"
        className="opacity-0"
        style={{ pointerEvents: "none" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="opacity-0"
        style={{ pointerEvents: "none" }}
      />

      <div
        className={`relative cursor-pointer group ${
          selected ? "scale-110" : "hover:scale-[1.02]"
        } transition-all duration-200`}
        onClick={() => data.onOpenProgress?.()}
        role="button"
        tabIndex={0}
        aria-label={`Milestone: ${milestone.title} - ${config.label} - ${progressPercentage}% complete`}
        style={{
          width: `${nodeWidth}px`,
        }}
      >
        {/* Glow effect - hide at low zoom and only for in_progress */}
        {!isState1 && milestone.status === 'in_progress' && (
          <div
            className={`absolute inset-0 rounded-2xl blur-xl opacity-30 transition-opacity duration-300 bg-gradient-to-br ${config.glowColor}`}
          />
        )}

        {/* Activity pulse indicator */}
        {hasRecentActivity && (
          <div className="absolute top-2 right-2 z-50">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full" />
          </div>
        )}

        {/* Main container with gradient design like project nodes */}
        <div
          className={`relative bg-gradient-to-br ${config.bgGradient} rounded-2xl shadow-xl border-2 ${config.borderColor} transition-all duration-200 group-hover:shadow-2xl`}
          style={{
            backgroundColor: nodeStyle.backgroundColor || undefined,
            padding: isState1 ? '8px' : isState2 ? '12px' : '16px',
            minHeight: isState1 ? '80px' : isState2 ? '120px' : '160px',
          }}
        >

          {/* Header - always visible */}
          <div className="flex items-center gap-3 mb-2">
            <StatusIcon 
              className={`${config.color} transition-all duration-200`}
              style={{
                fontSize: `${iconSize}rem`,
              }}
            />
            {isEditingTitle ? (
              <div className="flex-1 space-y-2">
                <input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full font-bold p-1 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter title..."
                  style={{
                    fontSize: isState1 ? '0.875rem' : '1rem',
                  }}
                />
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveTitle();
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelTitle();
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="group/title relative flex-1 cursor-pointer hover:bg-white transition-colors rounded p-1 -m-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
              >
                <h3
                  className={`font-bold ${config.color} leading-tight transition-all duration-200`}
                  style={{
                    fontSize: isState1 ? '0.875rem' : '1rem',
                  }}
                >
                  {milestone.title}
                </h3>
                <div className="absolute top-1 right-1 opacity-0 group-hover/title:opacity-100 p-1 bg-blue-500 text-white rounded text-xs transition-opacity">
                  <Edit className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>

          {/* State 1: Progress bar - minimal view */}
          {isState1 && (
            <div className="mb-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-black opacity-80">Progress</span>
                <span className="font-medium text-blue-600">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2 bg-gray-200">
                <div className={`h-full ${config.color.replace('text-', 'bg-').replace('600', '500')} transition-all`} />
              </Progress>
            </div>
          )}

          {/* State 2: Add description and basic info */}
          {isState2 && (
            <>
              <div className="mb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${config.color} cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1 bg-transparent border-none`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {config.label}
                      <ChevronDown className="w-3 h-3" />
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="w-40" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Object.entries(statusConfig).map(([status, statusConf]) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (data.onUpdateMilestone) {
                            data.onUpdateMilestone(milestone.id, { status: status as MilestoneStatus });
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <statusConf.icon className={`w-4 h-4 ${statusConf.color}`} />
                        {statusConf.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-black opacity-80">Progress</span>
                  <span className="font-medium text-blue-600">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2 bg-gray-200">
                  <div className={`h-full ${config.color.replace('text-', 'bg-').replace('600', '500')} transition-all`} />
                </Progress>
              </div>

              {/* Editable Description */}
              <div className="mb-2">
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-sm p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Enter description..."
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveDescription();
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelDescription();
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="group/description relative cursor-pointer hover:bg-white transition-colors rounded p-2 -m-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingDescription(true);
                    }}
                  >
                    <p className={`text-xs ${!milestone.description ? 'italic text-gray-500' : 'text-black opacity-80'} line-clamp-2`}>
                      {milestone.description || 'Click to add description...'}
                    </p>
                    <div className="absolute top-2 right-2 opacity-0 group-hover/description:opacity-100 p-1 bg-blue-500 text-white rounded text-xs transition-opacity">
                      <Edit className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* State 3: Add detailed notes and action buttons */}
          {isState3 && (
            <>
              <div className="mb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${config.color} cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1 bg-transparent border-none`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {config.label}
                      <ChevronDown className="w-3 h-3" />
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="w-40" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Object.entries(statusConfig).map(([status, statusConf]) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (data.onUpdateMilestone) {
                            data.onUpdateMilestone(milestone.id, { status: status as MilestoneStatus });
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <statusConf.icon className={`w-4 h-4 ${statusConf.color}`} />
                        {statusConf.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-black opacity-80">Progress</span>
                  <span className="font-medium text-blue-600">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2 bg-gray-200">
                  <div className={`h-full ${config.color.replace('text-', 'bg-').replace('600', '500')} transition-all`} />
                </Progress>
              </div>

              {/* Editable Description */}
              <div className="mb-2">
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-sm p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Enter description..."
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveDescription();
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelDescription();
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="group/description relative cursor-pointer hover:bg-white transition-colors rounded p-2 -m-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingDescription(true);
                    }}
                  >
                    <p className={`text-xs ${!milestone.description ? 'italic text-gray-500' : 'text-black opacity-80'} line-clamp-2`}>
                      {milestone.description || 'Click to add description...'}
                    </p>
                    <div className="absolute top-2 right-2 opacity-0 group-hover/description:opacity-100 p-1 bg-blue-500 text-white rounded text-xs transition-opacity">
                      <Edit className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>

              
              {/* Latest Reflection - State 3 only */}
              {latestJournalPreview && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">Latest reflection:</div>
                  <div className={`text-xs ${config.color.replace('600', '500')} italic`}>
                    "{latestJournalPreview}"
                  </div>
                </div>
              )}

              {/* Due date and time estimate - State 3 only */}
              {(milestone.due_date || milestone.estimated_hours) && (
                <div className="flex items-center gap-4 mb-2">
                  {milestone.due_date && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <span>📅</span>
                      <span>{new Date(milestone.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {milestone.estimated_hours && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <span>⏱️</span>
                      <span>{milestone.estimated_hours}h</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons - State 3 only */}
              <div className="flex gap-2 mt-3">
                {data.onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onEdit?.();
                    }}
                    className="flex items-center justify-center px-3 py-2 bg-white/80 hover:bg-white text-gray-700 rounded-lg transition-colors shadow-sm"
                    aria-label="Edit milestone"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {data.onAddJournal && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onAddJournal?.();
                    }}
                    className="flex items-center justify-center px-3 py-2 bg-white/80 hover:bg-white text-gray-700 rounded-lg transition-colors shadow-sm"
                    aria-label="Add journal entry"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Shadow for depth when selected */}
        {selected && (
          <div className="absolute inset-0 -z-10">
            <div
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-black/20 rounded-full blur-lg"
              style={{
                animation: "shadow-pulse 2s ease-in-out infinite",
              }}
            />
          </div>
        )}
      </div>

      {/* Connection Handles - like project nodes */}
      <Handle
        type="target"
        position={Position.Left}
        className={`${config.color.replace('text-', 'bg-').replace('600', '500')} border-2 border-white shadow-lg hover:${config.color.replace('text-', 'bg-').replace('600', '600')} cursor-grab active:cursor-grabbing`}
        style={{
          left: -15,
          width: '30px',
          height: '30px',
          borderRadius: '50%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={`${config.color.replace('text-', 'bg-').replace('600', '500')} border-2 border-white shadow-lg hover:${config.color.replace('text-', 'bg-').replace('600', '600')} cursor-grab active:cursor-grabbing`}
        style={{
          right: -15,
          width: '30px',
          height: '30px',
          borderRadius: '50%'
        }}
      />
    </div>
  );
}