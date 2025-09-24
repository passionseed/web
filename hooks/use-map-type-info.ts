import { LucideIcon, User, School, Users, GitBranch, Globe } from "lucide-react";

export interface MapTypeInfo {
  title: string;
  icon: LucideIcon;
  description: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

export function useMapTypeInfo() {
  const getMapTypeInfo = (mapType: string): MapTypeInfo => {
    switch (mapType) {
      case "personal":
        return {
          title: "My Maps",
          icon: User,
          description: "Maps you created",
          bgColor: "from-blue-900/50 to-indigo-900/50",
          borderColor: "border-blue-600/30",
          iconColor: "text-blue-400",
        };
      case "classroom":
        return {
          title: "Classroom Maps",
          icon: School,
          description: "Learning maps assigned by instructors",
          bgColor: "from-green-900/50 to-emerald-900/50",
          borderColor: "border-green-600/30",
          iconColor: "text-green-400",
        };
      case "team":
        return {
          title: "Team Maps",
          icon: Users,
          description: "Collaborative maps for your team",
          bgColor: "from-purple-900/50 to-violet-900/50",
          borderColor: "border-purple-600/30",
          iconColor: "text-purple-400",
        };
      case "forked":
        return {
          title: "Forked Maps",
          icon: GitBranch,
          description: "Maps you forked and customized",
          bgColor: "from-orange-900/50 to-amber-900/50",
          borderColor: "border-orange-600/30",
          iconColor: "text-orange-400",
        };
      default:
        return {
          title: "Public Maps",
          icon: Globe,
          description: "Community learning maps",
          bgColor: "from-slate-900/50 to-gray-900/50",
          borderColor: "border-slate-600/30",
          iconColor: "text-slate-400",
        };
    }
  };

  const groupMapsByType = <T extends { map_type?: string }>(maps: T[]) => {
    const grouped = maps.reduce(
      (acc, map) => {
        const type = map.map_type || "public";
        if (!acc[type]) acc[type] = [];
        acc[type].push(map);
        return acc;
      },
      {} as Record<string, T[]>
    );

    const orderedTypes = ["personal", "classroom", "team", "forked", "public"];
    return orderedTypes
      .filter((type) => grouped[type]?.length > 0)
      .map((type) => ({
        type,
        maps: grouped[type],
        ...getMapTypeInfo(type),
      }));
  };

  return {
    getMapTypeInfo,
    groupMapsByType,
  };
}