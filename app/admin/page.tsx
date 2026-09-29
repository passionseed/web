import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  GraduationCap,
  Map,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { AdminStatsOverview } from "@/components/admin/AdminStatsOverview";

export const dynamic = "force-dynamic";

const workspaces = [
  {
    href: "/admin/shift/applications",
    title: "SHIFT applications",
    description: "Review applicants and manage enrollment.",
    icon: Sparkles,
  },
  {
    href: "/admin/dm-leads",
    title: "Lead inbox",
    description: "Pick up conversations and follow up with leads.",
    icon: MessagesSquare,
  },
  {
    href: "/admin/experts",
    title: "Expert reviews",
    description: "Review interviews and expert contributions.",
    icon: GraduationCap,
  },
  {
    href: "/admin/maps",
    title: "PathLabs",
    description: "Manage learning maps and student activities.",
    icon: Map,
  },
];

export default function AdminPage() {
  return (
    <div className="admin-overview">
      <header className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">YOUR WORKSPACE</p>
          <h1>Overview</h1>
          <p className="admin-page-description">
            Manage programs, people, and the work in between.
          </p>
        </div>
        <Link href="/admin/analytics" className="admin-quiet-link">
          View analytics <ArrowUpRight size={16} />
        </Link>
      </header>
      <AdminStatsOverview />
      <section
        className="admin-work-section"
        aria-labelledby="admin-work-title"
      >
        <div className="admin-section-heading">
          <h2 id="admin-work-title">Jump into work</h2>
          <span>Everyday tools</span>
        </div>
        <div className="admin-work-list">
          {workspaces.map(({ href, title, description, icon: Icon }, index) => (
            <Link key={href} href={href} className="admin-work-link">
              <span className="admin-work-icon">
                <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <span className="admin-work-number" aria-hidden="true">
                0{index + 1}
              </span>
              <ArrowRight
                size={19}
                className="admin-work-arrow"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
      <footer className="admin-overview-footer">
        <p>Looking for another tool? Find it in the navigation.</p>
        <Link href="/admin/users" className="admin-quiet-link">
          Manage users <ArrowUpRight size={15} />
        </Link>
      </footer>
    </div>
  );
}
