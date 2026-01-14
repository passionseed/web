import { PSProject } from "@/actions/ps";
import Link from "next/link";
import { Play } from "lucide-react";
import { StatsPaper } from "./StatsPaper";

interface CassetteTapeProps {
  project: PSProject;
  stats?: {
    feedbackCount: number;
    progressPercent: number;
    totalFocusMinutes: number;
  };
  hidePaper?: boolean;
  className?: string; // Allow overriding width/size
}

export function CassetteTape({
  project,
  stats,
  hidePaper = false,
  ...props
}: CassetteTapeProps) {
  // Use hash of project ID to pick a random color for the label to add variety if no theme color
  const colors = [
    "bg-amber-100",
    "bg-rose-100",
    "bg-blue-100",
    "bg-emerald-100",
    "bg-violet-100",
  ];
  const colorIndex =
    project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;

  const defaultLabelColor = colors[colorIndex];

  // Custom styles from extracted colors
  const theme = project.theme_color as any; // Using any for jsonb for now

  const tapeStyle = theme
    ? {
        background: theme.bg,
      }
    : {}; // Default handled by class

  const labelStyle = theme
    ? {
        background: theme.labelStyle?.background,
        borderColor: theme.labelStyle?.borderColor,
        color: theme.labelStyle?.color,
      }
    : {};

  const grooveStyle = theme
    ? {
        borderColor: theme.grooveStyle?.borderColor,
      }
    : {};

  const isCustomTheme = !!theme;

  const tasks = (project as any).ps_tasks || [];

  return (
    <div
      className={`relative group/cassette w-full mx-auto perspective-1000 ${
        props.className || "max-w-[420px]"
      }`}
    >
      {/* Stats Paper (Integrated Mode) - Behind */}
      {!hidePaper && stats && (
        <StatsPaper
          stats={stats}
          tasks={tasks}
          variant="integrated"
          projectId={project.id}
        />
      )}

      <Link
        href={`/ps/projects/${project.id}`}
        className="block relative w-full aspect-[1.6/1] transition-transform group-hover/cassette:scale-[1.02] group-hover/cassette:-rotate-1 duration-300 z-10"
      >
        {/* Cassette Body */}
        <div
          className={`absolute inset-0 rounded-xl shadow-2xl overflow-hidden border-2 border-neutral-700/50 ${!isCustomTheme ? "bg-neutral-800" : ""}`}
          style={tapeStyle}
        >
          {/* Screw holes */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-neutral-900 shadow-inner border border-neutral-700/50"></div>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-neutral-900 shadow-inner border border-neutral-700/50"></div>
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-neutral-900 shadow-inner border border-neutral-700/50"></div>
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-neutral-900 shadow-inner border border-neutral-700/50"></div>

          {/* Top Label Area */}
          <div
            className={`absolute top-[8%] left-[5%] right-[5%] h-[65%] rounded-md shadow-sm p-3 flex flex-col ${!isCustomTheme ? defaultLabelColor : ""}`}
            style={labelStyle}
          >
            {/* Handwritten-style Title */}
            <div
              className={`font-handwriting text-xl font-bold truncate border-b-2 pb-1 mb-1 font-mono ${!isCustomTheme ? "text-neutral-800 border-neutral-800/20" : ""}`}
              style={
                isCustomTheme
                  ? { borderColor: `${theme.labelStyle?.color}40` }
                  : {}
              }
            >
              {project.name}
            </div>

            {/* Lines for writing */}
            <div className="flex-1 space-y-1 relative">
              <div className="flex justify-between items-start">
                <p
                  className={`text-[10px] line-clamp-2 font-mono leading-tight flex-1 mr-2 ${!isCustomTheme ? "text-neutral-800/80" : "opacity-80"}`}
                >
                  {project.goal ||
                    project.description ||
                    "No tracks recorded yet..."}
                </p>
                {project.spotify_artist_name && (
                  <div
                    className={`text-[9px] font-bold border rounded px-1 max-w-[40%] truncate ${!isCustomTheme ? "text-neutral-800 border-neutral-800/30" : ""}`}
                    style={
                      isCustomTheme
                        ? { borderColor: `${theme.labelStyle?.color}50` }
                        : {}
                    }
                  >
                    {project.spotify_artist_name}
                  </div>
                )}
              </div>

              <div
                className={`absolute bottom-1 right-1 border-2 rounded px-1 text-[8px] font-bold ${!isCustomTheme ? "border-neutral-800/80 text-neutral-800" : ""}`}
                style={
                  isCustomTheme
                    ? { borderColor: `${theme.labelStyle?.color}CC` }
                    : {}
                }
              >
                SIDE A
              </div>

              {project.spotify_track_name && (
                <div
                  className={`absolute bottom-1 left-0 text-[9px] italic truncate max-w-[70%] ${!isCustomTheme ? "text-neutral-800/70" : "opacity-70"}`}
                >
                  feat. {project.spotify_track_name}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Window Section - Adjusted for centering and overlap */}
          <div className="absolute bottom-[38%] left-[25%] right-[25%] h-[20%] bg-neutral-900/75 rounded-full flex items-center justify-center gap-4 p-2 border border-neutral-700/50  overflow-hidden backdrop-blur-sm">
            {/* Window Glass Reflection */}
            <div className="absolute top-0 left-10 w-20 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"></div>

            {/* Left Reel */}
            <div className="w-8 h-8 rounded-full bg-white/90 border-2 border-neutral-600 relative animate-spin-slow group-hover/cassette:animate-spin">
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-neutral-300 -ml-px"></div>
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-neutral-300 -mt-px"></div>
              <div
                className="w-full h-full rounded-full border border-dashed border-neutral-400 opacity-50"
                style={grooveStyle}
              ></div>
            </div>

            {/* Tape Window */}
            <div className="flex-1 h-6 bg-neutral-800/80 mx-1 relative overflow-hidden rounded-sm">
              <div className="absolute top-1/2 left-0 right-0 h-3 bg-amber-900/80 -mt-1.5 rounded-sm border-t border-b border-neutral-950/50"></div>
            </div>

            {/* Right Reel */}
            <div className="w-8 h-8 rounded-full bg-white/90 border-2 border-neutral-600 relative animate-spin-slow group-hover/cassette:animate-spin">
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-neutral-300 -ml-px"></div>
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-neutral-300 -mt-px"></div>
              <div
                className="w-full h-full rounded-full border border-dashed border-neutral-400 opacity-50"
                style={grooveStyle}
              ></div>
            </div>
          </div>
        </div>

        {/* Play Button Overlay (Hover) */}
        {/* <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cassette:opacity-100 transition-opacity bg-black/20 rounded-xl pointer-events-none">
          <div className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg transform scale-90 group-hover/cassette:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-current" />
          </div>
        </div> */}
      </Link>
    </div>
  );
}
