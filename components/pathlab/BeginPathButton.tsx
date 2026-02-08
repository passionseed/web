"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";

interface BeginPathButtonProps {
  seedId: string;
}

export function BeginPathButton({ seedId }: BeginPathButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [whyJoined, setWhyJoined] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBegin = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pathlab/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedId,
          whyJoined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to begin path");
      }

      const enrollmentId = payload?.enrollment?.id;
      if (!enrollmentId) {
        throw new Error("Enrollment was created without id");
      }

      setOpen(false);
      router.push(`/seeds/pathlab/${enrollmentId}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to begin path");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-white text-black hover:bg-neutral-200 text-lg py-6 font-bold"
      >
        Begin Path
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-neutral-800 bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle>Before you begin</DialogTitle>
            <DialogDescription className="text-neutral-400">
              What made you curious about this?
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={whyJoined}
            onChange={(event) => setWhyJoined(event.target.value)}
            className="min-h-24 border-neutral-700 bg-neutral-950 text-white"
            placeholder="Write a sentence or two..."
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleBegin} disabled={loading} className="bg-white text-black hover:bg-neutral-200">
              {loading ? "Starting..." : "Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
