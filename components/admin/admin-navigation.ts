import {
  Activity,
  Archive,
  BarChart3,
  Bot,
  Briefcase,
  Compass,
  FileCheck2,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Map,
  MessageCircle,
  MessagesSquare,
  Radar,
  ScanSearch,
  Sparkles,
  Trophy,
  Users,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AdminNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Highlight for every page under this path, when href is a sub-page. */
  section?: string;
}

export const ADMIN_NAV_GROUPS: { label: string; items: AdminNavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/admin",
        label: "Overview",
        description: "Platform overview",
        icon: LayoutDashboard,
      },
      {
        // One entry: the SHIFT pages switch between each other with their own tabs.
        href: "/admin/shift/applications",
        section: "/admin/shift",
        label: "SHIFT",
        description: "Applications, join links, tracker, camp",
        icon: Sparkles,
      },
      {
        href: "/admin/dm-leads",
        label: "DM leads",
        description: "Conversations and follow-ups",
        icon: MessagesSquare,
      },
      {
        href: "/admin/ig-comments",
        label: "IG comments",
        description: "Instagram comment replies",
        icon: MessageCircle,
      },
    ],
  },
  {
    label: "Learning & content",
    items: [
      {
        href: "/admin/maps",
        label: "PathLabs",
        description: "Learning maps and nodes",
        icon: Map,
      },
      {
        href: "/admin/hackathon",
        label: "Hackathon",
        description: "Teams, mentors and submissions",
        icon: Trophy,
      },
      {
        href: "/admin/radar",
        label: "Radar",
        description: "Career content",
        icon: Radar,
      },
      {
        href: "/admin/direction-finder",
        label: "Direction finder",
        description: "Student directions",
        icon: Compass,
      },
      {
        href: "/admin/competitions",
        label: "Competitions",
        description: "Student opportunities",
        icon: Trophy,
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        description: "Accounts and roles",
        icon: Users,
      },
      {
        href: "/admin/experts",
        label: "Experts",
        description: "Review expert interviews",
        icon: GraduationCap,
      },
      {
        href: "/admin/talent",
        label: "Talent",
        description: "Project briefs and student signups",
        icon: Briefcase,
      },
      {
        href: "/admin/beta",
        label: "Beta registrations",
        description: "Early access signups",
        icon: FlaskConical,
      },
      {
        href: "/admin/trials",
        label: "Trials",
        description: "Trial reviews",
        icon: FileCheck2,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/admin/analytics",
        label: "Product analytics",
        description: "Retention and activation",
        icon: BarChart3,
      },
      {
        href: "/admin/dm-leads/insights",
        label: "Lead insights",
        description: "Audience and lead analysis",
        icon: ScanSearch,
      },
      {
        href: "/admin/event-tracker",
        label: "Event tracker",
        description: "Platform activity",
        icon: Activity,
      },
    ],
  },
  {
    label: "Tools & archive",
    items: [
      {
        href: "/admin/dm-leads/copilot",
        label: "DM copilot",
        description: "Messaging assistant",
        icon: Bot,
      },
      {
        href: "/admin/radar-interview",
        label: "Radar interview",
        description: "Interview tools",
        icon: MessageCircle,
      },
      {
        href: "/admin/meta-webhooks",
        label: "Meta webhooks",
        description: "Integration diagnostics",
        icon: Webhook,
      },
      {
        href: "/admin/archive",
        label: "Archive",
        description: "Universities and resources",
        icon: Archive,
      },
    ],
  },
];

export function getActiveAdminItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV_GROUPS.flatMap((group) => group.items)
    .filter((item) => {
      const base = item.section ?? item.href;
      return pathname === item.href || pathname === base || (base !== "/admin" && pathname.startsWith(`${base}/`));
    })
    .sort((a, b) => (b.section ?? b.href).length - (a.section ?? a.href).length)[0];
}
