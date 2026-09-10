"use server";

import { createClient } from "@/utils/supabase/server";
import {
  getFunnelConfig,
  getFunnelLeads,
  writeFunnelObject,
} from "@/lib/funnel-store";
import { validateConfig } from "@/lib/funnel";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function requireFunnelAdmin() {
  if (process.env.NODE_ENV === "development") {
    return;
  }
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  // User-editable metadata is deliberately not an authorization source.
  if (
    !user ||
    !(
      user.app_metadata?.role === "admin" ||
      ["admin@berinia.com", "yannrosemark@gmail.com"].includes(
        user.email?.toLowerCase() || "",
      )
    )
  )
    redirect("/login?next=/funnel");
}
export async function loadFunnelAdmin() {
  await requireFunnelAdmin();
  try {
    const [config, leads] = await Promise.all([
      getFunnelConfig(true),
      getFunnelLeads().catch(() => []),
    ]);
    return { config, leads };
  } catch {
    const config = await getFunnelConfig(false);
    return { config, leads: [] };
  }
}
export async function saveFunnelAction(input: unknown, publish: boolean) {
  try {
    await requireFunnelAdmin();
    const config = validateConfig(input);
    await writeFunnelObject("draft.json", config, true);
    if (publish) {
      await writeFunnelObject("published.json", config, true);
      revalidatePath("/strategy", "layout");
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save. Please try again.",
    };
  }
}
