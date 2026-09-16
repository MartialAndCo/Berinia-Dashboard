'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'

export interface RetentionDataPoint {
  second: number
  label: string
  rateA: number
  rateB: number
  countA: number
  countB: number
}

interface VslRetentionChartProps {
  data: RetentionDataPoint[]
  variantAName?: string
  variantBName?: string
  abTestingEnabled?: boolean
}

export default function VslRetentionChart({
  data,
  variantAName = 'Variante A (Hook ROI)',
  variantBName = 'Variante B (Hook Douleur)',
  abTestingEnabled = false,
}: VslRetentionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full min-h-[280px] flex items-center justify-center text-xs text-[#73706b]">
        Pas encore assez de données de visionnage pour tracer la courbe.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload as RetentionDataPoint
      return (
        <div className="bg-white p-3 border border-[#e6e2d6] rounded-md shadow-md text-xs space-y-1.5 min-w-[200px]">
          <p className="font-bold text-[#1a1918] border-b border-gray-100 pb-1">
            ⏱ {point.label}
          </p>
          <div className="flex items-center justify-between text-blue-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              {variantAName} :
            </span>
            <span className="font-bold">{point.rateA}% ({point.countA})</span>
          </div>
          {abTestingEnabled && (
            <div className="flex items-center justify-between text-emerald-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                {variantBName} :
              </span>
              <span className="font-bold">{point.rateB}% ({point.countB})</span>
            </div>
          )}
          {abTestingEnabled && point.rateA > 0 && point.rateB > 0 && (
            <div className="text-[11px] pt-1 text-gray-500 border-t border-gray-100 flex justify-between">
              <span>Écart :</span>
              <span className={point.rateB >= point.rateA ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>
                {point.rateB >= point.rateA ? `+${(point.rateB - point.rateA).toFixed(1)}% B` : `+${(point.rateA - point.rateB).toFixed(1)}% A`}
              </span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede6" />
          <XAxis
            dataKey="label"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e6e2d6' }}
            stroke="#73706b"
          />
          <YAxis
            unit="%"
            domain={[0, 100]}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e6e2d6' }}
            stroke="#73706b"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
          />

          {/* Key VSL timeline reference markers */}
          <ReferenceLine
            x="0:45 (Hook End)"
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: 'Fin Hook', position: 'top', fill: '#d97706', fontSize: 10 }}
          />
          <ReferenceLine
            x="4:30 (Midpoint CTA)"
            stroke="#ec4899"
            strokeDasharray="3 3"
            label={{ value: 'Mid CTA', position: 'top', fill: '#db2777', fontSize: 10 }}
          />
          <ReferenceLine
            x="9:00 (Main Pitch)"
            stroke="#8b5cf6"
            strokeDasharray="3 3"
            label={{ value: 'Pitch', position: 'top', fill: '#7c3aed', fontSize: 10 }}
          />

          <Area
            type="monotone"
            dataKey="rateA"
            name={variantAName}
            stroke="#2563eb"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorA)"
          />
          {abTestingEnabled && (
            <Area
              type="monotone"
              dataKey="rateB"
              name={variantBName}
              stroke="#059669"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorB)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
