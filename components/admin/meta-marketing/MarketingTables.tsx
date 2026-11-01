import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCount, formatMoney, formatPercent } from "@/lib/meta/marketing/format";
import type { AdSummary, PostSummary, SourceSummary } from "@/lib/meta/marketing/report";
import { truncateText } from "@/lib/shift/applicationStats";

const num = "text-right tabular-nums";

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function postTitle(post: PostSummary): string {
  return truncateText(post.caption?.split("\n")[0] || "(no caption)", 60);
}

export function TopPostsTable({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return <Empty>No posts with insights in this range yet.</Empty>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Post</TableHead>
          <TableHead className={num}>Reach</TableHead>
          <TableHead className={num}>Views</TableHead>
          <TableHead className={num}>Likes</TableHead>
          <TableHead className={num}>Comments</TableHead>
          <TableHead className={num}>Saves</TableHead>
          <TableHead className={num}>Shares</TableHead>
          <TableHead className={num}>Follows</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id}>
            <TableCell className="max-w-xs">
              {post.permalink ? (
                <a href={post.permalink} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                  {postTitle(post)}
                </a>
              ) : (
                postTitle(post)
              )}
              <span className="block text-xs text-muted-foreground">
                {post.type === "REELS" ? "Reel" : "Post"}
                {post.postedAt && ` · ${new Date(post.postedAt).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" })}`}
              </span>
            </TableCell>
            <TableCell className={num}>{formatCount(post.reach)}</TableCell>
            <TableCell className={num}>{formatCount(post.views)}</TableCell>
            <TableCell className={num}>{formatCount(post.likes)}</TableCell>
            <TableCell className={num}>{formatCount(post.comments)}</TableCell>
            <TableCell className={num}>{formatCount(post.saves)}</TableCell>
            <TableCell className={num}>{formatCount(post.shares)}</TableCell>
            <TableCell className={num}>{formatCount(post.follows)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AdsTable({
  rows,
  currency,
  showUtm,
}: {
  rows: AdSummary[];
  currency: string | null;
  showUtm?: boolean;
}) {
  if (rows.length === 0) return <Empty>No ad spend in this range.</Empty>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{showUtm ? "Ad" : "Campaign"}</TableHead>
          {showUtm && <TableHead>utm_source / utm_content</TableHead>}
          <TableHead className={num}>Spend</TableHead>
          <TableHead className={num}>Impressions</TableHead>
          <TableHead className={num}>Link clicks</TableHead>
          <TableHead className={num}>Link CTR</TableHead>
          <TableHead className={num}>Leads</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="max-w-xs">
              {row.name}
              {showUtm && row.campaignName && (
                <span className="block text-xs text-muted-foreground">{row.campaignName}</span>
              )}
            </TableCell>
            {showUtm && (
              <TableCell className="break-all text-xs">
                {row.utmSource ?? "–"}
                {row.utmContent && <span className="text-muted-foreground"> / {row.utmContent}</span>}
              </TableCell>
            )}
            <TableCell className={num}>{formatMoney(row.spend, currency)}</TableCell>
            <TableCell className={num}>{formatCount(row.impressions)}</TableCell>
            <TableCell className={num}>{formatCount(row.linkClicks)}</TableCell>
            <TableCell className={num}>{formatPercent(row.ctr)}</TableCell>
            <TableCell className={num}>{formatCount(row.leads)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SourceSeatsTable({ sources, currency }: { sources: SourceSummary[]; currency: string | null }) {
  if (sources.length === 0) return <Empty>No applications or tagged ads in this range.</Empty>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>utm_source</TableHead>
          <TableHead className={num}>Ad spend</TableHead>
          <TableHead className={num}>Applications</TableHead>
          <TableHead className={num}>Paid seats</TableHead>
          <TableHead className={num}>Spend per paid seat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((row) => (
          <TableRow key={row.source}>
            <TableCell className="break-all">
              {row.source}
              {row.adCount > 1 && (
                <span className="block text-xs text-muted-foreground">shared by {row.adCount} ads</span>
              )}
            </TableCell>
            <TableCell className={num}>{formatMoney(row.spend, currency)}</TableCell>
            <TableCell className={num}>{formatCount(row.applications)}</TableCell>
            <TableCell className={num}>{formatCount(row.paidSeats)}</TableCell>
            <TableCell className={num}>{formatMoney(row.costPerPaidSeat, currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
