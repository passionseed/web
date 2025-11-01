/**
 * UN Sustainable Development Goals (SDGs)
 * Official 17 goals with numbers, titles, descriptions, and colors
 */
export const SDG_GOALS = [
  {
    number: 1,
    title: "No Poverty",
    description: "End poverty in all its forms everywhere",
    color: "#E5243B",
    icon: "🏠",
  },
  {
    number: 2,
    title: "Zero Hunger",
    description: "End hunger, achieve food security and improved nutrition",
    color: "#DDA63A",
    icon: "🌾",
  },
  {
    number: 3,
    title: "Good Health and Well-being",
    description: "Ensure healthy lives and promote well-being for all",
    color: "#4C9F38",
    icon: "❤️",
  },
  {
    number: 4,
    title: "Quality Education",
    description: "Ensure inclusive and equitable quality education",
    color: "#C5192D",
    icon: "📚",
  },
  {
    number: 5,
    title: "Gender Equality",
    description: "Achieve gender equality and empower all women and girls",
    color: "#FF3A21",
    icon: "⚖️",
  },
  {
    number: 6,
    title: "Clean Water and Sanitation",
    description: "Ensure availability and sustainable management of water",
    color: "#26BDE2",
    icon: "💧",
  },
  {
    number: 7,
    title: "Affordable and Clean Energy",
    description: "Ensure access to affordable, reliable, sustainable energy",
    color: "#FCC30B",
    icon: "⚡",
  },
  {
    number: 8,
    title: "Decent Work and Economic Growth",
    description: "Promote sustained, inclusive economic growth and employment",
    color: "#A21942",
    icon: "💼",
  },
  {
    number: 9,
    title: "Industry, Innovation and Infrastructure",
    description: "Build resilient infrastructure, promote innovation",
    color: "#FD6925",
    icon: "🏗️",
  },
  {
    number: 10,
    title: "Reduced Inequalities",
    description: "Reduce inequality within and among countries",
    color: "#DD1367",
    icon: "📊",
  },
  {
    number: 11,
    title: "Sustainable Cities and Communities",
    description: "Make cities and human settlements inclusive and sustainable",
    color: "#FD9D24",
    icon: "🏙️",
  },
  {
    number: 12,
    title: "Responsible Consumption and Production",
    description: "Ensure sustainable consumption and production patterns",
    color: "#BF8B2E",
    icon: "♻️",
  },
  {
    number: 13,
    title: "Climate Action",
    description: "Take urgent action to combat climate change",
    color: "#3F7E44",
    icon: "🌍",
  },
  {
    number: 14,
    title: "Life Below Water",
    description: "Conserve and sustainably use the oceans and marine resources",
    color: "#0A97D9",
    icon: "🐠",
  },
  {
    number: 15,
    title: "Life on Land",
    description: "Protect, restore and promote sustainable use of ecosystems",
    color: "#56C02B",
    icon: "🌳",
  },
  {
    number: 16,
    title: "Peace, Justice and Strong Institutions",
    description: "Promote peaceful and inclusive societies",
    color: "#00689D",
    icon: "⚖️",
  },
  {
    number: 17,
    title: "Partnerships for the Goals",
    description: "Strengthen the means of implementation and partnerships",
    color: "#19486A",
    icon: "🤝",
  },
] as const;

/**
 * Career path categories for North Star alignment
 */
export const CAREER_PATHS = [
  { value: "technology", label: "Technology & Engineering", icon: "💻" },
  { value: "healthcare", label: "Healthcare & Medicine", icon: "🏥" },
  { value: "education", label: "Education & Teaching", icon: "🎓" },
  { value: "business", label: "Business & Entrepreneurship", icon: "📈" },
  { value: "arts", label: "Arts & Creative", icon: "🎨" },
  { value: "science", label: "Science & Research", icon: "🔬" },
  { value: "social", label: "Social Impact & NGO", icon: "🤲" },
  { value: "environment", label: "Environment & Sustainability", icon: "🌱" },
  { value: "law", label: "Law & Policy", icon: "⚖️" },
  { value: "media", label: "Media & Communications", icon: "📱" },
  { value: "finance", label: "Finance & Economics", icon: "💰" },
  { value: "other", label: "Other / Exploring", icon: "🌟" },
] as const;

/**
 * North Star icon shapes
 */
export const NORTH_STAR_SHAPES = [
  { value: "classic", label: "Classic Star", icon: "⭐" },
  { value: "sparkle", label: "Sparkle", icon: "✨" },
  { value: "shooting", label: "Shooting Star", icon: "🌠" },
  { value: "glowing", label: "Glowing Star", icon: "💫" },
  { value: "compass", label: "Compass", icon: "🧭" },
  { value: "target", label: "Target", icon: "🎯" },
  { value: "diamond", label: "Diamond", icon: "💎" },
  { value: "crown", label: "Crown", icon: "👑" },
] as const;

/**
 * North Star color themes
 */
export const NORTH_STAR_COLORS = [
  { value: "golden", label: "Golden", color: "#FFD700", glow: "#FFA500" },
  { value: "amber", label: "Amber", color: "#FFBF00", glow: "#FF8C00" },
  { value: "rose", label: "Rose Gold", color: "#B76E79", glow: "#E0B0B8" },
  { value: "silver", label: "Silver", color: "#C0C0C0", glow: "#E8E8E8" },
  { value: "blue", label: "Celestial Blue", color: "#4A90E2", glow: "#7AB3FF" },
  { value: "purple", label: "Royal Purple", color: "#9B59B6", glow: "#C39BD3" },
  { value: "green", label: "Emerald", color: "#2ECC71", glow: "#58D68D" },
  {
    value: "orange",
    label: "Sunset Orange",
    color: "#E67E22",
    glow: "#F39C12",
  },
] as const;

export type SDGGoal = (typeof SDG_GOALS)[number];
export type CareerPath = (typeof CAREER_PATHS)[number];
export type NorthStarShape = (typeof NORTH_STAR_SHAPES)[number];
export type NorthStarColor = (typeof NORTH_STAR_COLORS)[number];
