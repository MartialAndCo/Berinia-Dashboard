"use client";

interface CaseStudy {
  title: string;
  description: string;
  stats: {
    label1: string;
    val1: string;
    label2: string;
    val2: string;
    label3: string;
    val3: string;
    label4: string;
    val4: string;
  };
  chartColor: string;
}

export default function TrackRecordSection() {
  const caseStudies: CaseStudy[] = [
    {
      title: "+$140K Recovered For Apex Health",
      description:
        "Eliminated missed evening calls, capturing 130+ high-value appointments per month on complete autopilot.",
      stats: {
        label1: "Answer Rate",
        val1: "100%",
        label2: "Booking ROAS",
        val2: "448%",
        label3: "Avg Pickup",
        val3: "0.8s",
        label4: "Added Profit",
        val4: "$140K",
      },
      chartColor: "#2563eb",
    },
    {
      title: "+$180K Booked For Helix Clinic",
      description:
        "Eliminated busy-line bottlenecks, handling 16,000+ patient inquiries with zero hold times and filling their provider calendars.",
      stats: {
        label1: "Calls Answered",
        val1: "16.3K",
        label2: "ROI Return",
        val2: "818%",
        label3: "Resolution",
        val3: "99.2%",
        label4: "New Cash",
        val4: "$180K",
      },
      chartColor: "#ea580c",
    },
    {
      title: "$295K Booked For Little Black Tux",
      description:
        "Turned after-hours and weekend callers into $250k in pure profit without hiring a single employee.",
      stats: {
        label1: "Bookings",
        val1: "2,950",
        label2: "Close Rate",
        val2: "94.2%",
        label3: "Cost / Booking",
        val3: "$3.80",
        label4: "Pipeline",
        val4: "$295K",
      },
      chartColor: "#059669",
    },
  ];

  return (
    <section className="w-full py-14">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-blue-600 font-semibold text-sm tracking-wide uppercase">
            Our Track Record
          </span>
          <h2 className="text-gray-900 text-3xl md:text-4xl font-extrabold tracking-tight mt-2 leading-tight">
            Millions In Recovered Revenue By Answering 100% Of Calls
          </h2>
          <p className="text-gray-600 text-base mt-2">
            Real dollar results generated for real businesses:
          </p>
        </div>

        {/* 3 Case Study Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {caseStudies.map((study, idx) => (
            <div
              key={idx}
              className="bg-[#f8f9fa] rounded-2xl overflow-hidden border border-gray-200/70 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              {/* Top Dashboard Graphic Mockup */}
              <div className="bg-white border-b border-gray-200/60 p-4">
                {/* Metric pill row */}
                <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                  <div className="bg-blue-600 text-white rounded p-1.5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-semibold opacity-90 leading-tight">
                      {study.stats.label1}
                    </span>
                    <span className="text-xs md:text-sm font-bold mt-0.5">
                      {study.stats.val1}
                    </span>
                  </div>
                  <div className="bg-red-500 text-white rounded p-1.5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-semibold opacity-90 leading-tight">
                      {study.stats.label2}
                    </span>
                    <span className="text-xs md:text-sm font-bold mt-0.5">
                      {study.stats.val2}
                    </span>
                  </div>
                  <div className="bg-amber-500 text-white rounded p-1.5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-semibold opacity-90 leading-tight">
                      {study.stats.label3}
                    </span>
                    <span className="text-xs md:text-sm font-bold mt-0.5">
                      {study.stats.val3}
                    </span>
                  </div>
                  <div className="bg-emerald-600 text-white rounded p-1.5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-semibold opacity-90 leading-tight">
                      {study.stats.label4}
                    </span>
                    <span className="text-xs md:text-sm font-bold mt-0.5">
                      {study.stats.val4}
                    </span>
                  </div>
                </div>

                {/* SVG Mini Line Chart */}
                <div className="h-24 w-full pt-2 flex items-end">
                  <svg
                    viewBox="0 0 300 80"
                    className="w-full h-full overflow-visible"
                  >
                    <polyline
                      fill="none"
                      stroke={study.chartColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={
                        idx === 0
                          ? "0,70 40,65 80,50 120,55 160,35 200,40 240,20 280,15 300,10"
                          : idx === 1
                          ? "0,75 30,70 60,30 90,65 120,20 150,55 180,25 210,45 240,15 270,30 300,10"
                          : "0,75 50,75 100,70 150,65 180,60 210,25 250,20 280,30 300,15"
                      }
                    />
                    <polyline
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      points="0,75 300,75"
                    />
                  </svg>
                </div>
              </div>

              {/* Bottom Card Content */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-gray-900 font-bold text-lg leading-snug mb-2">
                  {study.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {study.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
