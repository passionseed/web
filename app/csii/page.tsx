import { Metadata } from "next";
import CSIIClientPage from "./client-page";

export const metadata: Metadata = {
  title: "CSII Curriculum Graph | Course Relationships",
  description: "Interactive visualization of CSII curriculum showing relationships between courses",
};

export default function CSIIPage() {
  return <CSIIClientPage />;
}
