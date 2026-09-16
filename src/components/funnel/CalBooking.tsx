"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useState } from "react";
import { calPath } from "@/lib/funnel";
import { useRouter } from "next/navigation";

export default function CalBooking({
  url,
  notes,
  structuredAnswers,
}: {
  url: string;
  notes?: string;
  structuredAnswers?: {
    businessType?: string;
    revenue?: string;
    currentSystem?: string;
    afterHours?: string;
    callVolume?: string;
  };
}) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [config, setConfig] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let alive = true;
    let cleanup: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      if (alive) setFailed(true);
    }, 20000);
    async function initialize() {
      const cal = await getCalApi({ namespace: "strategy" });
      if (!alive) return;
      // Cal.com documents the timezone option; the embed package's UiConfig
      // type currently omits it. Keep it alongside the supported UI options.
      const calendarUi = {
        hideEventTypeDetails: true,
        showTimezoneWhenEventDetailsHidden: true,
      };
      cal("ui", calendarUi);
      const booked = (e?: any) => {
        const uid = e?.detail?.data?.uid || e?.data?.uid || "";
        if (uid) {
          try {
            sessionStorage.setItem("last_booking_uid", uid);
          } catch {}
        }
        const isOptIn = typeof window !== "undefined" && window.location.pathname.startsWith("/opt-in");
        const basePath = isOptIn ? "/opt-in/confirmation" : "/strategy/confirmation";
        router.push(uid ? `${basePath}?bookingUid=${encodeURIComponent(uid)}` : basePath);
      };
      const ready = () => {
        clearTimeout(timer);
        setFailed(false);
      };
      const failure = () => {
        clearTimeout(timer);
        setFailed(true);
      };
      cal("on", { action: "bookingSuccessfulV2", callback: booked });
      cal("on", { action: "linkReady", callback: ready });
      cal("on", { action: "linkFailed", callback: failure });
      cleanup = () => {
        cal("off", { action: "bookingSuccessfulV2", callback: booked });
        cal("off", { action: "linkReady", callback: ready });
        cal("off", { action: "linkFailed", callback: failure });
      };
      let prefill: Record<string, string> = {};
      try {
        const lead = JSON.parse(sessionStorage.getItem("funnel-lead") || "{}");
        if (typeof lead.id === "string")
          prefill["metadata[funnelLeadId]"] = lead.id;
        if (typeof lead.company === "string") {
          prefill.company = lead.company;
          prefill["metadata[company]"] = lead.company;
        }

        let structured = structuredAnswers;
        if (!structured) {
          try {
            structured = JSON.parse(sessionStorage.getItem("funnel-structured-answers") || "{}");
          } catch {
            structured = {};
          }
        }

        const isOptIn = typeof window !== "undefined" && window.location.pathname.startsWith("/opt-in");
        if (isOptIn) {
          prefill["metadata[leadSource]"] = "Meta Ads";
          prefill["metadata[funnel]"] = "opt-in";
        }

        if (structured?.businessType) prefill["metadata[businessType]"] = structured.businessType;
        if (structured?.revenue) prefill["metadata[revenue]"] = structured.revenue;
        if (structured?.currentSystem) prefill["metadata[currentSystem]"] = structured.currentSystem;
        if (structured?.afterHours) prefill["metadata[afterHours]"] = structured.afterHours;
        if (structured?.callVolume) prefill["metadata[callVolume]"] = structured.callVolume;

        const dataTag = JSON.stringify({
          leadSource: isOptIn ? "Meta Ads" : "Website (Demo)",
          ...(structured || {})
        });

        const fullNotes = notes ? `${notes.trim()}\n[AIRTABLE_DATA:${dataTag}]` : `[AIRTABLE_DATA:${dataTag}]`;
        prefill.notes = fullNotes;
      } catch {
        /* Browser storage is optional. */
      }
      prefill = {
        ...prefill,
        layout: "month_view",
        theme: "light",
        locale: "en",
      };
      setConfig(prefill);
    }
    initialize().catch(() => {
      if (alive) setFailed(true);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      cleanup?.();
    };
  }, [router]);
  const path = calPath(url);
  if (!path)
    return (
      <div className="f-calendar-fallback">
        Online scheduling is temporarily unavailable. Please try again later.
      </div>
    );
  return (
    <>
      {!config && !failed && (
        <p className="f-calendar-fallback" role="status">
          Loading available times…
        </p>
      )}
      {config && (
        <Cal
          namespace="strategy"
          calLink={path}
          config={config}
          style={{ width: "100%", minHeight: 650, overflow: "auto" }}
        />
      )}
      <div className="f-calendar-fallback">
        {failed
          ? "The embedded calendar is taking longer than expected. "
          : "Prefer to open the calendar separately? "}
        <a href={`${url}?locale=en`} target="_blank" rel="noopener noreferrer">
          Open Cal.com ↗
        </a>
      </div>
    </>
  );
}
