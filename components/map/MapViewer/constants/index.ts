/**
 * Constants for MapViewer component
 */

// MiniMap configuration
export const MINIMAP_CONFIG = {
  position: "bottom-right" as const,
  nodeBorderRadius: 8,
  nodeStrokeWidth: 2,
  style: {
    transform: "scale(0.8)",
    transformOrigin: "bottom right",
  },
  nodeStrokeColor: "#ffffff",
  bgColor: "rgba(15, 23, 42, 0.8)", // slate-900 with opacity
  maskColor: "rgba(255, 255, 255, 0.1)",
  maskStrokeColor: "#ffffff",
  maskStrokeWidth: 1,
  pannable: true,
  zoomable: true,
  ariaLabel: "Learning map overview",
  offsetScale: 5,
};

// Progress status colors for minimap
export const PROGRESS_COLORS = {
  passed: "#22c55e", // Green-500
  failed: "#ef4444", // Red-500
  submitted: "#3b82f6", // Blue-500
  in_progress: "#f59e0b", // Amber-500
  default: "#94a3b8", // Slate-400
} as const;

// Edge types
export const EDGE_TYPES = {
  floating: "floating",
} as const;

// Panel sizes
export const PANEL_SIZES = {
  LEFT_DEFAULT: 70,
  RIGHT_DEFAULT: 30,
  LEFT_WITH_SELECTION: 55,
  RIGHT_WITH_SELECTION: 45,
  LEFT_MINIMIZED: 95,
  RIGHT_MINIMIZED: 5,
  LEFT_MIN: 35,
  LEFT_MAX: 85,
  RIGHT_MIN: 5,
  RIGHT_MAX: 65,
} as const;

// Animation timings
export const ANIMATIONS = {
  PANEL_RESIZE_DURATION: 300,
  NODE_CENTER_DURATION: 600,
  SHADOW_PULSE_DURATION: 2000,
  SUBMISSION_REFRESH_INTERVAL: 30000,
} as const;

// Node styling
export const NODE_STYLES = {
  DEFAULT_SPRITE: "/islands/crystal.png",
  BRIGHTNESS_LOCKED: "brightness(0.3) grayscale(1)",
  BRIGHTNESS_DEFAULT: "brightness(1)",
  BRIGHTNESS_SELECTED: "brightness(1.15) saturate(1.3)",
} as const;

// Glow effects for different statuses
export const GLOW_EFFECTS = {
  passed: "drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]",
  failed: "drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]",
  submitted: "drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]",
  in_progress: "drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]",
} as const;

// Animation classes for different states
export const ANIMATION_CLASSES = {
  float: "animate-float",
  success: "animate-float-success",
  failed: "animate-float-failed",
  submitted: "animate-float-submitted",
  progress: "animate-float-progress",
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  NEXT_NODE: "Tab",
  PREV_NODE: "Shift+Tab",
  DESELECT: "Escape",
  TOGGLE_NAV: "Cmd+K",
} as const;