import { PhoneCall, CalendarCheck, MessageSquareText, PhoneForwarded, HelpCircle, UserCheck } from 'lucide-react'

const features = [
  {
    icon: PhoneCall,
    tag: '24/7 Answering',
    title: 'Never Goes to Voicemail',
    description:
      'Picks up on the first ring, 24 hours a day, 7 days a week. Whether you are on a job site, in a client meeting, or asleep, your business never closes.',
  },
  {
    icon: CalendarCheck,
    tag: 'Automated Booking',
    title: 'Books Straight Into Your Calendar',
    description:
      'Checks your live schedule in Google Calendar, Outlook, or your CRM. It finds an open slot, reserves the job, and eliminates scheduling back-and-forth.',
  },
  {
    icon: MessageSquareText,
    tag: 'Instant Notifications',
    title: 'SMS & Email Recaps in Seconds',
    description:
      'The moment a call concludes, you get a clean text summary with the caller’s name, phone number, address, and the exact reason for the call.',
  },
  {
    icon: PhoneForwarded,
    tag: 'Zero Hassle',
    title: 'Keep Your Existing Phone Number',
    description:
      'No complicated phone setup or hardware required. Simply turn on call forwarding when you are busy, on another line, or closed for the day.',
  },
  {
    icon: HelpCircle,
    tag: 'Business Knowledge',
    title: 'Answers Common Questions Accurately',
    description:
      'Trained on your specific services, pricing guidelines, service territory, and business hours. Speaks politely and professionally every single time.',
  },
  {
    icon: UserCheck,
    tag: 'Emergency Protocol',
    title: 'Warm Transfers for Urgent Calls',
    description:
      'When an important client or true emergency calls, the agent immediately patches the call straight to your personal cell phone with a quick verbal heads-up.',
  },
]

export default function FeatureGrid() {
  return (
    <section id="why-us" className="py-20 md:py-28 bg-[#f6f4f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Built for Busy Business Owners
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Everything You Need to Run Your Phones on Autopilot
          </h2>
          <p className="text-sm sm:text-base text-[#66635e]">
            Designed specifically for home service contractors, healthcare clinics, real estate teams, and professional service firms.
          </p>
        </div>

        {/* 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-7 sm:p-8 space-y-4 hover:border-[#1a1918] transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-sm bg-[#faf9f7] border border-[#e2dfd8] flex items-center justify-center text-[#1a1918]">
                      <Icon className="w-5 h-5 text-[#1a1918]" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9e4733] bg-[#fdf2f0] px-2.5 py-1 rounded-xs">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-[#1a1918]">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-[#66635e] leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#f0ede6] flex items-center text-[11px] font-semibold uppercase tracking-wider text-[#85817a]">
                  <span>Always On</span>
                  <span className="ml-auto text-[#9e4733]">•</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
