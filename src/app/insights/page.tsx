import type { Metadata } from "next";
import InsightsView from "@/components/InsightsView";

export const metadata: Metadata = {
  title: "Insights | กินไรดี?",
  robots: { index: false, follow: false },
};

export default function InsightsPage() {
  return <InsightsView />;
}
