import type { Metadata } from "next";

import { RequestForWinnersPage } from "@/components/request-for-winners/RequestForWinnersPage";
import { RFW, thaiDateWithYear } from "@/components/request-for-winners/facts";

const TITLE = `${RFW.name} | PassionSeed`;
const DESCRIPTION = `เคยชนะการแข่งขันมาแล้ว เอาผลงานนั้นไปทำให้เป็นธุรกิจจริง บ่มเพาะ ${RFW.weeks} สัปดาห์ จบด้วย Demo Day เปิดรับสมัคร ${thaiDateWithYear(RFW.opensOn)}`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/request-for-winners" },
  openGraph: {
    type: "website",
    siteName: "PassionSeed",
    locale: "th_TH",
    title: TITLE,
    description: DESCRIPTION,
    url: "/request-for-winners",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function Page() {
  return <RequestForWinnersPage />;
}
