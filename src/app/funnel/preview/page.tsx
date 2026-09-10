import { requireFunnelAdmin } from "../actions";
import { getFunnelConfig } from "@/lib/funnel-store";
import FunnelPreview from "@/components/funnel/FunnelPreview";

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  await requireFunnelAdmin();
  const { step } = await searchParams;
  return (
    <FunnelPreview
      initialConfig={await getFunnelConfig(true)}
      step={step === "booking" || step === "confirmation" ? step : "sales"}
    />
  );
}
