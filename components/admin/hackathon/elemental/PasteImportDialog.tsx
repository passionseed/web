"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { KIND_LABEL, type PipelineCreateInput, type PipelineItem, type PipelineKind } from "@/lib/hackathon/elemental/pipeline";
import { parsePipelinePaste, splitDuplicates } from "@/lib/hackathon/elemental/pipeline-paste";
import type { Owner } from "@/lib/hackathon/elemental/targets";

import { OwnerSelect } from "./OwnerSelect";

const kindName = (k: PipelineKind) => KIND_LABEL[k].replace(/s$/, "").toLowerCase();

/** Paste rows from a spreadsheet or CSV, check the preview, then import them all at once. */
export function PasteImportDialog({
  open,
  onOpenChange,
  defaultKind,
  defaultOwner,
  existing,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKind: PipelineKind;
  defaultOwner: Owner | null;
  /** What is on the board now, to show which rows are already there. The server checks again. */
  existing: readonly Pick<PipelineItem, "name" | "kind">[];
  /** The new rows, and how many rows were left out because they are on the board already. */
  onImport: (rows: PipelineCreateInput[], alreadyThere: number) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // Undefined until someone picks, so it follows the owner chip chosen on the page.
  const [pickedOwner, setOwner] = useState<Owner | null | undefined>(undefined);
  const owner = pickedOwner === undefined ? defaultOwner : pickedOwner;
  const parsed = useMemo(() => parsePipelinePaste(text, defaultKind), [text, defaultKind]);
  const { fresh, duplicates } = useMemo(
    () => splitDuplicates(parsed.rows.map((r) => ({ ...r, name: r.input.name, kind: r.input.kind })), existing),
    [parsed.rows, existing],
  );
  const dupLines = useMemo(() => new Set(duplicates.map((d) => d.line)), [duplicates]);

  const run = async () => {
    if (fresh.length === 0) return;
    setBusy(true);
    const ok = await onImport(
      fresh.map((r) => ({ ...r.input, owner: owner ?? r.input.owner })),
      duplicates.length,
    );
    setBusy(false);
    if (ok) {
      setText("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paste a list</DialogTitle>
          <DialogDescription>
            One row per line, copied from a spreadsheet or written with commas. Columns: kind, name, organisation,
            why they fit, reach. Headers can be in English or Thai (ประเภท, ชื่อ, องค์กร, เหตุผล, ช่องทาง). The header
            row and the kind are optional; rows without a kind become {kindName(defaultKind)}s. Phone numbers are
            removed: reach is a public page or channel.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"kind\tname\torganisation\twhy_fit\treach"}
          aria-label="Rows to import"
          className="font-mono text-base md:text-xs"
        />

        <div className="grid gap-1.5 sm:grid-cols-[auto_12rem] sm:items-center sm:gap-3">
          <Label htmlFor="paste-owner" className="text-sm font-normal text-muted-foreground">
            Assign all to
          </Label>
          <OwnerSelect id="paste-owner" value={owner} onChange={setOwner} noneLabel="Nobody yet" />
        </div>

        {text.trim() !== "" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums text-foreground">{fresh.length}</span> ready to import
              {duplicates.length > 0 && (
                <>
                  , <span className="tabular-nums text-foreground">{duplicates.length}</span> already there
                </>
              )}
              {parsed.errors.length > 0 && (
                <>
                  , <span className="tabular-nums text-destructive">{parsed.errors.length}</span> will be skipped
                </>
              )}
              {parsed.hadHeader && ", header row found"}.
            </p>
            {parsed.warnings.length > 0 && (
              <ul role="status" className="space-y-0.5 border-l-2 border-destructive/60 pl-2 text-xs text-foreground">
                {parsed.warnings.slice(0, 6).map((w) => (
                  <li key={w.line}>
                    Line {w.line}: {w.message}
                  </li>
                ))}
                {parsed.warnings.length > 6 && <li>and {parsed.warnings.length - 6} more lines</li>}
              </ul>
            )}
            {parsed.rows.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-md border">
                <table className="w-full min-w-[36rem] text-left text-xs">
                  <thead className="sticky top-0 bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-normal">Kind</th>
                      <th className="px-2 py-1.5 font-normal">Name</th>
                      <th className="px-2 py-1.5 font-normal">Organisation</th>
                      <th className="px-2 py-1.5 font-normal">Why they fit</th>
                      <th className="px-2 py-1.5 font-normal">Reach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsed.rows.map(({ line, input }) => (
                      <tr key={line} className={dupLines.has(line) ? "align-top text-muted-foreground line-through" : "align-top"}>
                        <td className="px-2 py-1.5">{kindName(input.kind)}</td>
                        <td className="px-2 py-1.5 font-medium">
                          {input.name}
                          {dupLines.has(line) && <span className="sr-only"> (already there, skipped)</span>}
                        </td>
                        <td className="px-2 py-1.5">{input.organisation}</td>
                        <td className="max-w-[14rem] px-2 py-1.5">{input.why_fit}</td>
                        <td className="max-w-[10rem] break-all px-2 py-1.5">{input.reach}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {parsed.errors.length > 0 && (
              <ul className="space-y-0.5 text-xs text-destructive">
                {parsed.errors.slice(0, 8).map((e) => (
                  <li key={e.line}>
                    Line {e.line}: {e.message}
                  </li>
                ))}
                {parsed.errors.length > 8 && <li>and {parsed.errors.length - 8} more</li>}
              </ul>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={run} disabled={busy || fresh.length === 0}>
            {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Import {fresh.length > 0 ? fresh.length : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
