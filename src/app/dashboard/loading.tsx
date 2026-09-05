export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-3 w-28 bg-[#e6e2d6] rounded-sm" />
          <div className="h-8 w-64 bg-[#dfdbd2] rounded-sm" />
          <div className="h-4 w-80 bg-[#eae7df] rounded-sm" />
        </div>

        {/* Banner Skeleton */}
        <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center pb-3 border-b border-[#f0ece4]">
            <div className="h-3 w-24 bg-[#e6e2d6] rounded-sm" />
            <div className="h-4 w-32 bg-[#dfdbd2] rounded-sm" />
          </div>
          <div className="flex justify-between items-center pt-1">
            <div className="space-y-1.5">
              <div className="h-2.5 w-28 bg-[#e6e2d6] rounded-sm" />
              <div className="h-4 w-48 bg-[#eae7df] rounded-sm" />
            </div>
            <div className="h-9 w-28 bg-[#e6e2d6] rounded-sm" />
          </div>
        </div>

        {/* 3 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-3 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center">
                <div className="h-2.5 w-24 bg-[#e6e2d6] rounded-sm" />
                <div className="h-4 w-4 bg-[#e6e2d6] rounded-sm" />
              </div>
              <div className="h-8 w-28 bg-[#dfdbd2] rounded-sm" />
              <div className="h-3 w-36 bg-[#eae7df] rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
