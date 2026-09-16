import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

const BUCKET = "sales-funnel";
const FALLBACK_FILE = "vsl-sessions-fallback.json";

// In-memory cache fallback to guarantee immediate responsiveness
let memoryFallbackSessions: Record<string, any> = {};

interface VslSessionRecord {
  id?: string;
  session_id: string;
  visitor_id: string;
  variant: "A" | "B";
  video_src?: string | null;
  duration_seconds: number;
  max_seconds_watched: number;
  max_percent_watched: number;
  has_played: boolean;
  hook_3s: boolean;
  hook_10s: boolean;
  hook_30s: boolean;
  hook_45s: boolean;
  reached_25: boolean;
  reached_50: boolean;
  reached_75: boolean;
  reached_midpoint: boolean;
  completed: boolean;
  cta_clicked: boolean;
  page_path: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to save to Supabase Storage fallback
async function saveToStorageFallback(record: VslSessionRecord) {
  memoryFallbackSessions[record.session_id] = {
    ...(memoryFallbackSessions[record.session_id] || {}),
    ...record,
  };

  try {
    const supabase = getServiceSupabase();
    // Fire-and-forget periodic upload
    const allRecords = Object.values(memoryFallbackSessions);
    await supabase.storage.from(BUCKET).upload(
      FALLBACK_FILE,
      JSON.stringify(allRecords.slice(-500)), // keep latest 500
      { contentType: "application/json", upsert: true }
    );
  } catch {
    // Storage fallback ignore
  }
}

// Helper to load from Supabase Storage fallback
async function loadFromStorageFallback(): Promise<VslSessionRecord[]> {
  if (Object.keys(memoryFallbackSessions).length > 0) {
    return Object.values(memoryFallbackSessions);
  }

  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase.storage.from(BUCKET).download(FALLBACK_FILE);
    if (data) {
      const text = await data.text();
      const records: VslSessionRecord[] = JSON.parse(text);
      if (Array.isArray(records)) {
        records.forEach((r) => {
          memoryFallbackSessions[r.session_id] = r;
        });
        return records;
      }
    }
  } catch {}

  return Object.values(memoryFallbackSessions);
}

const BOT_UA_REGEX =
  /facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|facebookcatalog|googlebot|bingbot|yandex|baiduspider|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|bytespider|headlesschrome|phantomjs|lighthouse|pingdom|curl|wget|python|aiohttp|axios|go-http-client|postman/i;

export async function POST(req: NextRequest) {
  try {
    // 1. Anti-bot filter: specifically ignore Meta Ads preview bots & automated scrapers
    const userAgent = req.headers.get("user-agent") || "";
    if (BOT_UA_REGEX.test(userAgent)) {
      return NextResponse.json({ success: true, filtered: "bot_ignored" });
    }

    let body: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
    }

    if (!body || !body.sessionId || !body.visitorId) {
      return NextResponse.json({ error: "Missing required session IDs" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const record: VslSessionRecord = {
      session_id: String(body.sessionId),
      visitor_id: String(body.visitorId),
      variant: body.variant === "B" ? "B" : "A",
      video_src: body.videoSrc || null,
      duration_seconds: Number(body.duration) || 0,
      max_seconds_watched: Math.max(0, Number(body.maxSecondsWatched) || 0),
      max_percent_watched: Math.min(100, Math.max(0, Number(body.maxPercentWatched) || 0)),
      has_played: Boolean(body.hasPlayed || body.event === "play"),
      hook_3s: Boolean(body.hook3s),
      hook_10s: Boolean(body.hook10s),
      hook_30s: Boolean(body.hook30s),
      hook_45s: Boolean(body.hook45s),
      reached_25: Boolean(body.reached25),
      reached_50: Boolean(body.reached50),
      reached_75: Boolean(body.reached75),
      reached_midpoint: Boolean(body.reachedMidpoint || (Number(body.maxSecondsWatched) >= 270)),
      completed: Boolean(body.completed || body.event === "ended"),
      cta_clicked: Boolean(body.ctaClicked || body.event === "cta_click"),
      page_path: body.pagePath || "/opt-in",
      utm_source: body.utmSource || null,
      utm_medium: body.utmMedium || null,
      utm_campaign: body.utmCampaign || null,
      created_at: now,
      updated_at: now,
    };

    // 1. Try upserting to Supabase table
    let dbSuccess = false;
    try {
      const supabase = getServiceSupabase();
      const { error } = await supabase.from("vsl_sessions").upsert(
        {
          session_id: record.session_id,
          visitor_id: record.visitor_id,
          variant: record.variant,
          video_src: record.video_src,
          duration_seconds: record.duration_seconds,
          max_seconds_watched: record.max_seconds_watched,
          max_percent_watched: record.max_percent_watched,
          has_played: record.has_played,
          hook_3s: record.hook_3s,
          hook_10s: record.hook_10s,
          hook_30s: record.hook_30s,
          hook_45s: record.hook_45s,
          reached_25: record.reached_25,
          reached_50: record.reached_50,
          reached_75: record.reached_75,
          reached_midpoint: record.reached_midpoint,
          completed: record.completed,
          cta_clicked: record.cta_clicked,
          page_path: record.page_path,
          utm_source: record.utm_source,
          utm_medium: record.utm_medium,
          utm_campaign: record.utm_campaign,
          updated_at: now,
        },
        { onConflict: "session_id" }
      );

      if (!error) {
        dbSuccess = true;
      }
    } catch {
      // Table might not exist yet
    }

    // 2. If table upsert failed, save to storage fallback
    if (!dbSuccess) {
      await saveToStorageFallback(record);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// Statistical significance calculation using standard two-proportion Z-test
function calculateZTestConfidence(
  conversionsA: number,
  trialsA: number,
  conversionsB: number,
  trialsB: number
): { confidence: number; pValue: number; winner: "A" | "B" | "tie" } {
  if (trialsA <= 0 || trialsB <= 0) {
    return { confidence: 50, pValue: 1, winner: "tie" };
  }

  const pA = conversionsA / trialsA;
  const pB = conversionsB / trialsB;

  if (pA === pB) {
    return { confidence: 50, pValue: 1, winner: "tie" };
  }

  const pPool = (conversionsA + conversionsB) / (trialsA + trialsB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / trialsA + 1 / trialsB));

  if (se === 0) {
    return { confidence: 50, pValue: 1, winner: "tie" };
  }

  const z = (pB - pA) / se;
  // Approximation of normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const pValue = 2 * prob;
  const confidence = Math.min(99.9, Math.max(50, (1 - pValue / 2) * 100));

  return {
    confidence: Number(confidence.toFixed(1)),
    pValue: Number(pValue.toFixed(4)),
    winner: pB > pA ? "B" : "A",
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    let records: VslSessionRecord[] = [];

    // 1. Try to read from table
    try {
      const { data, error } = await supabase
        .from("vsl_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (!error && Array.isArray(data) && data.length > 0) {
        records = data as VslSessionRecord[];
      }
    } catch {
      // Table doesn't exist
    }

    // 2. If table empty, fallback to storage
    if (records.length === 0) {
      records = await loadFromStorageFallback();
    }

    // Group by variant
    const sessionsA = records.filter((r) => r.variant === "A");
    const sessionsB = records.filter((r) => r.variant === "B");

    const computeMetrics = (list: VslSessionRecord[]) => {
      const totalSessions = list.length;
      const plays = list.filter((r) => r.has_played || r.max_seconds_watched > 0);
      const totalPlays = plays.length;

      const hook3s = plays.filter((r) => r.hook_3s || r.max_seconds_watched >= 3).length;
      const hook10s = plays.filter((r) => r.hook_10s || r.max_seconds_watched >= 10).length;
      const hook30s = plays.filter((r) => r.hook_30s || r.max_seconds_watched >= 30).length;
      const hook45s = plays.filter((r) => r.hook_45s || r.max_seconds_watched >= 45).length;
      const reachedMidpoint = plays.filter(
        (r) => r.reached_midpoint || r.max_seconds_watched >= 270
      ).length;
      const completed = plays.filter((r) => r.completed || r.max_percent_watched >= 95).length;
      const ctaClicks = list.filter((r) => r.cta_clicked).length;

      const totalWatchSeconds = plays.reduce((acc, r) => acc + (Number(r.max_seconds_watched) || 0), 0);
      const avgWatchSeconds = totalPlays > 0 ? Math.round(totalWatchSeconds / totalPlays) : 0;

      const totalWatchPercent = plays.reduce((acc, r) => acc + (Number(r.max_percent_watched) || 0), 0);
      const avgWatchPercent = totalPlays > 0 ? Math.round(totalWatchPercent / totalPlays) : 0;

      return {
        totalSessions,
        totalPlays,
        playRate: totalSessions > 0 ? Number(((totalPlays / totalSessions) * 100).toFixed(1)) : 0,
        hook3s,
        hook3sRate: totalPlays > 0 ? Number(((hook3s / totalPlays) * 100).toFixed(1)) : 0,
        hook10s,
        hook10sRate: totalPlays > 0 ? Number(((hook10s / totalPlays) * 100).toFixed(1)) : 0,
        hook30s,
        hook30sRate: totalPlays > 0 ? Number(((hook30s / totalPlays) * 100).toFixed(1)) : 0,
        hook45s,
        hook45sRate: totalPlays > 0 ? Number(((hook45s / totalPlays) * 100).toFixed(1)) : 0,
        reachedMidpoint,
        midpointRate: totalPlays > 0 ? Number(((reachedMidpoint / totalPlays) * 100).toFixed(1)) : 0,
        completed,
        completionRate: totalPlays > 0 ? Number(((completed / totalPlays) * 100).toFixed(1)) : 0,
        ctaClicks,
        ctaClickRate: totalSessions > 0 ? Number(((ctaClicks / totalSessions) * 100).toFixed(1)) : 0,
        avgWatchSeconds,
        avgWatchPercent,
      };
    };

    const metricsA = computeMetrics(sessionsA);
    const metricsB = computeMetrics(sessionsB);

    // Compute Drop-off curve points (Timeline milestones from 0s to 14min)
    const timeCheckpoints = [
      { second: 0, label: "0:00 (Start)" },
      { second: 3, label: "0:03 (Hook Init)" },
      { second: 10, label: "0:10 (Hook Value)" },
      { second: 30, label: "0:30 (Hook Pattern)" },
      { second: 45, label: "0:45 (Hook End)" },
      { second: 90, label: "1:30 (Mechanism)" },
      { second: 180, label: "3:00 (Story)" },
      { second: 270, label: "4:30 (Midpoint CTA)" },
      { second: 360, label: "6:00 (Solution)" },
      { second: 540, label: "9:00 (Main Pitch)" },
      { second: 720, label: "12:00 (Objections)" },
      { second: 840, label: "14:00 (Final CTA)" },
    ];

    const playsA = sessionsA.filter((r) => r.has_played || r.max_seconds_watched > 0);
    const playsB = sessionsB.filter((r) => r.has_played || r.max_seconds_watched > 0);

    const dropoffCurve = timeCheckpoints.map((cp) => {
      const retainedA =
        cp.second === 0
          ? playsA.length
          : playsA.filter((r) => r.max_seconds_watched >= cp.second).length;
      const retainedB =
        cp.second === 0
          ? playsB.length
          : playsB.filter((r) => r.max_seconds_watched >= cp.second).length;

      return {
        second: cp.second,
        label: cp.label,
        rateA: playsA.length > 0 ? Number(((retainedA / playsA.length) * 100).toFixed(1)) : 0,
        rateB: playsB.length > 0 ? Number(((retainedB / playsB.length) * 100).toFixed(1)) : 0,
        countA: retainedA,
        countB: retainedB,
      };
    });

    // Statistical significance on CTA conversions
    const stats = calculateZTestConfidence(
      metricsA.ctaClicks,
      metricsA.totalSessions,
      metricsB.ctaClicks,
      metricsB.totalSessions
    );

    return NextResponse.json({
      totalSessions: records.length,
      metricsA,
      metricsB,
      dropoffCurve,
      stats,
      recentSessions: records.slice(0, 30).map((r) => ({
        id: r.session_id,
        visitorId: r.visitor_id.substring(0, 10) + "…",
        variant: r.variant,
        watchTime: `${Math.floor(r.max_seconds_watched / 60)}m ${Math.round(r.max_seconds_watched % 60)}s`,
        maxPercent: `${Math.round(r.max_percent_watched)}%`,
        hook30s: r.hook_30s || r.max_seconds_watched >= 30,
        ctaClicked: r.cta_clicked,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load analytics" }, { status: 500 });
  }
}
