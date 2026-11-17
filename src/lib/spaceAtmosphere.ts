'use client'

import * as THREE from 'three'

/**
 * ══════════════════════════════════════════════════════════════════════════
 * COSMIC ATMOSPHERE & CELESTIAL PHENOMENA
 * 1. Time-of-Day Circadian Atmosphere (Serene shift across 24h cycle)
 * 2. Distant Shooting Stars / Meteors passing across camera view ("الشهب")
 * 3. Weightless Floating Cosmic Stardust (Parallax depth motes)
 * 4. Ethereal Deep-Space Nebulae (Soft, non-intrusive cosmic breathing)
 * ══════════════════════════════════════════════════════════════════════════
 */

export interface CircadianTheme {
  name: string
  phase: 'dawn' | 'zenith' | 'twilight' | 'midnight'
  horizonColor: THREE.Color
  nebulaTint: THREE.Color
  dustColor: THREE.Color
  starTwinkleSpeed: number
}

// ── 1. CIRCADIAN TIME SHIFT ──
export function getCircadianCosmicTheme(): CircadianTheme {
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60

  if (hour >= 5 && hour < 11) {
    // 05:00 - 11:00: Dawn Aurora (Fresh cyan starlight)
    return {
      name: 'Dawn Aurora',
      phase: 'dawn',
      horizonColor: new THREE.Color(0x000a0f),
      nebulaTint: new THREE.Color(0x00f0ff),
      dustColor: new THREE.Color(0x7ef9ff),
      starTwinkleSpeed: 0.7,
    }
  } else if (hour >= 11 && hour < 17) {
    // 11:00 - 17:00: Solar Zenith (Deep sapphire clarity)
    return {
      name: 'Solar Zenith',
      phase: 'zenith',
      horizonColor: new THREE.Color(0x010512),
      nebulaTint: new THREE.Color(0x38bdf8),
      dustColor: new THREE.Color(0xa5f3fc),
      starTwinkleSpeed: 0.6,
    }
  } else if (hour >= 17 && hour < 22) {
    // 17:00 - 22:00: Nebula Twilight (Gentle evening amethyst / rose)
    return {
      name: 'Nebula Twilight',
      phase: 'twilight',
      horizonColor: new THREE.Color(0x090208),
      nebulaTint: new THREE.Color(0xa855f7),
      dustColor: new THREE.Color(0xfbcfe8),
      starTwinkleSpeed: 0.75,
    }
  } else {
    // 22:00 - 05:00: Midnight Void (Deep nocturnal stillness)
    return {
      name: 'Midnight Void',
      phase: 'midnight',
      horizonColor: new THREE.Color(0x020205),
      nebulaTint: new THREE.Color(0x6366f1),
      dustColor: new THREE.Color(0xc7d2fe),
      starTwinkleSpeed: 0.85,
    }
  }
}

// ── 2. ETHEREAL DEEP-SPACE NEBULA CLOUDS ──
function createSoftNebulaTexture(color: THREE.Color): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const c = 256

  const grad = ctx.createRadialGradient(c, c, 0, c, c, c)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)

  grad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, 0.22)`)
  grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, 0.12)`)
  grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.04)`)
  grad.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, 0.01)`)
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function createDeepSpaceNebulae(nebulaTint: THREE.Color): THREE.Group {
  const group = new THREE.Group()
  const tex = createSoftNebulaTexture(nebulaTint)

  // 3 large, soft nebula clouds placed in extreme deep space (r ~ 1600 - 2400)
  const configs = [
    { pos: new THREE.Vector3(700, 300, -1800), scale: 2200, opacity: 0.055 },
    { pos: new THREE.Vector3(-900, -400, -1600), scale: 2600, opacity: 0.045 },
    { pos: new THREE.Vector3(200, -600, 1900), scale: 2400, opacity: 0.05 },
  ]

  configs.forEach(cfg => {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: cfg.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.position.copy(cfg.pos)
    sprite.scale.set(cfg.scale, cfg.scale, 1)
    group.add(sprite)
  })

  return group
}

// ── 3. FLOATING WEIGHTLESS COSMIC DUST MOTES (Parallax Stardust) ──
export function createCosmicDustParticles(dustColor: THREE.Color): {
  points: THREE.Points
  update: (t: number) => void
} {
  const COUNT = 480
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(COUNT * 3)
  const basePos = new Float32Array(COUNT * 3)
  const phases = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    // Distributed in a sphere of radius 380 around origin
    const r = 50 + Math.random() * 380
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 2 - 1)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta) * 0.7
    const z = r * Math.cos(phi)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    basePos[i * 3] = x
    basePos[i * 3 + 1] = y
    basePos[i * 3 + 2] = z

    phases[i] = Math.random() * Math.PI * 2
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  // Soft round particle texture
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)')
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const dustTex = new THREE.CanvasTexture(canvas)

  const mat = new THREE.PointsMaterial({
    map: dustTex,
    color: dustColor,
    size: 3.2,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geo, mat)

  const update = (t: number) => {
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const pos = posAttr.array as Float32Array

    for (let i = 0; i < COUNT; i++) {
      const ph = phases[i]
      // Weightless Brownian drift
      pos[i * 3] = basePos[i * 3] + Math.sin(t * 0.25 + ph) * 8.0
      pos[i * 3 + 1] = basePos[i * 3 + 1] + Math.cos(t * 0.3 + ph * 1.3) * 6.0
      pos[i * 3 + 2] = basePos[i * 3 + 2] + Math.sin(t * 0.2 + ph * 0.7) * 8.0
    }
    posAttr.needsUpdate = true
  }

  return { points, update }
}

// ── 4. SHOOTING STARS / METEORS IN CAMERA VIEW (شهب تمر في الأفق البعيد) ──
const TRAIL_STEPS = 18

interface ShootingStar {
  active: boolean
  group: THREE.Group
  pos: THREE.Vector3
  velocity: THREE.Vector3
  history: THREE.Vector3[]
  age: number
  maxLife: number
  lineGeo: THREE.BufferGeometry
  lineMat: THREE.LineBasicMaterial
  headSprite: THREE.Sprite
}

export class ShootingStarManager {
  group = new THREE.Group()
  stars: ShootingStar[] = []
  timeSinceLastSpawn = 0
  nextSpawnDelay = 8.0 // First shooting star appears after ~8 seconds

  constructor() {
    // Pre-create high-definition spark texture for the shooting star head
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.18, 'rgba(235, 250, 255, 0.9)')
    grad.addColorStop(0.5, 'rgba(120, 220, 255, 0.35)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
    const sparkTex = new THREE.CanvasTexture(canvas)

    // Pool of 2 shooting stars (at most 1 active at a time)
    for (let s = 0; s < 2; s++) {
      const starGroup = new THREE.Group()
      starGroup.visible = false

      // Head Glow
      const headMat = new THREE.SpriteMaterial({
        map: sparkTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const headSprite = new THREE.Sprite(headMat)
      headSprite.scale.set(16, 16, 1)
      starGroup.add(headSprite)

      // Tapered Light Tail (Vertex colors from white-hot to black void)
      const lineGeo = new THREE.BufferGeometry()
      const posArray = new Float32Array(TRAIL_STEPS * 3)
      const colArray = new Float32Array(TRAIL_STEPS * 3)

      for (let i = 0; i < TRAIL_STEPS; i++) {
        // Linear fade factor: 1.0 at head (i=0) down to 0.0 at tail (i=TRAIL_STEPS-1)
        const factor = Math.pow(1.0 - i / (TRAIL_STEPS - 1), 2.2)
        colArray[i * 3] = factor
        colArray[i * 3 + 1] = factor * 0.98
        colArray[i * 3 + 2] = factor
      }

      lineGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
      lineGeo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const lineMesh = new THREE.Line(lineGeo, lineMat)
      starGroup.add(lineMesh)

      this.group.add(starGroup)

      this.stars.push({
        active: false,
        group: starGroup,
        pos: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        history: [],
        age: 0,
        maxLife: 1.0,
        lineGeo,
        lineMat,
        headSprite,
      })
    }
  }

  spawnInCameraView(camera: THREE.Camera) {
    const star = this.stars.find(s => !s.active)
    if (!star) return

    // 1. Get forward vector of camera
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)

    // Distance in deep space background (750 to 1100 units away from camera)
    const dist = 750 + Math.random() * 320
    const centerInView = camera.position.clone().add(forward.clone().multiplyScalar(dist))

    // Camera Up and Right vectors
    const up = camera.up.clone().normalize()
    const right = new THREE.Vector3().crossVectors(forward, up).normalize()

    // Pick start position in upper portion of the view
    const fromLeft = Math.random() > 0.5
    const spanX = (fromLeft ? -1 : 1) * (200 + Math.random() * 260)
    const spanY = 160 + Math.random() * 180

    const startPos = centerInView.clone()
      .add(right.clone().multiplyScalar(spanX))
      .add(up.clone().multiplyScalar(spanY))

    // Trajectory: diagonal streak across the FOV and slightly downward
    const dirX = fromLeft ? 1 : -1
    const dirY = -0.38 - Math.random() * 0.32
    const dirZ = (Math.random() - 0.5) * 0.25

    const moveDir = right.clone().multiplyScalar(dirX)
      .add(up.clone().multiplyScalar(dirY))
      .add(forward.clone().multiplyScalar(dirZ))
      .normalize()

    const speed = 720 + Math.random() * 280 // realistic fast cosmic streak

    star.pos.copy(startPos)
    star.velocity.copy(moveDir.multiplyScalar(speed))
    star.history = []
    for (let i = 0; i < TRAIL_STEPS; i++) {
      star.history.push(startPos.clone())
    }
    star.age = 0
    star.maxLife = 0.95 + Math.random() * 0.35 // Lasts ~1.0 to 1.3 seconds
    star.active = true
    star.group.visible = true
  }

  update(dt: number, camera: THREE.Camera) {
    this.timeSinceLastSpawn += dt

    // Check if time to spawn next shooting star (every 11 - 22 seconds)
    if (this.timeSinceLastSpawn >= this.nextSpawnDelay) {
      this.spawnInCameraView(camera)
      this.timeSinceLastSpawn = 0
      this.nextSpawnDelay = 11.0 + Math.random() * 12.0
    }

    // Update active stars
    this.stars.forEach(star => {
      if (!star.active) return

      star.age += dt
      if (star.age >= star.maxLife) {
        star.active = false
        star.group.visible = false
        return
      }

      // Move forward
      star.pos.addScaledVector(star.velocity, dt)

      // Update head sprite position
      star.headSprite.position.copy(star.pos)

      // Add to history
      star.history.unshift(star.pos.clone())
      if (star.history.length > TRAIL_STEPS) {
        star.history.pop()
      }

      // Update trail line buffer
      const posAttr = star.lineGeo.attributes.position as THREE.BufferAttribute
      const posArray = posAttr.array as Float32Array
      for (let i = 0; i < TRAIL_STEPS; i++) {
        const p = star.history[i] || star.pos
        posArray[i * 3] = p.x
        posArray[i * 3 + 1] = p.y
        posArray[i * 3 + 2] = p.z
      }
      posAttr.needsUpdate = true

      // Burnout fade out as age approaches maxLife
      const progress = star.age / star.maxLife
      const fade = progress > 0.65 ? 1.0 - (progress - 0.65) / 0.35 : 1.0
      star.lineMat.opacity = Math.max(0, fade * 0.95)
      star.headSprite.material.opacity = Math.max(0, fade * 0.9)
      const headScale = 16 * Math.max(0.3, fade)
      star.headSprite.scale.set(headScale, headScale, 1)
    })
  }

  dispose() {
    this.stars.forEach(star => {
      star.lineGeo.dispose()
      star.lineMat.dispose()
      star.headSprite.material.dispose()
    })
  }
}
