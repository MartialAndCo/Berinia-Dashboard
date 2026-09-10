import "server-only";
import { getServiceSupabase } from "@/lib/supabase";
import {
  defaultFunnel,
  validateConfig,
  type FunnelConfig,
  type FunnelLead,
} from "@/lib/funnel";

// Private objects: no public bucket or anonymous Storage policies are created.
// Separate lead objects avoid lost submissions from concurrent read/modify/write operations.
const BUCKET = "sales-funnel";
export async function ensureFunnelStore() {
  const storage = getServiceSupabase().storage;
  const { data, error } = await storage.getBucket(BUCKET);
  if (data) {
    if (data.public)
      throw new Error("The sales-funnel bucket must be private.");
    return;
  }
  if (error && !["404", "400"].includes(String(error.statusCode))) throw error;
  const created = await storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 100000,
    allowedMimeTypes: ["application/json"],
  });
  if (created.error) {
    const retry = await storage.getBucket(BUCKET);
    if (!retry.data || retry.data.public) throw created.error;
  }
}
async function readObject<T>(path: string): Promise<T | null> {
  const { data, error } = await getServiceSupabase()
    .storage.from(BUCKET)
    .download(path);
  if (error) {
    if (["404", "400"].includes(String(error.statusCode))) return null;
    throw error;
  }
  return JSON.parse(await data.text()) as T;
}
export async function getFunnelConfig(draft = false): Promise<FunnelConfig> {
  const stored = await readObject<FunnelConfig>(
    draft ? "draft.json" : "published.json",
  );
  if (stored)
    return validateConfig({
      ...stored,
      copy: {
        ...stored.copy,
        videoTextTitle:
          stored.copy?.videoTextTitle ?? defaultFunnel.copy.videoTextTitle,
        videoTextBody:
          stored.copy?.videoTextBody ?? defaultFunnel.copy.videoTextBody,
        salesVideoTitle:
          stored.copy?.salesVideoTitle ?? defaultFunnel.copy.salesVideoTitle,
        salesVideoIntro:
          stored.copy?.salesVideoIntro ?? defaultFunnel.copy.salesVideoIntro,
        confirmationVideoTitle:
          stored.copy?.confirmationVideoTitle ??
          defaultFunnel.copy.confirmationVideoTitle,
        confirmationVideoIntro:
          stored.copy?.confirmationVideoIntro ??
          defaultFunnel.copy.confirmationVideoIntro,
      },
    });
  if (draft) return getFunnelConfig();
  return {
    ...defaultFunnel,
    calendarUrl: process.env.CALENDAR_URL || defaultFunnel.calendarUrl,
  };
}
export async function writeFunnelObject(
  path: string,
  data: unknown,
  upsert = false,
) {
  await ensureFunnelStore();
  const { error } = await getServiceSupabase()
    .storage.from(BUCKET)
    .upload(path, JSON.stringify(data), {
      contentType: "application/json",
      upsert,
      cacheControl: "0",
    });
  if (error) throw error;
}
export async function getFunnelLeads(): Promise<FunnelLead[]> {
  const { data, error } = await getServiceSupabase()
    .storage.from(BUCKET)
    .list("leads", { limit: 100, sortBy: { column: "name", order: "desc" } });
  if (error) throw error;
  const leads = await Promise.all(
    (data || [])
      .filter((f) => f.name.endsWith(".json"))
      .map((f) => readObject<FunnelLead>(`leads/${f.name}`)),
  );
  return leads.filter((l): l is FunnelLead => l !== null);
}
