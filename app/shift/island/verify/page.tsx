import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BoardGate } from "@/components/shift/alumni-board/BoardGate";
import { BoardShell } from "@/components/shift/alumni-board/BoardShell";
import { boardAccessFor } from "@/components/shift/alumni-board/boardPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ยืนยันศิษย์เก่า | SHIFT High Island", robots: { index: false, follow: false } };

/** Registration only. All alumni work continues on the Island behind its existing gates. */
export default async function VerifyAlumniPage() {
  const access = await boardAccessFor("/shift/island/verify");
  if (access.kind === "ok") redirect("/shift/island?at=seal");
  return <BoardShell><BoardGate access={access} /></BoardShell>;
}
