'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, PhoneIncoming, CheckCircle2, Calendar, Wrench, Stethoscope, Building2, Briefcase } from 'lucide-react'

interface Scenario {
  id: string
  title: string
  businessType: string
  icon: any
  callerSituation: string
  businessOutcome: string
  duration: number
  dialogue: {
    speaker: 'Customer' | 'BerinAgent'
    text: string
    time: number
  }[]
}

const scenarios: Scenario[] = [
  {
    id: 'hvac',
    title: 'Emergency AC Repair Booking',
    businessType: 'HVAC & Home Services',
    icon: Wrench,
    callerSituation: 'Friday 7:45 PM — Homeowner has an AC breakdown in 90°F heat.',
    businessOutcome: '$650 Repair Job Captured & Booked into Calendar (Saved from Competitor)',
    duration: 32,
    dialogue: [
      { speaker: 'Customer', text: "Hi, our AC just shut off and it's 85 degrees inside. Do you have someone who can come out tomorrow morning?", time: 0 },
      { speaker: 'BerinAgent', text: "I'm so sorry to hear that! We can definitely get a technician out to help. What's the best service address?", time: 6 },
      { speaker: 'Customer', text: "1420 Highland Crest Drive in North Austin.", time: 12 },
      { speaker: 'BerinAgent', text: "Got it. I have an emergency repair slot open tomorrow between 8:00 AM and 10:00 AM. Does that work for you?", time: 16 },
      { speaker: 'Customer', text: "Yes, that's a lifesaver, thank you!", time: 24 },
      { speaker: 'BerinAgent', text: "You're all set! I've reserved the slot and sent a confirmation text with your technician's dispatch window.", time: 27 },
    ]
  },
  {
    id: 'dental',
    title: 'Patient Appointment Scheduling',
    businessType: 'Dental & Healthcare Clinics',
    icon: Stethoscope,
    callerSituation: 'Busy Monday 12:30 PM — Staff is at lunch, front desk phone is ringing.',
    businessOutcome: 'New Patient Booked & Insurance Verified Without Putting Anyone on Hold',
    duration: 30,
    dialogue: [
      { speaker: 'Customer', text: "Hi there, I need to schedule a cleaning and have a dentist look at a chipped molar this week.", time: 0 },
      { speaker: 'BerinAgent', text: "Hello! We'd be glad to help you take care of that. Are you an existing patient with Oakwood Dental, or will this be your first visit?", time: 6 },
      { speaker: 'Customer', text: "First time. I just moved into the area.", time: 14 },
      { speaker: 'BerinAgent', text: "Welcome to the area! Dr. Miller has an opening this Thursday at 2:30 PM. Would that afternoon time work for you?", time: 17 },
      { speaker: 'Customer', text: "Thursday at 2:30 PM works great.", time: 24 },
      { speaker: 'BerinAgent', text: "Perfect. You're booked for Thursday at 2:30 PM. I'm texting you our quick digital intake link right now.", time: 27 },
    ]
  },
  {
    id: 'realestate',
    title: 'Weekend Buyer Lead & Showing',
    businessType: 'Real Estate & Property Management',
    icon: Building2,
    callerSituation: 'Sunday 3:15 PM — High-intent buyer calling from a yard sign.',
    businessOutcome: '$12,000 Commission Opportunity Saved from Going to the Next Zillow Agent',
    duration: 34,
    dialogue: [
      { speaker: 'Customer', text: "Hello, I'm parked in front of the home on 742 Maplewood. Is it still on the market and can I tour it today?", time: 0 },
      { speaker: 'BerinAgent', text: "Hi! Yes, 742 Maplewood is active. It's a 4-bedroom listed at $575,000. Our listing agent has private tour slots tomorrow at 11:00 AM or 4:30 PM. Would either fit your schedule?", time: 6 },
      { speaker: 'Customer', text: "Tomorrow at 4:30 PM would be great for my wife and me.", time: 17 },
      { speaker: 'BerinAgent', text: "Excellent. Are you already pre-approved with a lender?", time: 21 },
      { speaker: 'Customer', text: "Yes, we have a pre-approval letter from Chase.", time: 25 },
      { speaker: 'BerinAgent', text: "Wonderful. I've locked in your private showing for tomorrow at 4:30 PM with Agent Sarah. You'll receive a calendar invite via text shortly.", time: 28 },
    ]
  },
  {
    id: 'lawfirm',
    title: 'Legal Intake & Consultation Booking',
    businessType: 'Law Firms & Professional Services',
    icon: Briefcase,
    callerSituation: 'Wednesday 6:00 PM — Prospective client needing a contract dispute consultation.',
    businessOutcome: 'Client Intake Qualified & Paid Consultation Scheduled Automatically',
    duration: 28,
    dialogue: [
      { speaker: 'Customer', text: "Hello, I need to speak with a business attorney regarding a partnership contract dispute.", time: 0 },
      { speaker: 'BerinAgent', text: "Thank you for reaching out to Sterling Law. We specialize in commercial litigation. Is the dispute currently based in Texas?", time: 6 },
      { speaker: 'Customer', text: "Yes, here in Dallas.", time: 13 },
      { speaker: 'BerinAgent', text: "Understood. Managing partner Evans has an initial consultation slot open tomorrow at 1:00 PM via Zoom or phone. Would that work?", time: 16 },
      { speaker: 'Customer', text: "Tomorrow at 1:00 PM works perfectly.", time: 23 },
      { speaker: 'BerinAgent', text: "Great. I have your name and email on file. I've sent you the meeting confirmation and preliminary case intake questionnaire.", time: 25 },
    ]
  }
]

export default function AudioDemoSection() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('hvac')
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0]

  const handleSelectScenario = (id: string) => {
    setActiveScenarioId(id)
    setIsPlaying(false)
    setCurrentTime(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= activeScenario.duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, activeScenario.duration])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const resetPlay = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remaining = secs % 60
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`
  }

  return (
    <section id="voice-demos" className="py-20 md:py-28 bg-[#f0ede6] border-y border-[#e6e2d6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Interactive Call Simulation
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            See How It Handles Real Customer Calls
          </h2>
          <p className="text-sm sm:text-base text-[#66635e]">
            Follow how BerinAgents speaks with natural tone, handles interruptions, and locks in paying appointments without sounding robotic.
          </p>
        </div>

        {/* Industry Scenario Switcher */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 max-w-4xl mx-auto mb-8">
          {scenarios.map(s => {
            const isActive = s.id === activeScenarioId
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => handleSelectScenario(s.id)}
                className={`p-3.5 rounded-sm text-left transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-[#1a1918] text-[#f6f4f0] border-[#1a1918] shadow-md'
                    : 'bg-[#ffffff] text-[#55524d] border-[#e2dfd8] hover:border-[#1a1918]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#9e4733]' : 'text-[#85817a]'}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                    {s.businessType.split('&')[0]}
                  </span>
                </div>
                <div className="font-medium text-xs leading-snug line-clamp-2">
                  {s.title}
                </div>
              </button>
            )
          })}
        </div>

        {/* Main Audio Player Card */}
        <div className="max-w-4xl mx-auto bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          
          {/* Situation & Outcome Bar */}
          <div className="bg-[#faf9f7] border-b border-[#e6e2d6] p-5 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#1a1918] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#9e4733]" />
                <span>The Situation:</span>
                <span className="text-[#615e58] font-normal">{activeScenario.callerSituation}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-sm text-xs text-emerald-900 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{activeScenario.businessOutcome}</span>
            </div>
          </div>

          {/* Player Controls & Visualizer */}
          <div className="p-6 sm:p-8 space-y-6">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#faf9f7] p-4 rounded-sm border border-[#e6e2d6]">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-sm bg-[#1a1918] hover:bg-[#2d2d2d] text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-sm"
                  aria-label={isPlaying ? 'Pause call simulation' : 'Play call simulation'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current text-[#9e4733]" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={resetPlay}
                  className="p-2.5 rounded-sm hover:bg-[#edeae4] text-[#73706b] hover:text-[#1a1918] transition-colors cursor-pointer"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">
                    {isPlaying ? 'Simulation in Progress' : 'Ready to Simulate'}
                  </div>
                  <div className="text-xs font-mono text-[#73706b]">
                    {formatTime(currentTime)} / {formatTime(activeScenario.duration)}
                  </div>
                </div>
              </div>

              {/* Dynamic Soundwave Bars */}
              <div className="flex items-center gap-1 h-8 px-4 w-full sm:w-64 justify-center sm:justify-end">
                {[12, 28, 16, 32, 20, 10, 26, 18, 30, 14, 22, 10, 24, 16, 28, 12, 20, 30].map((h, i) => {
                  const animatedHeight = isPlaying 
                    ? Math.min(32, Math.max(6, Math.floor(h * ((i % 3 + 1) * 0.45) * ((currentTime % 2 === 0) ? 1.2 : 0.8))))
                    : 6
                  return (
                    <div
                      key={i}
                      style={{ height: `${animatedHeight}px` }}
                      className={`w-1 rounded-full transition-all duration-200 ${
                        isPlaying
                          ? i % 4 === 0 ? 'bg-[#9e4733]' : 'bg-[#1a1918]'
                          : 'bg-[#d8d3c5]'
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {/* Scrubber Bar */}
            <div className="w-full bg-[#edeae4] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#1a1918] h-full transition-all duration-300"
                style={{ width: `${(currentTime / activeScenario.duration) * 100}%` }}
              />
            </div>

            {/* Synchronized Call Conversation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#73706b]">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-[#1a1918]">
                  Live Call Dialogue
                </span>
                <span className="text-[11px] text-[#9e4733] font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Auto-books into your schedule
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2 border border-[#e6e2d6] rounded-sm p-4 bg-[#faf9f7]/40">
                {activeScenario.dialogue.map((item, idx) => {
                  const isCurrent = currentTime >= item.time && (idx === activeScenario.dialogue.length - 1 || currentTime < activeScenario.dialogue[idx + 1].time)
                  const isPast = currentTime > item.time
                  const isAgent = item.speaker === 'BerinAgent'

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-sm text-xs transition-all duration-300 ${
                        isCurrent && isPlaying
                          ? 'bg-[#ffffff] border-l-4 border-[#9e4733] shadow-xs'
                          : isPast
                          ? 'opacity-85'
                          : 'opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold tracking-wider uppercase text-[10px] ${
                          isAgent ? 'text-[#9e4733]' : 'text-[#1a1918]'
                        }`}>
                          {item.speaker === 'BerinAgent' ? '✦ Your AI Receptionist' : 'Customer (Caller)'}
                        </span>
                        <span className="text-[10px] font-mono text-[#85817a]">
                          {formatTime(item.time)}
                        </span>
                      </div>
                      <p className="text-[#202020] text-sm leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
