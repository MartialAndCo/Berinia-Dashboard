import type { Metadata } from "next";
import QuestionnaireBooking from "@/components/optin-landing/QuestionnaireBooking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Answer a Few Quick Questions | Book Your Call",
  description: "Complete 5 quick questions to qualify and book your AI Receptionist strategy call.",
  robots: { index: false, follow: false },
};

export default function BookingPage() {
  return <QuestionnaireBooking />;
}
