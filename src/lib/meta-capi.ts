import crypto from "node:crypto";

export interface MetaCapiUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}

export interface MetaCapiEventPayload {
  eventName: "PageView" | "ViewContent" | "Lead" | "Schedule" | "Contact" | string;
  eventId?: string | null;
  eventTime?: number;
  eventSourceUrl?: string | null;
  userData: MetaCapiUserData;
  customData?: Record<string, unknown>;
}

function sha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

function normalizeAndHash(val?: string | null): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().toLowerCase();
  if (!trimmed) return undefined;
  return sha256(trimmed);
}

function normalizeAndHashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  // Strip everything except digits and optional leading plus
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  return sha256(digits);
}

/**
 * Send an event to the Meta Conversions API (CAPI) via Graph API.
 * Safely handles missing tokens or network errors without crashing.
 */
export async function sendMetaCapiEvent(
  payload: MetaCapiEventPayload
): Promise<{ success: boolean; error?: string }> {
  const pixelId =
    process.env.META_PIXEL_ID ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID ||
    "2349908955753012";
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!accessToken) {
    console.warn(
      `[Meta CAPI] Event '${payload.eventName}' skipped: META_CONVERSIONS_API_TOKEN is not configured in environment.`
    );
    return { success: false, error: "META_CONVERSIONS_API_TOKEN not set" };
  }

  try {
    const hashedEmail = normalizeAndHash(payload.userData.email);
    const hashedPhone = normalizeAndHashPhone(payload.userData.phone);
    const hashedFirstName = normalizeAndHash(payload.userData.firstName);
    const hashedLastName = normalizeAndHash(payload.userData.lastName);

    const userData: Record<string, unknown> = {};
    if (hashedEmail) userData.em = [hashedEmail];
    if (hashedPhone) userData.ph = [hashedPhone];
    if (hashedFirstName) userData.fn = [hashedFirstName];
    if (hashedLastName) userData.ln = [hashedLastName];
    if (payload.userData.clientIpAddress)
      userData.client_ip_address = payload.userData.clientIpAddress;
    if (payload.userData.clientUserAgent)
      userData.client_user_agent = payload.userData.clientUserAgent;
    if (payload.userData.fbp) userData.fbp = payload.userData.fbp;
    if (payload.userData.fbc) userData.fbc = payload.userData.fbc;

    const eventTime = payload.eventTime || Math.floor(Date.now() / 1000);
    const eventSourceUrl =
      payload.eventSourceUrl ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.berinagents.com";

    const eventObject: Record<string, unknown> = {
      event_name: payload.eventName,
      event_time: eventTime,
      action_source: "website",
      event_source_url: eventSourceUrl,
      user_data: userData,
    };

    if (payload.eventId) {
      eventObject.event_id = payload.eventId;
    }

    if (payload.customData) {
      eventObject.custom_data = payload.customData;
    }

    const requestBody: Record<string, unknown> = {
      data: [eventObject],
    };

    if (testEventCode) {
      requestBody.test_event_code = testEventCode;
    }

    const endpoint = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(
        `[Meta CAPI] Error sending '${payload.eventName}':`,
        result?.error?.message || result
      );
      return {
        success: false,
        error: result?.error?.message || "Unknown Meta CAPI error",
      };
    }

    console.log(
      `[Meta CAPI] Successfully sent '${payload.eventName}' (event_id: ${payload.eventId || "none"})`
    );
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Meta CAPI] Network / processing exception:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
