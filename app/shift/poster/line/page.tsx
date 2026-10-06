import type { Metadata } from "next";

import { ShiftPixelLineMenu } from "@/components/shift/poster/pixel/ShiftPixelLineMenu";

/** LINE OA compact rich menu image, 2500x843. Screenshot #shift-line-menu. */

export const metadata: Metadata = {
  title: "SHIFT LINE rich menu",
  robots: { index: false, follow: false },
};

export default function ShiftLineMenuPage() {
  return (
    <div>
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ShiftPixelLineMenu />
    </div>
  );
}
