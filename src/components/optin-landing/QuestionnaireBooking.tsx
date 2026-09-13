"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  ArrowLeft,
  Check,
} from "lucide-react";
import CalBooking from "@/components/funnel/CalBooking";

interface Question {
  id: number;
  title: string;
  description: string;
  options: { label: string; text: string; icon?: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: "Do you currently take inbound phone calls from customers or clients?*",
    description:
      "We work exclusively with businesses looking to automate inbound calls and capture more bookings.",
    options: [
      { label: "A", text: "Yes", icon: "✅" },
      { label: "B", text: "No (leave this page now, you will be rejected.)", icon: "❌" },
    ],
  },
  {
    id: 2,
    title: "What type of business do you operate?*",
    description: "Select the category that best describes your operations.",
    options: [
      { label: "A", text: "Clinic / Healthcare / Dental / MedSpa", icon: "🏥" },
      { label: "B", text: "Home Services / Contractor / Trade", icon: "🛠️" },
      { label: "C", text: "Legal / Financial / Professional Practice", icon: "⚖️" },
      { label: "D", text: "Other Local or High-Volume Business", icon: "💼" },
    ],
  },
  {
    id: 3,
    title: "What is your approximate annual revenue?*",
    description: "Helps us assess your business scale and tailor the strategy call to your capacity.",
    options: [
      { label: "A", text: "Under $250,000 / year", icon: "🌱" },
      { label: "B", text: "$250,000 – $500,000 / year", icon: "📈" },
      { label: "C", text: "$500,000 – $1,000,000 / year", icon: "💼" },
      { label: "D", text: "$1,000,000+ / year", icon: "🚀" },
    ],
  },
  {
    id: 4,
    title: "Who currently answers your phone calls during business hours?*",
    description: "Tell us how your incoming phone traffic is managed right now.",
    options: [
      { label: "A", text: "I answer myself (distracting me from running the business)", icon: "🙋‍♂️" },
      { label: "B", text: "An in-house receptionist or front-desk assistant", icon: "👩‍💼" },
      { label: "C", text: "An outsourced call center or answering service", icon: "🏢" },
      { label: "D", text: "Automated IVR phone menu or voicemail", icon: "🤖" },
    ],
  },
  {
    id: 5,
    title: "What happens to phone calls when your business is closed?*",
    description: "Evenings, weekends, holidays, and when lines are busy.",
    options: [
      { label: "A", text: "Calls go to voicemail (most callers hang up without leaving a message)", icon: "📭" },
      { label: "B", text: "Calls forward to my personal cell phone (constant interruptions)", icon: "📱" },
      { label: "C", text: "An answering service or call center handles them", icon: "📞" },
      { label: "D", text: "Nothing in place, calls just ring out and are lost", icon: "🚫" },
    ],
  },
  {
    id: 6,
    title: "How many inbound phone calls does your business receive per month?*",
    description: "Helps us estimate your monthly missed-call volume and recovered revenue.",
    options: [
      { label: "A", text: "50 - 200 calls per month", icon: "📞" },
      { label: "B", text: "200 - 800 calls per month", icon: "🔥" },
      { label: "C", text: "800+ calls per month", icon: "⚡" },
    ],
  },
];

const AIRTABLE_SINGLE_SELECTS = {
  businessType: [
    "Clinic / Healthcare / Dental / MedSpa",
    "Home Services / Contractor / Trade",
    "Legal / Financial / Professional Practice",
    "Other Local Business",
  ],
  revenue: [
    "< $250,000 / year",
    "$250,000 – $500,000 / year",
    "$500,000 – $1,000,000 / year",
    "$1,000,000+ / year",
  ],
  currentSystem: [
    "Business Owner directly",
    "In-house Receptionist / Assistant",
    "Outsourced Call Center",
    "Automated IVR / Voicemail",
  ],
  afterHours: [
    "Voicemail",
    "Forward to personal cell",
    "Answering service / Call center",
    "Nothing in place (calls ring out)",
  ],
  callVolume: [
    "50 - 200 calls / month",
    "200 - 800 calls / month",
    "800+ calls / month",
  ],
};

export default function QuestionnaireBooking({
  calendarUrl = "https://cal.com/berinagents/demo",
}: {
  calendarUrl?: string;
}) {
  const [currentStep, setCurrentStep] = useState(0); // 0 to 5 are questions, 6 is calendar
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [rejected, setRejected] = useState(false);

  const totalQuestions = QUESTIONS.length;
  const currentQ = QUESTIONS[currentStep];

  // Calculate completion percentage
  const progressPercent =
    currentStep >= totalQuestions
      ? 100
      : Math.round(((currentStep + 1) / totalQuestions) * 100);

  const getStructuredData = (answers: Record<number, number>) => {
    return {
      businessType: AIRTABLE_SINGLE_SELECTS.businessType[answers[1]] || "",
      revenue: AIRTABLE_SINGLE_SELECTS.revenue[answers[2]] || "",
      currentSystem: AIRTABLE_SINGLE_SELECTS.currentSystem[answers[3]] || "",
      afterHours: AIRTABLE_SINGLE_SELECTS.afterHours[answers[4]] || "",
      callVolume: AIRTABLE_SINGLE_SELECTS.callVolume[answers[5]] || "",
      leadSource: "Meta Ads",
    };
  };

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    // If Question 1 option B (No) is selected
    if (qIdx === 0 && optIdx === 1) {
      setRejected(true);
      return;
    }

    setRejected(false);
    const updated = { ...selectedAnswers, [qIdx]: optIdx };
    setSelectedAnswers(updated);

    // Click automatically advances to next question with 180ms delay
    setTimeout(() => {
      if (qIdx < totalQuestions - 1) {
        setCurrentStep(qIdx + 1);
      } else {
        try {
          const structured = getStructuredData(updated);
          sessionStorage.setItem("funnel-structured-answers", JSON.stringify(structured));
        } catch {
          // ignore
        }
        setCurrentStep(totalQuestions);
      }
    }, 180);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setRejected(false);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const avatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
  ];

  return (
    <main
      className="min-h-screen w-full bg-white text-gray-900 font-sans pb-20"
      style={{
        background:
          "linear-gradient(180deg, #bfdbfe 0%, #e0effe 240px, #ffffff 500px)",
      }}
    >
      <div
        className={`mx-auto px-4 pt-10 md:pt-14 transition-all duration-300 ${
          currentStep < totalQuestions ? "max-w-3xl" : "max-w-5xl lg:max-w-6xl"
        }`}
      >
        {/* Top Reviews and Rating Header */}
        <div className="flex flex-col items-center text-center">
          {/* 4 Overlapping Avatars */}
          <div className="flex items-center -space-x-2.5">
            {avatars.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="Client review avatar"
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ))}
          </div>

          {/* 5 Stars */}
          <div className="flex items-center gap-1 text-amber-400 mt-2.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current stroke-none" />
            ))}
          </div>

          {/* Rating Score */}
          <p className="text-xs md:text-sm font-bold text-gray-800 mt-1">
            4.8 <span className="font-normal text-gray-600">from 148 reviews</span>
          </p>

          {/* Main Title */}
          <h1 className="text-gray-900 text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight leading-tight mt-4 max-w-2xl">
            Answer a Few Quick Questions About Your Brand Then Book Your Call
          </h1>

          {/* Sleek Progress Bar */}
          <div className="w-full max-w-lg mx-auto mt-6">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-[#2a6ced]">
                {currentStep < totalQuestions
                  ? `Question ${currentStep + 1} of ${totalQuestions}`
                  : "Qualification Complete!"}
              </span>
              <span className="text-gray-500 font-mono">
                {progressPercent}%
              </span>
            </div>
            {/* Progress Track */}
            <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-[#2a6ced] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Divider Line */}
        <div className="w-full h-px bg-blue-200/50 my-8" />

        {/* Content Area: Questions or Calendar */}
        {currentStep < totalQuestions ? (
          <div className="relative w-full">
            {/* Rejection State if user chose "No" */}
            {rejected ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center animate-in fade-in duration-200">
                <span className="text-4xl">❌</span>
                <h3 className="text-xl font-bold text-red-900 mt-3">
                  We're Sorry, You Don't Qualify
                </h3>
                <p className="text-red-700 text-sm mt-2 max-w-md mx-auto">
                  Our 24/7 AI Receptionist service is reserved strictly for active
                  businesses that receive live inbound phone calls.
                </p>
                <button
                  type="button"
                  onClick={() => setRejected(false)}
                  className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Change Answer
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in duration-150">
                {/* Question Header */}
                <div className="flex items-start gap-3 mb-2">
                  <span className="bg-[#2a6ced] text-white text-xs font-bold w-6 h-6 rounded flex items-center justify-center shrink-0 mt-1">
                    {currentQ.id}
                  </span>
                  <h2 className="text-gray-900 font-bold text-xl md:text-2xl leading-snug">
                    {currentQ.title}
                  </h2>
                </div>

                {/* Question Description */}
                <p className="text-gray-500 text-sm md:text-[15px] ml-9 mb-6 leading-relaxed">
                  {currentQ.description}
                </p>

                {/* Options List */}
                <div className="ml-9 space-y-3 max-w-xl">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[currentStep] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentStep, optIdx)}
                        className={`w-full text-left p-3.5 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-150 flex items-center gap-3.5 group cursor-pointer active:scale-[0.99] ${
                          isSelected
                            ? "bg-blue-50 border-[#2a6ced] ring-2 ring-[#2a6ced]/20 shadow-sm"
                            : "bg-[#f3f7fe] hover:bg-[#e8f1fe] border-blue-100/70"
                        }`}
                      >
                        {/* Letter Badge A, B, C */}
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#2a6ced] text-white"
                              : "bg-white text-blue-600 border border-blue-200 group-hover:border-blue-300"
                          }`}
                        >
                          {opt.label}
                        </span>

                        {/* Text */}
                        <span className="text-gray-800 text-sm md:text-base font-medium flex items-center gap-2">
                          {opt.icon && <span>{opt.icon}</span>}
                          <span>{opt.text}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Bar PLACED BELOW the options */}
                <div className="ml-9 mt-7 pt-4 border-t border-gray-100 flex items-center justify-start max-w-xl">
                  {currentStep > 0 ? (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-gray-500 hover:text-[#2a6ced] transition-colors py-1.5 px-3 rounded-lg hover:bg-blue-50/70 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  ) : (
                    <Link
                      href="/opt-in"
                      className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors py-1.5 px-3 rounded-lg hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to page
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Final Booking Calendar Step */
          <div className="w-full pt-2 animate-in fade-in duration-300">
            {/* Back to questions link placed above the calendar */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-gray-500 hover:text-[#2a6ced] transition-colors py-1.5 px-3 rounded-lg hover:bg-blue-50/70 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to questions
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 font-bold px-4 py-2 rounded-full text-sm mb-3 border border-emerald-200">
                <Check className="w-4 h-4 stroke-[3]" /> You're Qualified!
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                Select Your Date & Time For A 1-on-1 AI Strategy Call
              </h2>
              <p className="text-gray-600 text-sm md:text-base mt-2">
                We'll walk you through a live voice simulation and map out your custom deployment.
              </p>
            </div>

            {/* Embedded Cal.com with https://cal.com/berinagents/demo */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 md:p-6 overflow-hidden">
              <CalBooking
                url={calendarUrl}
                structuredAnswers={getStructuredData(selectedAnswers)}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
