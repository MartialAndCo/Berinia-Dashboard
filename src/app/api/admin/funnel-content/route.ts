import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { checkAdminAuth } from "@/utils/supabase/server";

const BUCKET = "sales-funnel";
const FILE_PATH = "funnel-content.json";

export interface FaqVideoItem {
  id: number;
  question: string;
  src?: string;
}

export interface FunnelContentData {
  salesVideo: string;
  salesVideoA?: string;
  salesVideoB?: string;
  abTestingEnabled?: boolean;
  splitRatio?: number;
  variantAName?: string;
  variantBName?: string;
  confirmationVideo: string;
  faqVideos: FaqVideoItem[];
}

const DEFAULT_CONTENT: FunnelContentData = {
  salesVideo: "/videos/New_Video_1789071155558.mp4",
  salesVideoA: "/videos/New_Video_1789071155558.mp4",
  salesVideoB: "/videos/New_Video_1789071155558.mp4",
  abTestingEnabled: false,
  splitRatio: 50,
  variantAName: "Variante A (Hook Promesse ROI)",
  variantBName: "Variante B (Hook Douleur Métier)",
  confirmationVideo: "/videos/New_Video_1789071155558.mp4",
  faqVideos: [
    {
      id: 1,
      question: "What if I'm already running Google ads? Is this call worth my time?",
      src: "/videos/New_Video_1789071155558.mp4",
    },
    {
      id: 2,
      question: "What is the realistic timeframe that I'll start seeing results within?",
      src: "/videos/New_Video_1789071155558.mp4",
    },
    {
      id: 3,
      question: "How does the AI receptionist integrate with our existing phone lines & software?",
      src: "/videos/New_Video_1789071155558.mp4",
    },
    {
      id: 4,
      question: "What happens if I already have a receptionist or front-desk team?",
      src: "/videos/New_Video_1789071155558.mp4",
    },
  ],
};

let cachedFunnelContent: any = null;
let lastFunnelFetch = 0;
const FUNNEL_CACHE_TTL = 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cachedFunnelContent && now - lastFunnelFetch < FUNNEL_CACHE_TTL) {
    return NextResponse.json(cachedFunnelContent);
  }

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).download(FILE_PATH);

    if (error || !data) {
      cachedFunnelContent = DEFAULT_CONTENT;
      lastFunnelFetch = now;
      return NextResponse.json(DEFAULT_CONTENT);
    }

    const text = await data.text();
    const json = JSON.parse(text);

    const salesVideoBase = json.salesVideo || DEFAULT_CONTENT.salesVideo;
    const result: FunnelContentData = {
      salesVideo: salesVideoBase,
      salesVideoA: json.salesVideoA || salesVideoBase,
      salesVideoB: json.salesVideoB || salesVideoBase,
      abTestingEnabled: typeof json.abTestingEnabled === "boolean" ? json.abTestingEnabled : false,
      splitRatio: typeof json.splitRatio === "number" ? json.splitRatio : 50,
      variantAName: json.variantAName || DEFAULT_CONTENT.variantAName,
      variantBName: json.variantBName || DEFAULT_CONTENT.variantBName,
      confirmationVideo: json.confirmationVideo || DEFAULT_CONTENT.confirmationVideo,
      faqVideos: Array.isArray(json.faqVideos) && json.faqVideos.length > 0 ? json.faqVideos : DEFAULT_CONTENT.faqVideos,
    };

    cachedFunnelContent = result;
    lastFunnelFetch = now;
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to load funnel content:", err);
    return NextResponse.json(DEFAULT_CONTENT);
  }
}

export async function POST(req: NextRequest) {
  try {
    try {
      await checkAdminAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await req.json();
    const supabase = getServiceSupabase();

    const salesVideoA = typeof body.salesVideoA === "string" && body.salesVideoA ? body.salesVideoA : (typeof body.salesVideo === "string" && body.salesVideo ? body.salesVideo : DEFAULT_CONTENT.salesVideo);
    const salesVideoB = typeof body.salesVideoB === "string" && body.salesVideoB ? body.salesVideoB : salesVideoA;

    const payload: FunnelContentData = {
      salesVideo: salesVideoA,
      salesVideoA,
      salesVideoB,
      abTestingEnabled: Boolean(body.abTestingEnabled),
      splitRatio: typeof body.splitRatio === "number" ? Math.min(100, Math.max(0, body.splitRatio)) : 50,
      variantAName: typeof body.variantAName === "string" && body.variantAName ? body.variantAName : DEFAULT_CONTENT.variantAName,
      variantBName: typeof body.variantBName === "string" && body.variantBName ? body.variantBName : DEFAULT_CONTENT.variantBName,
      confirmationVideo: typeof body.confirmationVideo === "string" && body.confirmationVideo ? body.confirmationVideo : DEFAULT_CONTENT.confirmationVideo,
      faqVideos: Array.isArray(body.faqVideos) ? body.faqVideos : DEFAULT_CONTENT.faqVideos,
    };

    const { error } = await supabase.storage.from(BUCKET).upload(
      FILE_PATH,
      JSON.stringify(payload, null, 2),
      {
        contentType: "application/json",
        upsert: true,
      }
    );

    if (error) {
      console.error("Error saving to supabase storage:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    cachedFunnelContent = payload;
    lastFunnelFetch = Date.now();

    return NextResponse.json({ success: true, data: payload });
  } catch (err) {
    console.error("Failed to update funnel content:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save funnel content" },
      { status: 500 }
    );
  }
}
