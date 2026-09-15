'use client'

import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts'

export interface CallsBarChartProps {
  data: { date: string; calls: number }[]
  name?: string
  emptyMessage?: string
  allowDecimals?: boolean
}

export default function CallsBarChart({
  data,
  name = 'Calls',
  emptyMessage = 'Not enough data to display the chart.',
  allowDecimals = true,
}: CallsBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[#73706b] text-xs">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e2d6" />
        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} stroke="#73706b" />
        <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#73706b" allowDecimals={allowDecimals} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e6e2d6',
            borderRadius: '2px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="calls" name={name} fill="#1a1918" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
