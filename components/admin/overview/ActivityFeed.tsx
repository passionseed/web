import Link from "next/link";
import type { ReactNode } from "react";
import {
  Banknote,
  ClipboardList,
  Flag,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  Ticket,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type { AdminActivityItem, AdminActivityKind } from "@/lib/admin/console";

import {
  activityTimeLabel,
  formatBangkokDateTime,
  groupActivityByDay,
  type ActivityDayKey,
} from "./format";

const KIND_META: Record<AdminActivityKind, { label: string; icon: LucideIcon }> = {
  application: { label: "Application", icon: ClipboardList },
  payment: { label: "Payment", icon: Banknote },
  lead: { label: "Lead", icon: MessageCircle },
  signup: { label: "Sign-up", icon: UserPlus },
  expert: { label: "Expert", icon: GraduationCap },
  trial: { label: "Trial", icon: Ticket },
  program: { label: "Program", icon: Flag },
  admin: { label: "Admin", icon: ShieldCheck },
};

/**
 * Recent events, grouped by Bangkok day. Server-rendered with the request's
 * `now`, so relative times never mismatch on hydration.
 */
export function ActivityFeed({
  items,
  now,
}: {
  items: readonly AdminActivityItem[];
  now: Date;
}) {
  if (items.length === 0) {
    return (
      <p className="overview-quiet">
        No activity yet. New applications, payments, and leads show up here.
      </p>
    );
  }
  return (
    <div className="overview-activity">
      {groupActivityByDay(items, now).map((group) => (
        <div key={group.key} className="overview-activity-group">
          <h3 className="overview-activity-day">{group.label}</h3>
          <ul>
            {group.items.map((item) => (
              <li key={item.id}>
                <ActivityRow item={item} group={group.key} now={now} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ActivityRow({
  item,
  group,
  now,
}: {
  item: AdminActivityItem;
  group: ActivityDayKey;
  now: Date;
}) {
  const meta = KIND_META[item.kind] ?? KIND_META.admin;
  const Icon = meta.icon;
  const content = (
    <>
      <span className="overview-activity-icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="overview-activity-text">
        <span className="overview-activity-title">
          <span className="sr-only">{meta.label}: </span>
          {item.title}
        </span>
        {item.detail && <span className="overview-activity-detail">{item.detail}</span>}
      </span>
      <time
        className="overview-activity-time"
        dateTime={item.at}
        title={formatBangkokDateTime(item.at)}
      >
        {activityTimeLabel(item.at, group, now)}
      </time>
    </>
  );
  return <ActivityFrame href={item.href}>{content}</ActivityFrame>;
}

function ActivityFrame({ href, children }: { href?: string; children: ReactNode }) {
  if (href) {
    return (
      <Link href={href} prefetch={false} className="overview-activity-row">
        {children}
      </Link>
    );
  }
  return <div className="overview-activity-row">{children}</div>;
}
