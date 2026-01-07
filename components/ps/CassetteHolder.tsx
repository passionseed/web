"use client";

import { cn } from "@/lib/utils";
import { PSProject } from "@/actions/ps";

interface CassetteHolderProps {
  projects: PSProject[];
  className?: string;
}

export function CassetteHolder({ projects, className }: CassetteHolderProps) {
  // Display up to 12 cassettes
  const displayProjects = projects.slice(0, 12);

  // Consistent fallback colors for projects without specific themes
  const getFallbackColor = (id: string) => {
    const colors = ["#fef3c7", "#ffe4e6", "#dbeafe", "#d1fae5", "#ede9fe"]; // amber, rose, blue, emerald, violet 100
    const charCodeSum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };

  return (
    <div
      className={cn(
        "relative rounded-sm p-4 border-4 select-none group/holder",
        className
      )}
      style={{
        // Vibrant Orange Translucent Plastic
        backgroundColor: "rgba(255, 100, 0, 0.65)",
        borderColor: "rgba(220, 60, 0, 0.8)",
        boxShadow: "0 20px 40px -5px rgba(234, 88, 12, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.3), 0 0 0 1px rgba(255,255,255,0.2)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Plastic shell details */}
      <div className="absolute inset-0 pointer-events-none rounded-sm border-[1px] border-white/20" />
      <div className="absolute top-0 left-0 right-0 h-[15px] bg-gradient-to-b from-white/30 to-transparent z-20" />

      {/* Grid of cassette spines */}
      <div className="relative grid grid-cols-2 gap-x-6 gap-y-3 z-10">
        {displayProjects.map((project, idx) => {
          // Parse theme color
          let theme: any = null;
          if (project.theme_color) {
            if (typeof project.theme_color === 'string') {
              try {
                theme = JSON.parse(project.theme_color);
              } catch (e) {
                theme = { bg: project.theme_color };
              }
            } else {
              theme = project.theme_color;
            }
          }

          // Determine colors
          const fallbackBg = getFallbackColor(project.id);
          const bgColor = theme?.bg || fallbackBg;

          // If no specific label style, use consistent defaults based on brightness
          const labelBg = theme?.labelStyle?.background || "#ffffff";
          const borderColor = theme?.labelStyle?.borderColor || "rgba(0,0,0,0.1)";
          const textColor = theme?.labelStyle?.color || "#1f2937";

          return (
            <div
              key={project.id}
              className="relative h-10 w-full rounded-[1px] shadow-md transition-all duration-300 hover:scale-[1.03] hover:translate-x-1 cursor-pointer flex items-center overflow-hidden group/tape"
              style={{
                backgroundColor: bgColor,
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              }}
            >
              {/* Glass Case Sheen (Norelco box spine) */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/5 pointer-events-none z-20" />
              <div className="absolute top-[2px] bottom-[2px] left-[1px] w-[2px] bg-white/40 z-20" />
              <div className="absolute top-[2px] bottom-[2px] right-[1px] w-[1px] bg-black/10 z-20" />

              {/* J-Card Spine Label */}
              <div
                className="mx-[3px] flex-1 h-[88%] flex items-center px-3 rounded-[1px] relative z-10"
                style={{
                  backgroundColor: labelBg,
                  borderLeft: `3px solid ${borderColor}`,
                }}
              >
                {/* Text Content */}
                <div className="flex flex-col w-full leading-none overflow-hidden">
                  <span
                    className="font-bold text-[10px] uppercase tracking-tight truncate group-hover/tape:tracking-widest transition-all duration-500"
                    style={{ color: textColor, fontFamily: 'var(--font-mono)' }}
                  >
                    {project.name}
                  </span>
                  {project.spotify_artist_name && (
                    <span
                      className="text-[8px] truncate opacity-70 mt-[1px]"
                      style={{ color: textColor }}
                    >
                      {project.spotify_artist_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 12 - displayProjects.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="h-10 w-full rounded-[1px] border border-orange-900/10 bg-orange-900/5 shadow-inner flex items-center justify-center backdrop-blur-sm"
          >
            {/* Shelf detail */}
            <div className="w-full h-[1px] bg-orange-900/5" />
          </div>
        ))}
      </div>

      {/* Holder label */}
      <div className="mt-6 text-center relative z-10">
        <div className="inline-block px-3 py-1 bg-black/20 rounded-sm border border-white/10 backdrop-blur-md shadow-lg transform rotate-1">
          <span className="text-white text-[10px] uppercase font-bold tracking-[0.3em] font-mono text-shadow-sm">
            Projects
          </span>
        </div>
        <div className="text-orange-900/70 text-[9px] font-mono mt-2 font-medium tracking-tight">
          {projects.length} / 12 SLOTS FILLED
        </div>
      </div>
    </div>
  );
}
