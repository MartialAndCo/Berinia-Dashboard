import type { Metadata } from "next";
import { getFunnelConfig } from "@/lib/funnel-store";
import FunnelView from "@/components/funnel/FunnelView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Book your strategic call",
  robots: { index: false, follow: false },
};
export default async function BookingPage() {
  return <FunnelView config={await getFunnelConfig()} step="booking" />;
}
