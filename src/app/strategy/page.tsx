import type { Metadata } from "next";
import { getFunnelConfig } from "@/lib/funnel-store";
import FunnelView from "@/components/funnel/FunnelView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Turn more calls into opportunities",
  description:
    "Tell us about your business and book a strategic call to explore your AI receptionist.",
};
export default async function StrategyPage() {
  return <FunnelView config={await getFunnelConfig()} />;
}
