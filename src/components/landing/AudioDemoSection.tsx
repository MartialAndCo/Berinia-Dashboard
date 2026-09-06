'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, Sparkles, PhoneIncoming, Clock, Cpu } from 'lucide-react'

interface Scenario {
  id: string
  title: string
  category: string
  persona: string
  duration: number
  latency: string
  sentiment: 'Positive' | 'Neutral' | 'Urgent'
  toolExecuted: string
  description: string
  dialogue: {
    speaker: 'Caller' | 'BerinAgent'
    text: string
    time: number
  }[]
}

const scenarios: Scenario[] = [
  {
    id: 'support',
    title: 'Customer Care & Return Handling',
    category: 'E-Commerce & Retail',
    persona: 'Sarah (Support Specialist)',
    duration: 34,
    latency: '390ms',
    sentiment: 'Positive',
    toolExecuted: 'shopify_issue_return_label',
    description: 'Instant customer order lookup, empathy-driven problem solving, and automated return label dispatch.',
    dialogue: [
      { speaker: 'Caller', text: "Hi, I received my order yesterday but it's the wrong color. I need to exchange it before Friday.", time: 0 },
      { speaker: 'BerinAgent', text: "I'm so sorry about that mix-up! I can definitely help you get the right color expedited. May I have your order number or phone number?", time: 6 },
      { speaker: 'Caller', text: "Sure, the order number is B-R-8-8-4-1.", time: 13 },
      { speaker: 'BerinAgent', text: "Thank you. I found your order for the Wool Overcoat in Charcoal. I've initiated an immediate exchange for Midnight Navy and emailed a prepaid return label. Anything else I can assist you with?", time: 18 },
      { speaker: 'Caller', text: "That was so fast, thank you so much!", time: 27 },
      { speaker: 'BerinAgent', text: "You're very welcome! Have a wonderful rest of your day.", time: 30 },
    ]
  },
  {
    id: 'booking',
    title: 'Dental Clinic Appointment Booking',
    category: 'Healthcare & Clinics',
    persona: 'Elena (Reception Specialist)',
    duration: 38,
    latency: '410ms',
    sentiment: 'Positive',
    toolExecuted: 'calendar_book_appointment',
    description: 'Autonomous patient verification, real-time schedule conflict resolution, and calendar reservation.',
    dialogue: [
      { speaker: 'Caller', text: "Hello, I have a toothache and was wondering if Dr. Vance has any openings tomorrow afternoon?", time: 0 },
      { speaker: 'BerinAgent', text: "Hello! I'm sorry to hear you're experiencing pain. Let me check Dr. Vance's calendar right now... I have an opening tomorrow at 2:30 PM or 4:15 PM. Would either work for you?", time: 7 },
      { speaker: 'Caller', text: "2:30 PM is perfect.", time: 16 },
      { speaker: 'BerinAgent', text: "Wonderful. Are you a returning patient with our clinic?", time: 20 },
      { speaker: 'Caller', text: "Yes, Marcus Vance.", time: 24 },
      { speaker: 'BerinAgent', text: "Great, Marcus. You're booked for tomorrow, Wednesday at 2:30 PM with Dr. Vance. I've sent an SMS confirmation to your mobile. Please arrive 10 minutes early.", time: 27 },
    ]
  },
  {
    id: 'sales',
    title: 'B2B Lead Qualification & Routing',
    category: 'SaaS & Enterprise',
    persona: 'Alexander (Inbound AE)',
    duration: 32,
    latency: '360ms',
    sentiment: 'Positive',
    toolExecuted: 'hubspot_crm_create_deal',
    description: 'BANT qualification, firmographic data enrichment, and calendar invite synchronization.',
    dialogue: [
      { speaker: 'BerinAgent', text: "Thanks for calling BerinAgents enterprise desk. This is Alexander. How can I help your team today?", time: 0 },
      { speaker: 'Caller', text: "Hi Alexander, we're looking to automate roughly 5,000 inbound support calls per month for our logistics company.", time: 5 },
      { speaker: 'BerinAgent', text: "That's exactly what we specialize in. Are you currently using a specific telephony provider like Twilio, or looking for turnkey carrier numbers?", time: 13 },
      { speaker: 'Caller', text: "We already have Twilio SIP trunks set up.", time: 21 },
      { speaker: 'BerinAgent', text: "Excellent, our zero-latency SIP gateway connects in under 10 minutes. I can lock in a 20-minute architecture deep dive with our lead engineer tomorrow at 10 AM EST. Does that suit you?", time: 24 },
    ]
  },
  {
    id: 'dispatch',
    title: 'Emergency Dispatch & Warm Handoff',
    category: 'Logistics & Field Services',
    persona: 'David (Priority Dispatch)',
    duration: 30,
    latency: '420ms',
    sentiment: 'Urgent',
    toolExecuted: 'telephony_warm_transfer',
    description: 'High-urgency triage, sentiment de-escalation, and context-preserved transfer to on-call manager.',
    dialogue: [
      { speaker: 'Caller', text: "One of our refrigerated transit trucks broke down on Highway 10 and the cooling temperature is rising!", time: 0 },
      { speaker: 'BerinAgent', text: "I understand this is time-critical. I am alerting our roadside rapid response unit right now. What is your vehicle ID or license plate?", time: 6 },
      { speaker: 'Caller', text: "Truck number is TX-409, driver is Robert.", time: 14 },
      { speaker: 'BerinAgent', text: "Captured TX-409. I am patching you directly to Dispatch Supervisor Martinez with this incident brief attached. Connecting you in 3 seconds.", time: 18 },
      { speaker: 'Caller', text: "Thank you, stay on the line.", time: 26 },
    ]
  }
]

export default function AudioDemoSection() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('support')
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
    <section id="voice-demo" className="py-20 md:py-28 bg-[#f0ede6] border-y border-[#e6e2d6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Interactive Voice Showcase
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Experience Real-Time Conversational AI
          </h2>
          <p className="text-sm sm:text-base text-[#66635e]">
            Listen to live enterprise simulations with natural inflections, sub-500ms conversational turn-taking, and automated tool executions.
          </p>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
          {scenarios.map(s => {
            const isActive = s.id === activeScenarioId
            return (
              <button
                key={s.id}
                onClick={() => handleSelectScenario(s.id)}
                className={`px-4 py-2.5 rounded-sm text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#1a1918] text-[#f6f4f0] shadow-sm'
                    : 'bg-[#ffffff] text-[#55524d] border border-[#e2dfd8] hover:border-[#1a1918] hover:text-[#1a1918]'
                }`}
              >
                <span>{s.title.split(' ')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-xs ${isActive ? 'bg-[#9e4733] text-white' : 'bg-[#edeae4] text-[#73706b]'}`}>
                  {s.category.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Main Audio Player Card */}
        <div className="max-w-4xl mx-auto bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          
          {/* Player Header Bar */}
          <div className="bg-[#faf9f7] border-b border-[#e6e2d6] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#1a1918] text-white flex items-center justify-center">
                <PhoneIncoming className="w-4 h-4 text-[#9e4733]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1a1918]">
                  {activeScenario.title}
                </h3>
                <p className="text-xs text-[#73706b]">
                  {activeScenario.persona} &middot; {activeScenario.category}
                </p>
              </div>
            </div>

            {/* Live Telemetry Badges */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#f6f4f0] border border-[#e6e2d6] text-[11px] font-mono text-[#55524d]">
                <Clock className="w-3 h-3 text-[#9e4733]" />
                <span>Latency: {activeScenario.latency}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#fdf2f0] border border-[#f5c6cb] text-[11px] font-semibold text-[#9e4733]">
                <Sparkles className="w-3 h-3" />
                <span>{activeScenario.sentiment} Sentiment</span>
              </div>
            </div>
          </div>

          {/* Interactive Player Controls & Soundwave */}
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Playback Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#faf9f7] p-4 rounded-sm border border-[#e6e2d6]">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-sm bg-[#1a1918] hover:bg-[#2d2d2d] text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-sm"
                  aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
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
                    {isPlaying ? 'Call Active (Audio Simulated)' : 'Ready to Audition'}
                  </div>
                  <div className="text-xs font-mono text-[#73706b]">
                    {formatTime(currentTime)} / {formatTime(activeScenario.duration)}
                  </div>
                </div>
              </div>

              {/* Animated Waveform Bars */}
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

            {/* Progress Slider */}
            <div className="w-full bg-[#edeae4] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#1a1918] h-full transition-all duration-300"
                style={{ width: `${(currentTime / activeScenario.duration) * 100}%` }}
              />
            </div>

            {/* Live Synchronized Transcript */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#73706b]">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-[#1a1918]">
                  Live Synchronized Transcript
                </span>
                <span className="font-mono text-[11px] flex items-center gap-1 text-[#9e4733]">
                  <Cpu className="w-3 h-3" />
                  Tool: {activeScenario.toolExecuted}
                </span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 border border-[#e6e2d6] rounded-sm p-4 bg-[#faf9f7]/40">
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
                          ? 'opacity-80'
                          : 'opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold tracking-wider uppercase text-[10px] ${
                          isAgent ? 'text-[#9e4733]' : 'text-[#1a1918]'
                        }`}>
                          {item.speaker === 'BerinAgent' ? '✦ BerinAgent' : 'Caller'}
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

            {/* Action Tool Box Execution */}
            <div className="p-3.5 rounded-sm bg-[#faf9f7] border border-[#e6e2d6] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5c5852]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="font-semibold text-[#1a1918]">Zero-Delay Tool Calling:</span>
                <span>{activeScenario.description}</span>
              </div>
              <div className="font-mono text-[11px] text-[#73706b]">
                Retell / Twilio / Webhook Gateway
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
