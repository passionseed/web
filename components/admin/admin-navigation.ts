import {
  Activity,
  Archive,
  BarChart3,
  Bot,
  Briefcase,
  ClipboardList,
  Code2,
  Compass,
  FileCheck2,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Map,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  MessagesSquare,
  Radar,
  Repeat,
  ScanSearch,
  NotebookPen,
  Tent,
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
        href: "/admin/dm-leads",
        label: "DM leads",
        description: "Conversations and follow-ups",
        icon: MessagesSquare,
      },
      {
        href: "/admin/line",
        label: "LINE inbox",
        description: "Read and reply to @passionseed LINE chats",
        icon: MessageSquareText,
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
    label: "SHIFT",
    items: [
      {
        href: "/admin/shift/rounds",
        label: "Rounds",
        description: "SHIFT rounds: review, squads, certificates",
        icon: Repeat,
      },
      {
        href: "/admin/shift/applications",
        label: "Applications",
        description: "SHIFT applicants, payment, join links",
        icon: ClipboardList,
      },
      {
        // Exact match only: every other SHIFT page lives under this path.
        href: "/admin/shift",
        label: "Tracker",
        description: "SHIFT kids and weekly notes",
        icon: NotebookPen,
      },
      {
        href: "/admin/shift/camp",
        label: "Interactive camp (legacy)",
        description: "SHIFT cohorts, groups, support queue",
        icon: Tent,
      },
      {
        href: "/admin/shift/seedstack",
        label: "SeedStack",
        description: "SHIFT build progress and stuck students",
        icon: Code2,
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
        href: "/admin/marketing",
        label: "Meta marketing",
        description: "Instagram reach, ad spend, paid seats",
        icon: Megaphone,
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
      // Career-era tools, kept reachable but out of the daily groups.
      {
        href: "/admin/radar",
        label: "Radar",
        description: "Career content",
        icon: Radar,
      },
      {
        href: "/admin/radar-interview",
        label: "Radar interview",
        description: "Interview tools",
        icon: MessageCircle,
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
