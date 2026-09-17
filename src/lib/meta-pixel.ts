export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "2164746474391551";

declare global {
  interface Window {
    fbq?: {
      (action: "init", pixelId: string, options?: Record<string, unknown>): void;
      (
        action: "track",
        eventName: string,
        params?: Record<string, unknown>,
        options?: { eventID?: string }
      ): void;
      (
        action: "trackCustom",
        eventName: string,
        params?: Record<string, unknown>,
        options?: { eventID?: string }
      ): void;
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
    _fbq?: unknown;
  }
}

/**
 * Track a standard PageView event.
 */
export function trackPixelPageView() {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "PageView");
}

/**
 * Track a standard or custom Meta Pixel event.
 * @param eventName Standard event name (e.g. 'ViewContent', 'Lead', 'Schedule')
 * @param params Optional event parameters (e.g. { content_name, value, currency })
 * @param eventId Optional unique event ID for server-side deduplication (CAPI)
 */
export function trackPixelEvent(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
) {
  if (typeof window === "undefined" || !window.fbq) return;

  if (eventId) {
    window.fbq("track", eventName, params || {}, { eventID: eventId });
  } else if (params) {
    window.fbq("track", eventName, params);
  } else {
    window.fbq("track", eventName);
  }
}

/**
 * Retrieve the Meta browser ID (_fbp) cookie if present.
 */
export function getFbpCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^|;\s*)_fbp=([^;]*)/);
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Retrieve the Meta click ID (_fbc) cookie if present,
 * or format one from the current URL's fbclid parameter.
 */
export function getFbcCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^|;\s*)_fbc=([^;]*)/);
  if (match) return decodeURIComponent(match[2]);

  if (typeof window !== "undefined") {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get("fbclid");
      if (fbclid) {
        // Meta _fbc standard format: fb.1.{creationTime}.{fbclid}
        return `fb.1.${Date.now()}.${fbclid}`;
      }
    } catch {
      // ignore
    }
  }

  return null;
}
