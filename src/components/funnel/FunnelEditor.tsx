"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bold,
  ExternalLink,
  Plus,
  Save,
  Upload,
  Trash2,
  Monitor,
  Smartphone,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  type FunnelConfig,
  type CopyKey,
  type TextBlock,
  type FunnelLead,
} from "@/lib/funnel";
import { saveFunnelAction } from "@/app/funnel/actions";
import type { FunnelStep } from "./FunnelView";

const groups: Record<FunnelStep, CopyKey[]> = {
  sales: [
    "eyebrow",
    "headline",
    "intro",
    "formButton",
    "formSuccess",
    "salesVideoTitle",
    "salesVideoIntro",
    "videoTextTitle",
    "videoTextBody",
    "testimonialsTitle",
    "ctaTitle",
    "ctaBody",
    "ctaButton",
    "ctaNote",
  ],
  booking: ["bookingTitle", "bookingIntro", "bookingAgenda"],
  confirmation: [
    "confirmationTitle",
    "confirmationIntro",
    "confirmationVideoTitle",
    "confirmationVideoIntro",
    "preparationTitle",
    "preparation1Title",
    "preparation1Body",
    "preparation2Title",
    "preparation2Body",
    "preparation3Title",
    "preparation3Body",
    "confirmationNote",
  ],
};
const inputClass =
  "w-full border border-[#dedacf] rounded-md bg-white px-3 py-2 text-sm";
function labelFor(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
function TextEditor({
  name,
  value,
  onChange,
}: {
  name: string;
  value: TextBlock;
  onChange: (v: TextBlock) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function boldSelection() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd;
    if (start === end) {
      onChange({ ...value, bold: !value.bold });
      return;
    }
    onChange({
      ...value,
      text: `${value.text.slice(0, start)}**${value.text.slice(start, end)}**${value.text.slice(end)}`,
    });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 2, end + 2);
    });
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-3">
        <label htmlFor={`copy-${name}`} className="text-xs font-semibold">
          {labelFor(name)}
        </label>
        <div className="flex gap-1 items-center">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={boldSelection}
            aria-label={`Bold ${labelFor(name)}`}
            aria-pressed={value.bold}
            title="Select words to make them bold, or toggle bold for the whole block"
            className={`p-1.5 rounded border ${value.bold ? "bg-black text-white" : "bg-white"}`}
          >
            <Bold size={13} />
          </button>
          <select
            aria-label={`${labelFor(name)} text size`}
            value={value.size}
            onChange={(e) =>
              onChange({ ...value, size: e.target.value as TextBlock["size"] })
            }
            className="text-xs border rounded p-1.5 bg-white"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
      <textarea
        ref={ref}
        id={`copy-${name}`}
        value={value.text}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
        rows={value.text.length > 100 ? 4 : 2}
        maxLength={3000}
        className={inputClass}
      />
    </div>
  );
}

function VideoUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const data = new FormData();
    data.append("file", file);
    try {
      const res = await fetch("/api/funnel/upload", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      onChange(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2 border border-[#dedacf] rounded-lg p-3.5 bg-white">
      <div className="flex justify-between items-center gap-2">
        <label className="text-xs font-semibold text-[#1a1918]">{label}</label>
        {value && (
          <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
            <CheckCircle2 size={11} /> Native MP4 Active
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 text-xs font-semibold bg-[#1a1918] text-white rounded-md hover:bg-[#33312e] disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Uploading MP4…
            </>
          ) : (
            <>
              <Upload size={13} /> Choose MP4 file
            </>
          )}
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/videos/demo.mp4 or https://..."
          className={`${inputClass} flex-1 text-xs`}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[11px] text-[#73706b]">
        Upload an MP4 file directly from your device, or paste a video URL. Played in a native HTML5 player.
      </p>
    </div>
  );
}

export default function FunnelEditor({
  initialConfig,
  leads,
}: {
  initialConfig: FunnelConfig;
  leads: FunnelLead[];
}) {
  const [config, setConfig] = useState(initialConfig);
  const [tab, setTab] = useState<"content" | "questions" | "media" | "leads">(
    "content",
  );
  const [step, setStep] = useState<FunnelStep>("sales");
  const [mobile, setMobile] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const send = () =>
      previewRef.current?.contentWindow?.postMessage(
        { type: "funnel-preview", config },
        window.location.origin,
      );
    const ready = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === previewRef.current?.contentWindow &&
        event.data?.type === "funnel-preview-ready"
      )
        send();
    };
    send();
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [config, tab, step]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(next: FunnelConfig) {
    setConfig(next);
    setDirty(true);
    setMessage("");
  }
  function save(publish: boolean) {
    startTransition(async () => {
      const result = await saveFunnelAction(config, publish);
      if (result.success) {
        setDirty(false);
        setMessage(
          publish
            ? "Published. Your live pages are up to date."
            : "Draft saved. Your live pages are unchanged.",
        );
      } else setMessage(result.error || "Unable to save.");
    });
  }
  return (
    <div className="p-4 md:p-8 max-w-[1800px] mx-auto">
      <header className="flex flex-wrap justify-between items-start gap-4 mb-7">
        <div>
          <p className="text-[10px] uppercase tracking-[.2em] text-[#9e4733] mb-2">
            GROWTH / YOUR CONVERSION JOURNEY
          </p>
          <h1 className="font-serif text-3xl">Sales funnel</h1>
          <p className="text-xs text-[#73706b] mt-2">
            Three pages. One clear next step.{" "}
            {dirty && <span className="text-[#9e4733]">Unsaved changes</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/opt-in"
            target="_blank"
            className="border rounded px-3 py-2 text-xs flex items-center gap-2 bg-white"
          >
            View live <ExternalLink size={13} />
          </Link>
          <button
            disabled={pending}
            onClick={() => save(false)}
            className="border rounded px-3 py-2 text-xs flex items-center gap-2 bg-white disabled:opacity-50"
          >
            <Save size={13} /> Save draft
          </button>
          <button
            disabled={pending}
            onClick={() => save(true)}
            className="rounded px-4 py-2 text-xs flex items-center gap-2 bg-[#1a1918] text-white disabled:opacity-50"
          >
            <Upload size={13} />
            {pending ? "Saving…" : "Publish"}
          </button>
        </div>
      </header>
      {message && (
        <p
          role="status"
          className="mb-5 bg-white border border-[#dcd7cc] rounded p-3 text-sm"
        >
          {message}
        </p>
      )}
      <div className="flex gap-5 border-b mb-5 overflow-x-auto">
        {(["content", "questions", "media", "leads"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-xs whitespace-nowrap ${tab === t ? "border-b-2 border-[#9e4733] font-bold" : "text-[#73706b]"}`}
          >
            {t === "media"
              ? "Videos, calendar & testimonials"
              : t === "leads"
                ? `Responses (${leads.length})`
                : labelFor(t)}
          </button>
        ))}
      </div>
      {tab === "leads" ? (
        <section className="bg-white rounded-lg border p-5">
          <h2 className="font-serif text-xl">Questionnaire responses</h2>
          <p className="text-xs text-[#73706b] mt-2 mb-5">
            The 100 most recent submissions. Reload to see new responses.
            Booking details are managed in Cal.com.
          </p>
          {leads.length === 0 ? (
            <p className="py-14 text-center text-sm text-[#73706b]">
              Your first response will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <div key={lead.id} className="border rounded">
                  <button
                    className="w-full p-4 text-left flex justify-between gap-4 text-sm"
                    onClick={() =>
                      setSelectedLead(selectedLead === lead.id ? null : lead.id)
                    }
                    aria-expanded={selectedLead === lead.id}
                  >
                    <span className="font-semibold">
                      {lead.answers.company || "Business questionnaire"}
                    </span>
                    <time className="text-xs text-[#73706b]">
                      {new Date(lead.createdAt).toLocaleString("en-GB", {
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </time>
                  </button>
                  {selectedLead === lead.id && (
                    <dl className="px-4 pb-4 space-y-3">
                      {lead.questions.map((q) => (
                        <div key={q.id}>
                          <dt className="text-[10px] uppercase text-[#73706b]">
                            {q.label}
                          </dt>
                          <dd className="text-sm whitespace-pre-wrap break-words">
                            {lead.answers[q.id] || "Not provided"}
                          </dd>
                        </div>
                      ))}
                      <div>
                        <dt className="text-[10px] uppercase text-[#73706b]">
                          Lead reference (also sent to Cal.com metadata)
                        </dt>
                        <dd className="text-xs break-all">{lead.id}</dd>
                      </div>
                      {Object.entries(lead.attribution).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-[10px] uppercase text-[#73706b]">
                            {key}
                          </dt>
                          <dd className="text-xs break-all">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="grid xl:grid-cols-[350px_minmax(0,1fr)] gap-6 items-start">
          <fieldset
            disabled={pending}
            className="min-w-0 space-y-6 bg-[#fdfcf9] border rounded-lg p-5 xl:max-h-[calc(100vh-245px)] xl:overflow-y-auto"
          >
            {tab === "content" && (
              <>
                <label className="block text-xs font-semibold">
                  Page
                  <select
                    className={`${inputClass} mt-2`}
                    value={step}
                    onChange={(e) => setStep(e.target.value as FunnelStep)}
                  >
                    <option value="sales">01 — Opt-in page</option>
                    <option value="booking">02 — Booking page</option>
                    <option value="confirmation">03 — Confirmation page</option>
                  </select>
                </label>
                <p className="text-xs text-[#73706b]">
                  Select text and press B for bold. Use the size menu for each
                  block. Changes appear in the preview immediately.
                </p>
                {groups[step].map((key) => (
                  <TextEditor
                    key={key}
                    name={key}
                    value={config.copy[key]}
                    onChange={(value) =>
                      update({
                        ...config,
                        copy: { ...config.copy, [key]: value },
                      })
                    }
                  />
                ))}
              </>
            )}
            {tab === "questions" && (
              <>
                <div>
                  <h2 className="font-serif text-xl">Business questionnaire</h2>
                  <p className="text-xs text-[#73706b] mt-2">
                    Collect context only. Every answer can continue to the
                    calendar.
                  </p>
                </div>
                {config.questions.map((q, i) => (
                  <div key={q.id} className="space-y-3 border-t pt-4">
                    <div className="flex justify-between">
                      <b className="text-xs">Question {i + 1}</b>
                      <button
                        aria-label={`Remove question ${i + 1}`}
                        onClick={() =>
                          update({
                            ...config,
                            questions: config.questions.filter(
                              (_, n) => n !== i,
                            ),
                          })
                        }
                        className="text-[#9e4733]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <label className="block text-xs">
                      Label
                      <input
                        className={`${inputClass} mt-1`}
                        value={q.label}
                        maxLength={200}
                        onChange={(e) =>
                          update({
                            ...config,
                            questions: config.questions.map((v, n) =>
                              n === i ? { ...v, label: e.target.value } : v,
                            ),
                          })
                        }
                      />
                    </label>
                    <select
                      aria-label={`Question ${i + 1} type`}
                      className={inputClass}
                      value={q.type}
                      onChange={(e) =>
                        update({
                          ...config,
                          questions: config.questions.map((v, n) =>
                            n === i
                              ? {
                                  ...v,
                                  type: e.target.value as "text" | "select",
                                }
                              : v,
                          ),
                        })
                      }
                    >
                      <option value="text">Short answer</option>
                      <option value="select">Dropdown</option>
                    </select>
                    {q.type === "select" && (
                      <label className="block text-xs">
                        Options (one per line)
                        <textarea
                          className={`${inputClass} mt-1`}
                          rows={5}
                          value={q.options.join("\n")}
                          onChange={(e) =>
                            update({
                              ...config,
                              questions: config.questions.map((v, n) =>
                                n === i
                                  ? {
                                      ...v,
                                      options: e.target.value.split("\n"),
                                    }
                                  : v,
                              ),
                            })
                          }
                        />
                      </label>
                    )}
                    <label className="text-xs flex gap-2">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) =>
                          update({
                            ...config,
                            questions: config.questions.map((v, n) =>
                              n === i
                                ? { ...v, required: e.target.checked }
                                : v,
                            ),
                          })
                        }
                      />
                      Required
                    </label>
                  </div>
                ))}
                <button
                  disabled={config.questions.length >= 12}
                  className="flex gap-2 text-xs items-center border rounded p-2"
                  onClick={() =>
                    update({
                      ...config,
                      questions: [
                        ...config.questions,
                        {
                          id: `q_${Date.now()}`,
                          label: "Your question",
                          type: "text",
                          options: [],
                          required: false,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} />
                  Add question
                </button>
              </>
            )}
            {tab === "media" && (
              <>
                <h2 className="font-serif text-xl">Connect your content</h2>
                <p className="text-xs text-[#73706b]">
                  Upload native MP4 videos and connect your Cal.com schedule.
                </p>

                <VideoUploadField
                  label="Opt-in video (Native MP4)"
                  value={config.salesVideo}
                  onChange={(url) => update({ ...config, salesVideo: url })}
                />

                <VideoUploadField
                  label="Post-booking video (Native MP4)"
                  value={config.confirmationVideo}
                  onChange={(url) =>
                    update({ ...config, confirmationVideo: url })
                  }
                />

                <label className="block text-xs font-semibold">
                  Cal.com event URL
                  <input
                    type="url"
                    className={`${inputClass} mt-2`}
                    placeholder="https://cal.com/name/event"
                    value={config.calendarUrl}
                    onChange={(e) =>
                      update({ ...config, calendarUrl: e.target.value })
                    }
                  />
                </label>
                <div className="text-xs text-[#73706b] bg-[#efede5] p-3 rounded space-y-2">
                  <p>
                    In Cal.com, make your name, email, and company booking
                    questions required. Use “company” as the company field
                    identifier to prefill it.
                  </p>
                  <p>
                    For bookings opened in a separate tab, set the event’s
                    custom success redirect to your website URL followed by{" "}
                    <b>/strategy/confirmation</b>. Set the event title and
                    questions to English.
                  </p>
                </div>
                <h2 className="font-serif text-xl pt-3">
                  Customer testimonials
                </h2>
                <p className="text-xs text-[#73706b]">
                  Add real customer quotes with permission. This section is
                  hidden on the live page until you add a testimonial.
                </p>
                {config.testimonials.map((t, i) => (
                  <div key={i} className="space-y-3 border-t pt-4">
                    <div className="flex justify-between text-xs font-semibold">
                      Testimonial {i + 1}
                      <button
                        aria-label={`Remove testimonial ${i + 1}`}
                        onClick={() =>
                          update({
                            ...config,
                            testimonials: config.testimonials.filter(
                              (_, n) => n !== i,
                            ),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {(["quote", "name", "company"] as const).map((key) => (
                      <label key={key} className="block text-xs">
                        {labelFor(key)}
                        <textarea
                          className={`${inputClass} mt-1`}
                          rows={key === "quote" ? 4 : 1}
                          maxLength={1500}
                          value={t[key]}
                          onChange={(e) =>
                            update({
                              ...config,
                              testimonials: config.testimonials.map((v, n) =>
                                n === i ? { ...v, [key]: e.target.value } : v,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                ))}
                <button
                  disabled={config.testimonials.length >= 8}
                  className="flex gap-2 text-xs items-center border rounded p-2"
                  onClick={() =>
                    update({
                      ...config,
                      testimonials: [
                        ...config.testimonials,
                        { quote: "", name: "", company: "" },
                      ],
                    })
                  }
                >
                  <Plus size={14} />
                  Add testimonial
                </button>
              </>
            )}
          </fieldset>
          <section className="min-w-0 border rounded-lg overflow-hidden bg-[#e9e5dc]">
            <div className="bg-white p-3 flex flex-wrap justify-between items-center gap-3 border-b">
              <select
                aria-label="Preview page"
                className="text-xs bg-transparent"
                value={step}
                onChange={(e) => setStep(e.target.value as FunnelStep)}
              >
                <option value="sales">Sales page</option>
                <option value="booking">Booking page</option>
                <option value="confirmation">Confirmation page</option>
              </select>
              <span className="text-[10px] text-[#73706b]">
                LIVE PREVIEW · NOT PUBLISHED
              </span>
              <div className="flex gap-2">
                <button
                  aria-label="Desktop preview"
                  aria-pressed={!mobile}
                  onClick={() => setMobile(false)}
                  className={!mobile ? "text-black" : "text-gray-400"}
                >
                  <Monitor size={16} />
                </button>
                <button
                  aria-label="Mobile preview"
                  aria-pressed={mobile}
                  onClick={() => setMobile(true)}
                  className={mobile ? "text-black" : "text-gray-400"}
                >
                  <Smartphone size={16} />
                </button>
              </div>
            </div>
            <div className="xl:max-h-[calc(100vh-290px)] overflow-auto">
              <iframe
                title="Funnel preview"
                style={{
                  width: mobile ? "min(390px, 100%)" : "100%",
                  height: 850,
                  display: "block",
                  margin: "0 auto",
                  border: 0,
                }}
                src={`/funnel/preview?step=${step}`}
                onLoad={(e) =>
                  e.currentTarget.contentWindow?.postMessage(
                    { type: "funnel-preview", config },
                    window.location.origin,
                  )
                }
                ref={previewRef}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
