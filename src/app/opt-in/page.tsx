import type { Metadata } from "next";
import OptInLandingPage from "@/components/optin-landing/OptInLandingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "24/7 AI Receptionist | Never Miss Another Call or Booking",
  description:
    "Automate your phone answering with hyper-realistic Voice AI. Sub-second latency, instant calendar scheduling, and zero missed calls.",
};

export default function OptIn() {
  return <OptInLandingPage />;
}
