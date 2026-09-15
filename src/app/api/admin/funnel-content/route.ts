import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

const BUCKET = "sales-funnel";
const FILE_PATH = "funnel-content.json";

export interface FaqVideoItem {
  id: number;
  question: string;
  src?: string;
}

export interface FunnelContentData {
  salesVideo: string;
  confirmationVideo: string;
  faqVideos: FaqVideoItem[];
}

const DEFAULT_CONTENT: FunnelContentData = {
  salesVideo: "/videos/New_Video_1789071155558.mp4",
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

    const result = {
      salesVideo: json.salesVideo || DEFAULT_CONTENT.salesVideo,
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
    const body = await req.json();
    const supabase = getServiceSupabase();

    const payload: FunnelContentData = {
      salesVideo: typeof body.salesVideo === "string" && body.salesVideo ? body.salesVideo : DEFAULT_CONTENT.salesVideo,
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
