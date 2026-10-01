"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

/** Storage objects stay private; staff review uses short-lived signed URLs. */
export function ShiftCampImage({ path }: { path: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setUrl("");
    setError(false);
    void createClient()
      .storage.from("shift-camp")
      .createSignedUrl(path, 600)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) setError(true);
        else setUrl(data.signedUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [path, attempt]);
  if (error)
    return (
      <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
        Reload screenshot
      </Button>
    );
  if (!url)
    return <p className="text-sm text-muted-foreground">Loading screenshot…</p>;
  return (
    <Image
      unoptimized
      src={url}
      alt="Project screenshot"
      width={720}
      height={480}
      className="max-h-96 w-full rounded-lg object-contain"
      onError={() => setError(true)}
    />
  );
}
