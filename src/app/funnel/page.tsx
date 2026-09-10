import { loadFunnelAdmin, requireFunnelAdmin } from "./actions";
import FunnelEditor from "@/components/funnel/FunnelEditor";

export const dynamic = "force-dynamic";
export default async function AdminFunnelPage() {
  await requireFunnelAdmin();
  let data;
  try {
    data = await loadFunnelAdmin();
  } catch {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-serif">Sales funnel</h1>
        <p className="mt-4">
          We couldn’t load your funnel settings. Check your Supabase connection
          and reload this page.
        </p>
      </div>
    );
  }
  return <FunnelEditor initialConfig={data.config} leads={data.leads} />;
}
