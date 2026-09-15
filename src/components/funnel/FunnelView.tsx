"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  Check,
  CheckCircle2,
  CalendarDays,
  ArrowUpRight,
  ShieldCheck,
  Play,
  Volume2,
  Maximize,
} from "lucide-react";
import dynamic from "next/dynamic";
import { type FunnelConfig, videoEmbed, isNativeVideo } from "@/lib/funnel";
import { FunnelText as Text } from "./FunnelText";
import CustomVideoPlayer from "./CustomVideoPlayer";
import "./funnel.css";

const CalBooking = dynamic(() => import("./CalBooking"), {
  ssr: false,
  loading: () => (
    <p className="f-calendar-fallback" role="status">
      Loading available times…
    </p>
  ),
});

export type FunnelStep = "sales" | "booking" | "confirmation";
function Video({
  url,
  title,
  preview,
  autoPlayTrigger,
  onEnded,
}: {
  url: string;
  title: string;
  preview: boolean;
  autoPlayTrigger?: number;
  onEnded?: () => void;
}) {
  const src = videoEmbed(url);

  if (!src)
    return (
      <div
        className="f-video-placeholder"
        role="img"
        aria-label={`${title} placeholder. Video coming soon.`}
      >
        <span className="f-player-brand">BerinAgents.</span>
        <div className="f-player-center">
          <span className="f-player-play">
            <Play size={30} fill="currentColor" />
          </span>
          <span>
            {preview
              ? "Upload your MP4 video in the editor"
              : "Video coming soon"}
          </span>
        </div>
        <div className="f-player-controls" aria-hidden="true">
          <Play size={15} fill="currentColor" />
          <div className="f-player-timeline" />
          <Volume2 size={17} />
          <Maximize size={17} />
        </div>
      </div>
    );

  if (isNativeVideo(src)) {
    return (
      <CustomVideoPlayer
        src={src}
        title={title}
        autoPlayTrigger={autoPlayTrigger}
        onEnded={onEnded}
      />
    );
  }

  return (
    <div className="f-video">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="fullscreen; picture-in-picture; encrypted-media; autoplay"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

export default function FunnelView({
  config,
  step = "sales",
  preview = false,
}: {
  config: FunnelConfig;
  step?: FunnelStep;
  preview?: boolean;
}) {
  const c = config.copy;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playVideoTrigger, setPlayVideoTrigger] = useState(0);
  const [ctaHighlighted, setCtaHighlighted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hasInteracted = useRef(false);
  const index = Math.min(questionIndex, config.questions.length - 1);
  const question = config.questions[index];
  const isLastQuestion = index === config.questions.length - 1;

  useEffect(() => {
    if (hasInteracted.current && !saved)
      formRef.current
        ?.querySelector<HTMLInputElement | HTMLSelectElement>(
          ".f-question input, .f-question select",
        )
        ?.focus();
  }, [index, saved]);

  const scrollToSalesVideo = () => {
    setTimeout(() => {
      const el = document.getElementById("sales-video");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setPlayVideoTrigger((v) => v + 1);
      }
    }, 150);
  };

  const handleSalesVideoEnded = () => {
    setCtaHighlighted(true);
    setTimeout(() => {
      const cta = document.getElementById("strategic-booking-cta");
      if (cta) {
        cta.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 350);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!isLastQuestion) {
      hasInteracted.current = true;
      setQuestionIndex(index + 1);
      setError("");
      return;
    }
    if (preview) {
      setSaved(true);
      scrollToSalesVideo();
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          website: form.get("website"),
          attribution: Object.fromEntries(
            new URLSearchParams(window.location.search),
          ),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to save your answers.");
      try {
        sessionStorage.setItem(
          "funnel-lead",
          JSON.stringify({ id: result.id, company: answers.company || "" }),
        );
      } catch {
        /* Booking remains available without browser storage. */
      }
      setSaved(true);
      scrollToSalesVideo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const bookingHref = saved ? "/opt-in/book" : "#business-form";
  return (
    <div className={`funnel f-page-${step} ${preview ? "f-preview" : ""}`}>
      <header className="f-header">
        <Link
          href={preview ? "#" : "/opt-in"}
          className="f-brand"
          aria-label="BerinAgents home"
        >
          Berin<span>Agents</span>
          <span className="f-brand-dot">.</span>
        </Link>
        <span className="f-header-note">
          <span /> YOUR BUSINESS. ALWAYS ANSWERED.
        </span>
      </header>
      <main>
        {step === "sales" && (
          <>
            <section className="f-hero">
              <Text block={c.eyebrow} className="f-eyebrow" />
              <Text block={c.headline} as="h1" />
              <Text block={c.intro} className="f-intro" />
            </section>
            <section className="f-form-wrap" id="business-form">
              <form ref={formRef} onSubmit={submit} className="f-form f-wizard">
                {!saved && config.questions.length > 1 && (
                  <div className="f-step-indicator">
                    <div className="f-step-meta">
                      <span>Question {index + 1} of {config.questions.length}</span>
                      <span>{Math.round(((index + 1) / config.questions.length) * 100)}%</span>
                    </div>
                    <div className="f-step-track">
                      <div
                        className="f-step-fill"
                        style={{
                          width: `${((index + 1) / config.questions.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {saved ? (
                  <div className="f-success-wrap">
                    <div className="f-success" role="status">
                      <CheckCircle2 size={22} />
                      <Text block={c.formSuccess} />
                    </div>
                    <button
                      type="button"
                      className="f-scroll-to-video"
                      onClick={() => {
                        document
                          .getElementById("sales-video")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <span>Watch the video demo below</span>
                      <ArrowDown size={16} />
                    </button>
                  </div>
                ) : (
                  question && (
                    <div className="f-fields f-question" key={question.id}>
                      <label htmlFor={`q-${question.id}`}>
                        {question.label}
                        {question.required && (
                          <span className="f-required"> *</span>
                        )}
                      </label>
                      {question.type === "select" ? (
                        <select
                          id={`q-${question.id}`}
                          name={question.id}
                          required={question.required}
                          value={answers[question.id] || ""}
                          disabled={busy}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [question.id]: e.target.value,
                            })
                          }
                        >
                          <option value="" disabled>
                            Select an option
                          </option>
                          {question.options.map((option, i) => (
                            <option key={i}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`q-${question.id}`}
                          name={question.id}
                          required={question.required}
                          value={answers[question.id] || ""}
                          disabled={busy}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [question.id]: e.target.value,
                            })
                          }
                          maxLength={1000}
                          autoComplete={
                            question.id === "company" ? "organization" : "off"
                          }
                          placeholder={
                            question.id === "area"
                              ? "City, state, or service area"
                              : "Your answer"
                          }
                        />
                      )}
                    </div>
                  )
                )}
                <div className="f-honeypot" aria-hidden="true">
                  <label>
                    Website
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                {error && (
                  <p role="alert" className="f-error">
                    {error}
                  </p>
                )}
                <div className="f-question-actions">
                  {saved ? (
                    <button
                      type="button"
                      className="f-question-back"
                      onClick={() => {
                        hasInteracted.current = true;
                        setSaved(false);
                        setQuestionIndex(0);
                        setError("");
                      }}
                    >
                      Edit answers
                    </button>
                  ) : (
                    <>
                      {index > 0 && (
                        <button
                          type="button"
                          className="f-question-back"
                          disabled={busy}
                          onClick={() => {
                            hasInteracted.current = true;
                            setQuestionIndex(index - 1);
                            setError("");
                          }}
                        >
                          Back
                        </button>
                      )}
                      <button
                        className="f-button"
                        disabled={busy}
                        type="submit"
                      >
                        {busy ? (
                          "Saving your answers…"
                        ) : isLastQuestion ? (
                          <Text block={c.formButton} as="span" />
                        ) : (
                          "Continue"
                        )}
                        <ArrowRight size={18} />
                      </button>
                    </>
                  )}
                </div>
                <p className="f-privacy">
                  <ShieldCheck size={13} /> Used to prepare your call.{" "}
                  <Link href="/privacy">Privacy policy</Link>
                </p>
              </form>
            </section>
            <section className="f-video-section" id="sales-video">
              <div className="f-video-heading">
                <Text block={c.salesVideoTitle} as="h2" />
                <Text block={c.salesVideoIntro} />
              </div>
              <Video
                url={config.salesVideo}
                title="See your AI receptionist in action"
                preview={preview}
                autoPlayTrigger={playVideoTrigger}
                onEnded={handleSalesVideoEnded}
              />
            </section>
            <section className="f-video-copy">
              <div className="f-video-copy-inner">
                <Text block={c.videoTextTitle} as="h2" />
                <Text block={c.videoTextBody} />
              </div>
            </section>
            {(config.testimonials.length > 0 || preview) && (
              <section className="f-testimonials">
                <Text block={c.testimonialsTitle} as="h2" />
                <div className="f-quotes">
                  {config.testimonials.length ? (
                    config.testimonials.map((t, i) => (
                      <figure key={i}>
                        <span className="f-quote-mark">“</span>
                        <blockquote>{t.quote}</blockquote>
                        <figcaption>
                          <b>{t.name}</b>
                          <span>{t.company}</span>
                        </figcaption>
                      </figure>
                    ))
                  ) : (
                    <p className="f-empty">
                      Add your customer testimonials in the editor. This section
                      stays hidden on the live page until you do.
                    </p>
                  )}
                </div>
              </section>
            )}
            <section
              className={`f-cta ${ctaHighlighted ? "f-cta-highlight" : ""}`}
              id="strategic-booking-cta"
            >
              <span className="f-section-number">YOUR NEXT CHAPTER</span>
              <Text block={c.ctaTitle} as="h2" />
              <Text block={c.ctaBody} />
              <Link
                className="f-button f-button-light f-book-cta"
                href={preview ? "#" : bookingHref}
                onClick={() => {
                  if (!saved && !preview)
                    document
                      .querySelector<HTMLFormElement>("#business-form form")
                      ?.reportValidity();
                }}
              >
                <Text block={c.ctaButton} as="span" />
                <ArrowUpRight size={22} />
              </Link>
              <Text block={c.ctaNote} className="f-cta-note" />
            </section>
          </>
        )}
        {step === "booking" && (
          <section className="f-booking">
            <div className="f-booking-copy">
              <span className="f-section-number">
                LET’S TALK ABOUT YOUR BUSINESS
              </span>
              <Text block={c.bookingTitle} as="h1" />
              <Text block={c.bookingIntro} />
            </div>
            <div className="f-agenda">
              <span className="f-section-number">ON THE AGENDA</span>
              <div className="f-agenda-items">
                {c.bookingAgenda.text
                  .split("\n")
                  .filter(Boolean)
                  .map((item, i) => (
                    <div className="f-agenda-item" key={i}>
                      <CheckCircle2 size={16} />
                      <Text block={{ ...c.bookingAgenda, text: item }} />
                    </div>
                  ))}
              </div>
            </div>
            <div className="f-calendar">
              {preview ? (
                <div className="f-calendar-preview">
                  <CalendarDays size={40} />
                  <h2>Your Cal.com calendar</h2>
                  <p>
                    The live page displays your availability and booking form
                    here.
                  </p>
                </div>
              ) : (
                <CalBooking url={config.calendarUrl} />
              )}
            </div>
            <Link className="f-back" href={preview ? "#" : "/opt-in"}>
              ← Back to your business details
            </Link>
          </section>
        )}
        {step === "confirmation" && (
          <>
            <section className="f-hero f-confirmation">
              <div className="f-confirm-icon">
                <Check size={27} />
              </div>
              <Text block={c.confirmationTitle} as="h1" />
              <Text block={c.confirmationIntro} className="f-intro" />
            </section>
            <section className="f-video-section">
              <div className="f-video-heading">
                <Text block={c.confirmationVideoTitle} as="h2" />
                <Text block={c.confirmationVideoIntro} />
              </div>
              <Video
                url={config.confirmationVideo}
                title="Get ready for your strategy call"
                preview={preview}
              />
            </section>
            <section className="f-preparation">
              <Text block={c.preparationTitle} as="h2" />
              <div className="f-preparation-grid">
                {[1, 2, 3].map((i) => (
                  <article key={i}>
                    <span className="f-prep-number">0{i}</span>
                    <Text
                      block={c[`preparation${i}Title` as keyof typeof c]}
                      as="h3"
                    />
                    <Text block={c[`preparation${i}Body` as keyof typeof c]} />
                  </article>
                ))}
              </div>
              <Text block={c.confirmationNote} className="f-confirm-note" />
            </section>
          </>
        )}
      </main>
      <footer className="f-footer">
        <span>© {new Date().getFullYear()} BerinAgents</span>
        <div>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of service</Link>
        </div>
        <span>Built for better conversations.</span>
      </footer>
    </div>
  );
}
