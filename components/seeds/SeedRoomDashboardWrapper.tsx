"use client";

import dynamic from "next/dynamic";

const SeedRoomDashboard = dynamic(
  () => import("./SeedRoomDashboard").then((mod) => ({ default: mod.SeedRoomDashboard })),
  { ssr: false }
);

interface SeedRoomDashboardWrapperProps {
  room: any;
  seed: any;
  currentUser: any;
  isAdmin: boolean;
  isInstructor: boolean;
  initialMembers: any[];
}

export function SeedRoomDashboardWrapper(props: SeedRoomDashboardWrapperProps) {
  return <SeedRoomDashboard {...props} />;
}
