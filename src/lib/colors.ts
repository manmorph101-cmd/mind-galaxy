// ═══════════════════════════════════════════════════════════════
// CELESTIAL COLOR SYSTEM — 20 Rich Cosmic Colors with Light-to-Dark Gradients
// Pure English Palette with Volumetric Depth (Light Core to Deep Cosmic Rim)
// ═══════════════════════════════════════════════════════════════

export interface CelestialColor {
  id: string
  name: string
  descriptor: string
  category: 'cyan' | 'blue' | 'purple' | 'pink' | 'red' | 'amber' | 'emerald' | 'teal' | 'silver'
  hex: string       // Pure vibrant core
  light: string     // Luminous radiant tint (Light core)
  deep: string      // Deep saturated shade (Deep rim)
  gradient: string  // CSS gradient preview
  arabicName?: string // Deprecated alias for backwards-compatibility
}

export const CELESTIAL_COLORS: CelestialColor[] = [
  // ── CYANS & ASTRAL BLUES ──
  {
    id: 'cyan-nova',
    name: 'Cyan Nova',
    descriptor: 'Electric Neon',
    category: 'cyan',
    hex: '#00f0ff',
    light: '#a5f9ff',
    deep: '#007088',
    gradient: 'linear-gradient(135deg, #a5f9ff 0%, #00f0ff 50%, #007088 100%)',
  },
  {
    id: 'astral-sky',
    name: 'Astral Sky',
    descriptor: 'Cosmic Blue',
    category: 'blue',
    hex: '#38bdf8',
    light: '#bae6fd',
    deep: '#0284c7',
    gradient: 'linear-gradient(135deg, #bae6fd 0%, #38bdf8 50%, #0284c7 100%)',
  },
  {
    id: 'deep-cobalt',
    name: 'Deep Cobalt',
    descriptor: 'Stellar Cobalt',
    category: 'blue',
    hex: '#3b82f6',
    light: '#93c5fd',
    deep: '#1d4ed8',
    gradient: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
  },
  {
    id: 'cosmic-indigo',
    name: 'Cosmic Indigo',
    descriptor: 'Astral Indigo',
    category: 'blue',
    hex: '#6366f1',
    light: '#c7d2fe',
    deep: '#3730a3',
    gradient: 'linear-gradient(135deg, #c7d2fe 0%, #6366f1 50%, #3730a3 100%)',
  },

  // ── PURPLES & VIOLETS ──
  {
    id: 'nebula-violet',
    name: 'Nebula Violet',
    descriptor: 'Nebula Glow',
    category: 'purple',
    hex: '#8b5cf6',
    light: '#ddd6fe',
    deep: '#5b21b6',
    gradient: 'linear-gradient(135deg, #ddd6fe 0%, #8b5cf6 50%, #5b21b6 100%)',
  },
  {
    id: 'amethyst-flare',
    name: 'Amethyst Flare',
    descriptor: 'Deep Amethyst',
    category: 'purple',
    hex: '#a855f7',
    light: '#f3e8ff',
    deep: '#6b21a8',
    gradient: 'linear-gradient(135deg, #f3e8ff 0%, #a855f7 50%, #6b21a8 100%)',
  },
  {
    id: 'royal-orchid',
    name: 'Royal Orchid',
    descriptor: 'Royal Orchid',
    category: 'purple',
    hex: '#c084fc',
    light: '#fae8ff',
    deep: '#86198f',
    gradient: 'linear-gradient(135deg, #fae8ff 0%, #c084fc 50%, #86198f 100%)',
  },
  {
    id: 'ultra-violet',
    name: 'Ultra Violet',
    descriptor: 'Hyper Violet',
    category: 'purple',
    hex: '#7c3aed',
    light: '#c4b5fd',
    deep: '#4c1d95',
    gradient: 'linear-gradient(135deg, #c4b5fd 0%, #7c3aed 50%, #4c1d95 100%)',
  },

  // ── PINKS & ROSES ──
  {
    id: 'magenta-pulsar',
    name: 'Magenta Pulsar',
    descriptor: 'Vivid Magenta',
    category: 'pink',
    hex: '#ec4899',
    light: '#fbcfe8',
    deep: '#9d174d',
    gradient: 'linear-gradient(135deg, #fbcfe8 0%, #ec4899 50%, #9d174d 100%)',
  },
  {
    id: 'rose-aurora',
    name: 'Rose Aurora',
    descriptor: 'Aurora Rose',
    category: 'pink',
    hex: '#f43f5e',
    light: '#fecdd3',
    deep: '#9f1239',
    gradient: 'linear-gradient(135deg, #fecdd3 0%, #f43f5e 50%, #9f1239 100%)',
  },

  // ── CRIMSONS & SUPERNOVA REDS ──
  {
    id: 'crimson-supernova',
    name: 'Crimson Supernova',
    descriptor: 'Ruby Flare',
    category: 'red',
    hex: '#ef4444',
    light: '#fca5a5',
    deep: '#991b1b',
    gradient: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 50%, #991b1b 100%)',
  },
  {
    id: 'plasma-peach',
    name: 'Plasma Peach',
    descriptor: 'Plasma Flare',
    category: 'red',
    hex: '#fb923c',
    light: '#ffedd5',
    deep: '#9a3412',
    gradient: 'linear-gradient(135deg, #ffedd5 0%, #fb923c 50%, #9a3412 100%)',
  },

  // ── AMBERS & SOLAR GOLDS ──
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    descriptor: 'Solar Corona',
    category: 'amber',
    hex: '#f97316',
    light: '#fed7aa',
    deep: '#c2410c',
    gradient: 'linear-gradient(135deg, #fed7aa 0%, #f97316 50%, #c2410c 100%)',
  },
  {
    id: 'stellar-gold',
    name: 'Stellar Gold',
    descriptor: 'Pure Gold',
    category: 'amber',
    hex: '#eab308',
    light: '#fef08a',
    deep: '#854d0e',
    gradient: 'linear-gradient(135deg, #fef08a 0%, #eab308 50%, #854d0e 100%)',
  },

  // ── EMERALDS & GREENS ──
  {
    id: 'cyber-lime',
    name: 'Cyber Lime',
    descriptor: 'Cyber Lime',
    category: 'emerald',
    hex: '#84cc16',
    light: '#d9f99d',
    deep: '#3f6212',
    gradient: 'linear-gradient(135deg, #d9f99d 0%, #84cc16 50%, #3f6212 100%)',
  },
  {
    id: 'emerald-flare',
    name: 'Emerald Flare',
    descriptor: 'Electric Emerald',
    category: 'emerald',
    hex: '#22c55e',
    light: '#86efac',
    deep: '#14532d',
    gradient: 'linear-gradient(135deg, #86efac 0%, #22c55e 50%, #14532d 100%)',
  },
  {
    id: 'jade-horizon',
    name: 'Jade Horizon',
    descriptor: 'Jade Mint',
    category: 'emerald',
    hex: '#10b981',
    light: '#a7f3d0',
    deep: '#064e3b',
    gradient: 'linear-gradient(135deg, #a7f3d0 0%, #10b981 50%, #064e3b 100%)',
  },

  // ── TEALS & AQUAS ──
  {
    id: 'aurora-teal',
    name: 'Aurora Teal',
    descriptor: 'Polar Teal',
    category: 'teal',
    hex: '#14b8a6',
    light: '#99f6e4',
    deep: '#134e4a',
    gradient: 'linear-gradient(135deg, #99f6e4 0%, #14b8a6 50%, #134e4a 100%)',
  },
  {
    id: 'celestial-aqua',
    name: 'Celestial Aqua',
    descriptor: 'Aquamarine',
    category: 'teal',
    hex: '#06b6d4',
    light: '#a5f3fc',
    deep: '#164e63',
    gradient: 'linear-gradient(135deg, #a5f3fc 0%, #06b6d4 50%, #164e63 100%)',
  },

  // ── DIAMOND / SUPERNOVA SILVER ──
  {
    id: 'diamond-supernova',
    name: 'Diamond Supernova',
    descriptor: 'Pure Diamond',
    category: 'silver',
    hex: '#f8fafc',
    light: '#ffffff',
    deep: '#64748b',
    gradient: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #475569 100%)',
  },
]

// Fast lookup by hex or id
export function getCelestialColor(colorHexOrId: string): CelestialColor {
  const norm = colorHexOrId.toLowerCase().trim()
  const found = CELESTIAL_COLORS.find(
    c => c.hex.toLowerCase() === norm || c.id.toLowerCase() === norm
  )
  if (found) return found

  // Fallback: derive procedural light & deep tones if custom hex was passed
  return {
    id: 'custom-' + norm.replace('#', ''),
    name: 'Celestial Glow',
    descriptor: 'Custom Hue',
    category: 'cyan',
    hex: colorHexOrId,
    light: lightenHex(colorHexOrId, 0.4),
    deep: darkenHex(colorHexOrId, 0.4),
    gradient: `linear-gradient(135deg, ${lightenHex(colorHexOrId, 0.4)} 0%, ${colorHexOrId} 50%, ${darkenHex(colorHexOrId, 0.4)} 100%)`,
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function lightenHex(hex: string, amount: number): string {
  try {
    const { r, g, b } = hexToRgb(hex)
    const lr = Math.min(255, Math.round(r + (255 - r) * amount))
    const lg = Math.min(255, Math.round(g + (255 - g) * amount))
    const lb = Math.min(255, Math.round(b + (255 - b) * amount))
    return `#${((1 << 24) + (lr << 16) + (lg << 8) + lb).toString(16).slice(1)}`
  } catch {
    return '#ffffff'
  }
}

export function darkenHex(hex: string, amount: number): string {
  try {
    const { r, g, b } = hexToRgb(hex)
    const dr = Math.max(0, Math.round(r * (1 - amount)))
    const dg = Math.max(0, Math.round(g * (1 - amount)))
    const db = Math.max(0, Math.round(b * (1 - amount)))
    return `#${((1 << 24) + (dr << 16) + (dg << 8) + db).toString(16).slice(1)}`
  } catch {
    return '#000000'
  }
}
