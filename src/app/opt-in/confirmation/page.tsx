import type { Metadata } from "next";
import OptInConfirmationPage from "@/components/optin-landing/OptInConfirmationPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Almost Done: Confirm Your Strategy Call | BerinAgents",
  description:
    "Watch the video to confirm your call and lock in your scheduled slot on Google Calendar.",
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
  return <OptInConfirmationPage />;
}
