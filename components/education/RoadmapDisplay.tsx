"use client";

import { SimpleRoadmap, SimpleMilestone } from '@/types/education';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  Star, 
  BookOpen, 
  Lightbulb, 
  Users, 
  FileText,
  Calendar,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoadmapDisplayProps {
  roadmap: SimpleRoadmap;
  onSaveToJourney?: () => void;
  onRegenerateRoadmap?: () => void;
  className?: string;
}

export function RoadmapDisplay({
  roadmap,
  onSaveToJourney,
  onRegenerateRoadmap,
  className
}: RoadmapDisplayProps) {
  
  const getCategoryIcon = (category: SimpleMilestone['category']) => {
    switch (category) {
      case 'academic': return BookOpen;
      case 'skill': return Lightbulb;
      case 'experience': return Users;
      case 'application': return FileText;
      default: return Target;
    }
  };

  const getCategoryColor = (category: SimpleMilestone['category']) => {
    switch (category) {
      case 'academic': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'skill': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'experience': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'application': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getImportanceColor = (importance: SimpleMilestone['importance']) => {
    switch (importance) {
      case 'critical': return 'bg-red-500 text-white';
      case 'important': return 'bg-yellow-500 text-black';
      case 'beneficial': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getImportanceIcon = (importance: SimpleMilestone['importance']) => {
    switch (importance) {
      case 'critical': return '🔴';
      case 'important': return '🟡';
      case 'beneficial': return '🟢';
      default: return '⚪';
    }
  };

  const milestonesByCategory = roadmap.milestones.reduce((acc, milestone) => {
    if (!acc[milestone.category]) {
      acc[milestone.category] = [];
    }
    acc[milestone.category].push(milestone);
    return acc;
  }, {} as Record<string, SimpleMilestone[]>);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                {roadmap.overview.title}
              </CardTitle>
              <div className="space-y-1">
                <p className="text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <strong>Timeline:</strong> {roadmap.overview.timeframe}
                </p>
                <p className="text-slate-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <strong>Target University:</strong> {roadmap.overview.primary_university}
                </p>
                <p className="text-slate-300 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <strong>Primary Focus:</strong> {roadmap.overview.primary_interest}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {onRegenerateRoadmap && (
                <Button
                  variant="outline"
                  onClick={onRegenerateRoadmap}
                  className="border-slate-600"
                >
                  Regenerate
                </Button>
              )}
              {onSaveToJourney && (
                <Button
                  onClick={onSaveToJourney}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Save to Journey Map
                </Button>
              )}
            </div>
          </div>
          
          {roadmap.overview.vision && (
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-slate-300 italic">
                <strong>Your Vision:</strong> "{roadmap.overview.vision}"
              </p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Milestones by Category */}
      <div className="space-y-6">
        {Object.entries(milestonesByCategory).map(([category, milestones]) => {
          const Icon = getCategoryIcon(category as SimpleMilestone['category']);
          const categoryColor = getCategoryColor(category as SimpleMilestone['category']);
          
          return (
            <div key={category} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg border",
                  categoryColor
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold text-white capitalize">
                  {category} Milestones
                </h3>
                <Badge variant="outline" className="text-slate-400">
                  {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Milestones Grid */}
              <div className="grid gap-4">
                {milestones.map((milestone, index) => (
                  <Card
                    key={index}
                    className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Milestone Header */}
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-white text-lg">
                            {milestone.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={cn(
                                "text-xs font-bold",
                                getImportanceColor(milestone.importance)
                              )}
                            >
                              {getImportanceIcon(milestone.importance)} {milestone.importance}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-slate-400 border-slate-600"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {milestone.target_timeframe}
                            </Badge>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-slate-300 leading-relaxed">
                          {milestone.description}
                        </p>

                        {/* Progress placeholder */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                          <span className="text-sm text-slate-400">
                            Status: Not started
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                            <span className="text-xs text-slate-500">
                              Click to track progress
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">
                {roadmap.milestones.length}
              </div>
              <div className="text-sm text-slate-400">Total Milestones</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">
                {roadmap.milestones.filter(m => m.importance === 'critical').length}
              </div>
              <div className="text-sm text-slate-400">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {roadmap.milestones.filter(m => m.importance === 'important').length}
              </div>
              <div className="text-sm text-slate-400">Important</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {roadmap.milestones.filter(m => m.importance === 'beneficial').length}
              </div>
              <div className="text-sm text-slate-400">Beneficial</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="bg-blue-600/10 border-blue-500/30">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-400" />
            Next Steps
          </h3>
          <div className="space-y-2 text-slate-300">
            <p>• Review each milestone and understand what's required</p>
            <p>• Start with the critical milestones first</p>
            <p>• Break down large milestones into smaller, actionable tasks</p>
            <p>• Set specific deadlines for each milestone</p>
            <p>• Track your progress regularly and adjust as needed</p>
          </div>
          {onSaveToJourney && (
            <div className="mt-4 pt-3 border-t border-blue-500/20">
              <p className="text-sm text-blue-300">
                💡 <strong>Tip:</strong> Save this roadmap to your Journey Map to start 
                tracking progress and breaking down milestones into detailed projects.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}