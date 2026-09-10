"use client";
import { useEffect, useState } from "react";
import { type FunnelConfig, validateConfig } from "@/lib/funnel";
import FunnelView, { type FunnelStep } from "./FunnelView";

export default function FunnelPreview({
  initialConfig,
  step,
}: {
  initialConfig: FunnelConfig;
  step: FunnelStep;
}) {
  const [config, setConfig] = useState(initialConfig);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "funnel-preview"
      )
        return;
      try {
        setConfig(validateConfig(event.data.config));
      } catch {
        /* Keep last valid preview while editing incomplete fields. */
      }
    };
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: "funnel-preview-ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", receive);
  }, []);
  return <FunnelView config={config} step={step} preview />;
}
