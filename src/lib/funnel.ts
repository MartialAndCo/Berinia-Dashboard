export type TextBlock = {
  text: string;
  size: "small" | "medium" | "large";
  bold: boolean;
};
const block = (
  text: string,
  size: TextBlock["size"] = "medium",
): TextBlock => ({ text, size, bold: false });

export const defaultCopy = {
  eyebrow: block("FOR AMBITIOUS HOME SERVICE BUSINESSES"),
  headline: block(
    "Your next customer is calling.\n**Make sure you answer.**",
    "large",
  ),
  intro: block(
    "Answer more calls. Capture more opportunities. Even when you’re on the job.",
  ),
  formTitle: block("First, tell us about your business."),
  formIntro: block(
    "A little context helps us make your strategy call useful. This takes about a minute.",
  ),
  formButton: block("Save my answers"),
  formSuccess: block(
    "Thank you. Your answers are saved. Take the next step and choose a time below.",
  ),
  proofTitle: block("Built around the way you work."),
  benefit1Title: block("Be there for the first call."),
  benefit1Body: block(
    "Give callers a helpful response while your team stays focused on the work in front of them.",
  ),
  benefit2Title: block("Make the next step simple."),
  benefit2Body: block(
    "Capture the details that matter and help customers take the next step toward a booking.",
  ),
  benefit3Title: block("Keep your team in the loop."),
  benefit3Body: block(
    "Bring the conversation back to your business with clear context for follow-up.",
  ),
  testimonialsTitle: block("Hear it from business owners."),
  salesVideoTitle: block("See your AI receptionist in action."),
  salesVideoIntro: block("Hear how it answers a real customer call."),
  confirmationVideoTitle: block("Watch this before your call."),
  confirmationVideoIntro: block(
    "What to expect. What to bring. How to make the most of our call.",
  ),
  videoTextTitle: block("On the job? Your calls are covered."),
  videoTextBody: block(
    "Your AI receptionist answers, takes the details, and helps your team follow up.",
  ),
  ctaTitle: block("Let’s talk about your business."),
  ctaBody: block(
    "A practical conversation about your calls and what could work better.",
  ),
  ctaButton: block("Book a strategic call"),
  ctaNote: block("A focused conversation. No obligation.", "small"),
  bookingTitle: block("Choose a time to talk.", "large"),
  bookingIntro: block(
    "Pick a time that works for you. We’ll take it from there.",
  ),
  bookingAgenda: block(
    "Your current call handling\nWhere opportunities slip through\nA plan tailored to your business",
  ),
  confirmationTitle: block("Let’s get ready for your call.", "large"),
  confirmationIntro: block(
    "Check your inbox for your booking status, meeting details, and calendar invitation.",
  ),
  preparationTitle: block("Come prepared. Leave with clarity."),
  preparation1Title: block("Bring your numbers."),
  preparation1Body: block(
    "Have an estimate of your weekly calls, missed calls, and average job value. Rough numbers are absolutely fine.",
  ),
  preparation2Title: block("Think about your workflow."),
  preparation2Body: block(
    "Note how you currently answer calls, schedule jobs, and follow up. Keep the names of your calendar and CRM handy.",
  ),
  preparation3Title: block("Make room for the conversation."),
  preparation3Body: block(
    "Join from a quiet place with a stable connection. Invite anyone on your team involved in this decision.",
  ),
  confirmationNote: block(
    "Need to change your time? Use the reschedule or cancel links in your Cal.com confirmation email.",
  ),
};
export type CopyKey = keyof typeof defaultCopy;
export type Question = {
  id: string;
  label: string;
  type: "text" | "select";
  options: string[];
  required: boolean;
};
export type FunnelConfig = {
  copy: Record<CopyKey, TextBlock>;
  calendarUrl: string;
  salesVideo: string;
  confirmationVideo: string;
  questions: Question[];
  testimonials: { quote: string; name: string; company: string }[];
};
export const defaultFunnel: FunnelConfig = {
  copy: defaultCopy,
  calendarUrl: "https://cal.com/yann/15min",
  salesVideo: "",
  confirmationVideo: "",
  questions: [
    {
      id: "area",
      label: "Which areas do you serve?",
      type: "text",
      options: [],
      required: true,
    },
    {
      id: "company",
      label: "Company name",
      type: "text",
      options: [],
      required: true,
    },
    {
      id: "revenue",
      label: "Annual revenue (USD)",
      type: "select",
      options: [
        "Under $500,000",
        "$500,000–$1 million",
        "$1 million–$3 million",
        "Over $3 million",
        "Prefer not to say",
      ],
      required: true,
    },
  ],
  testimonials: [],
};

export function calPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "cal.com" ||
      url.port ||
      url.username ||
      url.password
    )
      return null;
    const path = url.pathname.replace(/^\/|\/$/g, "");
    return /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)+$/.test(path) ? path : null;
  } catch {
    return null;
  }
}

export function isNativeVideo(value: string): boolean {
  if (!value) return false;
  return value.startsWith("/") || /\.(mp4|webm|mov|m4v)($|\?)/i.test(value);
}

export function videoEmbed(value: string): string | null {
  if (!value) return null;
  if (value.startsWith("/") && /\.(mp4|webm|mov|m4v)($|\?)/i.test(value)) {
    return value;
  }
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    if (/\.(mp4|webm|mov|m4v)($|\?)/i.test(u.pathname)) {
      return u.toString();
    }
    if (
      [
        "www.youtube.com",
        "youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(u.hostname)
    ) {
      const id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v") || u.pathname.split("/").pop();
      return id && /^[\w-]{11}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    }
    if (["vimeo.com", "player.vimeo.com"].includes(u.hostname)) {
      const id = u.pathname.split("/").pop();
      return id && /^\d+$/.test(id)
        ? `https://player.vimeo.com/video/${id}${u.searchParams.has("h") ? `?h=${encodeURIComponent(u.searchParams.get("h")!)}` : ""}`
        : null;
    }
    if (["loom.com", "www.loom.com"].includes(u.hostname)) {
      const id = u.pathname.split("/").pop();
      return id && /^[a-f0-9]{32}$/.test(id)
        ? `https://www.loom.com/embed/${id}`
        : null;
    }
  } catch {
    /* Invalid URL */
  }
  return null;
}

export function validateConfig(input: unknown): FunnelConfig {
  if (
    !input ||
    typeof input !== "object" ||
    JSON.stringify(input).length > 60000
  )
    throw new Error("Invalid funnel settings.");
  const c = input as FunnelConfig;
  if (
    !c.copy ||
    Object.keys(defaultCopy).some((key) => {
      const b = c.copy[key as CopyKey];
      return (
        !b ||
        typeof b.text !== "string" ||
        b.text.length > 3000 ||
        !["small", "medium", "large"].includes(b.size) ||
        typeof b.bold !== "boolean"
      );
    })
  )
    throw new Error("Please check your page text and formatting.");
  if (typeof c.calendarUrl !== "string" || !calPath(c.calendarUrl))
    throw new Error(
      "Enter a Cal.com event URL, such as https://cal.com/your-name/your-event.",
    );
  if (
    [c.salesVideo, c.confirmationVideo].some(
      (v) => typeof v !== "string" || (v && !videoEmbed(v)),
    )
  )
    throw new Error("Use a valid YouTube, Vimeo, or Loom video link.");
  if (
    !Array.isArray(c.questions) ||
    c.questions.length > 12 ||
    !c.questions.length
  )
    throw new Error("Add between 1 and 12 questions.");
  const ids = new Set<string>();
  for (const q of c.questions) {
    if (
      !q ||
      !/^[a-z][a-z0-9_]{0,39}$/.test(q.id) ||
      ids.has(q.id) ||
      typeof q.label !== "string" ||
      !q.label.trim() ||
      q.label.length > 200 ||
      !["text", "select"].includes(q.type) ||
      typeof q.required !== "boolean" ||
      !Array.isArray(q.options) ||
      q.options.length > 30 ||
      q.options.some(
        (o) => typeof o !== "string" || !o.trim() || o.length > 150,
      ) ||
      (q.type === "select" && !q.options.length)
    )
      throw new Error("Check question labels, unique IDs, and answer options.");
    ids.add(q.id);
  }
  if (
    !Array.isArray(c.testimonials) ||
    c.testimonials.length > 8 ||
    c.testimonials.some(
      (t) =>
        !t ||
        ["quote", "name", "company"].some(
          (k) =>
            typeof t[k as keyof typeof t] !== "string" ||
            t[k as keyof typeof t].length > 1500,
        ) ||
        !t.quote.trim() ||
        !t.name.trim(),
    )
  )
    throw new Error("Each testimonial needs a quote and a name.");
  return c;
}

export type FunnelLead = {
  id: string;
  createdAt: string;
  answers: Record<string, string>;
  questions: { id: string; label: string }[];
  attribution: Record<string, string>;
};
