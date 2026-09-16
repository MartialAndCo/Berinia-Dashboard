export type VslVariant = "A" | "B";

export type VslEvent =
  | "session_start"
  | "play"
  | "pause"
  | "milestone"
  | "heartbeat"
  | "cta_click"
  | "ended";

export interface VslTelemetryPayload {
  sessionId: string;
  visitorId: string;
  variant: VslVariant;
  event: VslEvent;
  currentTime: number;
  duration: number;
  maxSecondsWatched: number;
  maxPercentWatched: number;
  hasPlayed?: boolean;
  hook3s?: boolean;
  hook10s?: boolean;
  hook30s?: boolean;
  hook45s?: boolean;
  reached25?: boolean;
  reached50?: boolean;
  reached75?: boolean;
  reachedMidpoint?: boolean;
  completed?: boolean;
  ctaClicked?: boolean;
  pagePath?: string;
  videoSrc?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const VISITOR_COOKIE = "berin_vsl_visitor_id";
const VARIANT_COOKIE = "berin_vsl_variant";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "server-visitor";

  let id = getCookie(VISITOR_COOKIE);
  if (!id) {
    try {
      id = localStorage.getItem(VISITOR_COOKIE);
    } catch {}
  }

  if (!id) {
    id = "vis_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    setCookie(VISITOR_COOKIE, id, 60);
    try {
      localStorage.setItem(VISITOR_COOKIE, id);
    } catch {}
  }

  return id;
}

export function generateSessionId(): string {
  return "vsl_sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
}

export function resolveVslVariant(options?: {
  abTestingEnabled?: boolean;
  splitRatio?: number;
}): VslVariant {
  if (typeof window === "undefined") return "A";

  // Check existing variant in cookie or localStorage for strict stickiness
  let existing = getCookie(VARIANT_COOKIE) as VslVariant | null;
  if (!existing || (existing !== "A" && existing !== "B")) {
    try {
      existing = localStorage.getItem(VARIANT_COOKIE) as VslVariant | null;
    } catch {}
  }

  if (existing === "A" || existing === "B") {
    // If A/B testing is currently disabled, enforce variant A
    if (options && options.abTestingEnabled === false) {
      return "A";
    }
    return existing;
  }

  // If A/B testing is disabled, default to A
  if (options && options.abTestingEnabled === false) {
    setCookie(VARIANT_COOKIE, "A", 30);
    try {
      localStorage.setItem(VARIANT_COOKIE, "A");
    } catch {}
    return "A";
  }

  // Calculate variant based on split ratio (e.g. 50% split)
  const ratio = typeof options?.splitRatio === "number" ? options.splitRatio : 50;
  const roll = Math.random() * 100;
  const chosen: VslVariant = roll < ratio ? "A" : "B";

  setCookie(VARIANT_COOKIE, chosen, 30);
  try {
    localStorage.setItem(VARIANT_COOKIE, chosen);
  } catch {}

  return chosen;
}

export function getUtmParams(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
    };
  } catch {
    return {};
  }
}

export function isBot(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Headless / automated browser check (Puppeteer, Playwright, Selenium)
  if (navigator.webdriver) return true;

  // 2. User-Agent crawler patterns (specifically Meta Ads crawlers and scrapers)
  const ua = (navigator.userAgent || "").toLowerCase();
  const botPatterns = [
    "facebookexternalhit",
    "facebot",
    "meta-externalagent",
    "meta-externalfetcher",
    "facebookcatalog",
    "headlesschrome",
    "phantomjs",
    "lighthouse",
    "pingdom",
    "googlebot",
    "bingbot",
    "yandexbot",
    "bytespider",
    "twitterbot",
    "linkedinbot",
    "whatsapp",
    "telegrambot",
    "discordbot",
  ];

  if (botPatterns.some((pattern) => ua.includes(pattern))) {
    return true;
  }

  // 3. Screen / Window anomalies typical of bots
  if (window.screen && (window.screen.width === 0 || window.screen.height === 0)) {
    return true;
  }

  return false;
}

export function sendVslTelemetry(payload: VslTelemetryPayload, useBeacon = false) {
  if (typeof window === "undefined") return;

  // Anti-bot check: never track automated scrapers or Meta crawlers
  if (isBot()) {
    return;
  }

  const endpoint = "/api/vsl/telemetry";
  const body = JSON.stringify(payload);

  if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) return;
    } catch (err) {
      // Fallback to fetch
    }
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Telemetry failures fail silently to never degrade user experience
  });
}
