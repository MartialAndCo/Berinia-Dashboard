import { Loader2 } from 'lucide-react'

interface PageLoadingProps {
  message?: string
  className?: string
}

export default function PageLoading({ 
  message = "Loading...", 
  className = "p-8 flex items-center justify-center min-h-[400px] w-full" 
}: PageLoadingProps) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-3 text-[#73706b]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9e4733]" />
        <span className="text-xs uppercase tracking-wider font-semibold">{message}</span>
      </div>
    </div>
  )
}
