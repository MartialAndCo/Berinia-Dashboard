import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getFunnelConfig, writeFunnelObject } from "@/lib/funnel-store";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length") || 0) > 20000)
    return NextResponse.json(
      { error: "Your answers are too long." },
      { status: 413 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 20000)
      return NextResponse.json(
        { error: "Your answers are too long." },
        { status: 413 },
      );
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid form submission." },
        { status: 400 },
      );
    }
    if (
      !body ||
      typeof body !== "object" ||
      !body.answers ||
      typeof body.answers !== "object"
    )
      return NextResponse.json(
        { error: "Please complete the questionnaire." },
        { status: 400 },
      );
    if (body.website) return NextResponse.json({ success: true }); // Honeypot; no side effects.
    const cookieStore = await cookies();
    if (cookieStore.has("funnel_cooldown"))
      return NextResponse.json(
        { error: "Please wait a few seconds before submitting again." },
        { status: 429 },
      );
    const config = await getFunnelConfig();
    const answers: Record<string, string> = {};
    for (const q of config.questions) {
      const value = body.answers[q.id];
      if (value !== undefined && typeof value !== "string")
        return NextResponse.json(
          { error: `Please check: ${q.label}` },
          { status: 400 },
        );
      const text = (value || "").trim();
      if (
        (q.required && !text) ||
        text.length > 1000 ||
        (text && q.type === "select" && !q.options.includes(text))
      )
        return NextResponse.json(
          { error: `Please check: ${q.label}` },
          { status: 400 },
        );
      answers[q.id] = text;
    }
    const attribution: Record<string, string> = {};
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gclid",
      "fbclid",
    ]) {
      const value = body.attribution?.[key];
      if (typeof value === "string") attribution[key] = value.slice(0, 300);
    }
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await writeFunnelObject(`leads/${Date.now()}-${id}.json`, {
      id,
      createdAt,
      answers,
      attribution,
      questions: config.questions.map(({ id, label }) => ({ id, label })),
    });
    cookieStore.set("funnel_cooldown", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15,
      path: "/api/funnel",
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error(
      "Funnel submission failed:",
      error instanceof Error ? error.message : "Storage unavailable",
    );
    return NextResponse.json(
      { error: "We could not save your answers. Please try again." },
      { status: 503 },
    );
  }
}
