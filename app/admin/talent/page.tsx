import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TalentVerifyToggle } from "@/components/admin/TalentVerifyToggle";
import { FilterLinks } from "@/components/admin/queue-tools/FilterLinks";
import { ScrollToElement } from "@/components/admin/queue-tools/ScrollToElement";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/shared/AdminStates";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import {
  isUnverifiedTalent,
  parseTalentView,
  talentHref,
  talentRowId,
  visibleTalentSignups,
  type TalentFilter,
} from "@/lib/admin/queue-tools/talent";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  getProjectBriefs,
  getTalentSignups,
  type ProjectBrief,
  type TalentSignup,
} from "@/lib/talent-admin";
import { TRACK_LABEL } from "@/lib/talent-work";
import { safeExternalUrl } from "@/lib/talent-url";
import { cn } from "@/lib/utils";
import { StatRow, StatTile } from "./_components/Stats";
import { Panel } from "./_components/Panel";

export const dynamic = "force-dynamic";

const LINK_CLASS =
  "block break-all text-xs text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground active:decoration-foreground";

const FILTER_LABEL: Record<TalentFilter, string> = {
  all: "All signups",
  unverified: "Not published yet",
};

const formatDate = (iso: string) => formatBangkokDateTime(iso, { year: true });

function BriefsTable({ briefs }: { briefs: ProjectBrief[] }) {
  if (briefs.length === 0) {
    return (
      <AdminEmptyState
        className="m-4"
        title="No project briefs yet"
        description="Briefs from the Interest? form on /talent appear here."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[190px]">Received</TableHead>
          <TableHead className="w-[220px]">Contact</TableHead>
          <TableHead>Brief</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {briefs.map((brief) => (
          <TableRow key={brief.id}>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
              {formatDate(brief.created_at)}
            </TableCell>
            <TableCell className="break-all font-medium">{brief.contact}</TableCell>
            <TableCell className="whitespace-pre-wrap text-sm">{brief.brief}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PortfolioLinks({ links }: { links: string[] }) {
  return (
    <>
      {links.map((url) => {
        const safe = safeExternalUrl(url);

        // Never linkify a scheme we did not vet: show it as inert text so the
        // row still reveals what was submitted.
        if (!safe) {
          return (
            <p
              key={url}
              className="block break-all text-xs text-destructive"
              title="Blocked: not an http(s) URL"
            >
              Blocked link: {url}
            </p>
          );
        }

        return (
          <a key={url} href={safe} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {url}
          </a>
        );
      })}
    </>
  );
}

function SignupsTable({
  signups,
  highlightId,
  filter,
}: {
  signups: TalentSignup[];
  highlightId: string | null;
  filter: TalentFilter;
}) {
  if (signups.length === 0) {
    return (
      <AdminEmptyState
        className="m-4"
        title={filter === "unverified" ? "Every signup is published" : "No student signups yet"}
        description={
          filter === "unverified" ? undefined : "Signups from the /talent form appear here."
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[170px]">Signed up</TableHead>
          <TableHead>Student</TableHead>
          <TableHead className="w-[120px]">Track</TableHead>
          <TableHead className="w-[200px]">Contact</TableHead>
          <TableHead>Tools and links</TableHead>
          <TableHead className="w-[190px]">Public</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {signups.map((s) => {
          const highlighted = s.id === highlightId;
          return (
            <TableRow
              key={s.id}
              id={talentRowId(s.id)}
              tabIndex={highlighted ? -1 : undefined}
              data-verified={s.verified || undefined}
              data-highlighted={highlighted || undefined}
              className={cn(
                "focus-visible:outline-none",
                highlighted && "bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))] hover:bg-primary/15",
              )}
            >
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDate(s.created_at)}
              </TableCell>
              <TableCell>
                <p className="font-medium">
                  {s.nickname} <span className="font-normal text-muted-foreground">· {s.full_name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {[s.age !== null ? `${s.age} yrs` : null, s.school].filter(Boolean).join(" · ")}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{TRACK_LABEL[s.track] ?? s.track}</Badge>
              </TableCell>
              <TableCell className="break-all text-sm">
                {[s.line_id ? `LINE: ${s.line_id}` : null, s.phone].filter(Boolean).join(" · ") || "-"}
              </TableCell>
              <TableCell className="text-sm">
                {s.tools.length > 0 && <p>{s.tools.join(", ")}</p>}
                <PortfolioLinks links={s.portfolio_links} />
              </TableCell>
              <TableCell>
                <TalentVerifyToggle id={s.id} verified={s.verified === true} name={s.nickname} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function AdminTalentPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; id?: string }>;
}) {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const view = parseTalentView(await searchParams);
  const [briefs, signups] = await Promise.all([getProjectBriefs(), getTalentSignups()]);

  const pending = signups.filter(isUnverifiedTalent).length;
  const visible = visibleTalentSignups(signups, view);
  const highlightId = view.id && visible.some((s) => s.id === view.id) ? view.id : null;

  return (
    <div className="space-y-6">
      {highlightId && <ScrollToElement elementId={talentRowId(highlightId)} />}
      <AdminPageHeader
        eyebrow="Talent"
        title="Talent profiles"
        description="Review signups from the /talent form and publish them when they are ready for hirers to see. Hidden signups never appear on the public page."
      />

      <StatRow label="Talent funnel summary">
        <StatTile label="Project briefs (hirers)" value={briefs.length} />
        <StatTile label="Student signups" value={signups.length} />
        <StatTile
          label="Not published yet"
          value={pending}
          emphasis={pending > 0}
          href={talentHref({ filter: "unverified" })}
        />
      </StatRow>

      <Panel
        id="talent-signups"
        eyebrow="Student side"
        title="Signups"
        description="Publish a signup to show it on the public /talent page."
        toolbar={
          <FilterLinks
            label="Signups"
            items={(["all", "unverified"] as const).map((filter) => ({
              key: filter,
              label: FILTER_LABEL[filter],
              href: talentHref({ filter }),
              active: view.filter === filter,
              count: filter === "all" ? signups.length : pending,
            }))}
          />
        }
      >
        <SignupsTable signups={visible} highlightId={highlightId} filter={view.filter} />
      </Panel>

      <Panel
        id="talent-briefs"
        eyebrow="Hirer side"
        title="Project briefs"
        description="Submissions from the Interest? form on /talent, newest first."
      >
        <BriefsTable briefs={briefs} />
      </Panel>
    </div>
  );
}
