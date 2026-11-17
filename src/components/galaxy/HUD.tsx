'use client'

import { useEffect, useState } from 'react'
import { Plus, ListFilter, Calendar } from 'lucide-react'
import { getCircadianCosmicTheme } from '@/lib/spaceAtmosphere'

interface HUDProps {
  onAddNode: () => void
  onShowList: () => void
}

interface DateInfo {
  day: string
  month: string
  year: number
  weekday: string
  fullDate: string
  dayOfWeekIndex: number
  weekDays: string[]
}

export default function HUD({ onAddNode, onShowList }: HUDProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [themeName, setThemeName] = useState('Cosmic Void')
  const [dateInfo, setDateInfo] = useState<DateInfo>({
    day: '17',
    month: 'NOV',
    year: 2026,
    weekday: 'TUESDAY',
    fullDate: 'November 17, 2026',
    dayOfWeekIndex: 2,
    weekDays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  })

  useEffect(() => {
    const theme = getCircadianCosmicTheme()
    setThemeName(theme.name)

    const now = new Date()
    const d = now.getDate()
    const m = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    const y = now.getFullYear()
    const w = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
    const full = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const dayIdx = now.getDay()

    setDateInfo({
      day: d < 10 ? `0${d}` : `${d}`,
      month: m,
      year: y,
      weekday: w,
      fullDate: full,
      dayOfWeekIndex: dayIdx,
      weekDays: days,
    })
  }, [])

  const { day, month, year, weekday, fullDate, dayOfWeekIndex, weekDays } = dateInfo

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent select-none">
      {/* ── LEFT: Pure Minimal Atmosphere Indicator ── */}
      <div className="flex items-center gap-2 pointer-events-auto opacity-40 hover:opacity-100 transition-opacity">
        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
        <span className="text-[10px] tracking-[0.22em] font-mono uppercase text-white/60 select-none">
          ✦ {themeName}
        </span>
      </div>

      {/* ── CENTER: Sleek Date Capsule (Only Day/Month/Year, reveals details on hover) ── */}
      <div
        className="pointer-events-auto flex flex-col items-center cursor-default select-none group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/[0.1] bg-black/70 hover:bg-black/90 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-white/25">
          <Calendar size={12} className="text-white/40 group-hover:text-white transition-colors" />

          {/* Pure Day · Month · Year */}
          <span className="text-sm font-bold text-white tracking-wider font-mono">
            {day}
          </span>
          <span className="text-white/20 text-xs">•</span>
          <span className="text-xs font-semibold text-white/80 tracking-widest uppercase">
            {month}
          </span>
          <span className="text-white/20 text-xs">•</span>
          <span className="text-xs font-mono text-white/50 tracking-wider">
            {year}
          </span>
        </div>

        {/* Revealed details only on mouse hover */}
        <div
          className={`flex flex-col items-center overflow-hidden transition-all duration-300 ease-out ${
            isHovered ? 'max-h-16 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 px-3 py-1 rounded-full border border-white/[0.06] bg-black/80 backdrop-blur-md text-[10px] font-mono text-white/60">
            <span className="text-white font-bold tracking-wider">{weekday}</span>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5">
              {weekDays.map((wd, i) => (
                <span
                  key={wd}
                  className={`text-[9px] px-1 rounded ${
                    i === dayOfWeekIndex ? 'text-white font-bold bg-white/20' : 'text-white/30'
                  }`}
                >
                  {wd[0]}
                </span>
              ))}
            </div>
            <span className="text-white/20">|</span>
            <span className="text-white/70 tracking-wider">{themeName}</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Skills and Add Node (+) Buttons ── */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        <button
          onClick={onShowList}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium text-white/60 hover:text-white border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <ListFilter size={12} />
          <span className="tracking-wider text-[10px] uppercase font-semibold">Skills</span>
        </button>

        <button
          onClick={onAddNode}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-black bg-white hover:bg-white/90 active:scale-95 transition-all cursor-pointer shadow-[0_0_18px_rgba(255,255,255,0.2)] hover:shadow-[0_0_24px_rgba(255,255,255,0.35)]"
        >
          <Plus size={13} className="stroke-[2.5]" />
          <span className="tracking-wider text-[10px] uppercase font-bold">Add Node</span>
        </button>
      </div>
    </header>
  )
}
