'use client'

import * as THREE from 'three'

/**
 * ══════════════════════════════════════════════════════════════════════════
 * COSMIC BLACK HOLE & GRAVITATIONAL LENSING PHENOMENON (الثقب الأسود)
 * Inspired by relativistic physics and the iconic Interstellar Gargantua:
 * 1. Event Horizon (أفق الحدث الأسود الحالك)
 * 2. Photon Sphere (حلقة الفوتونات المتوهجة فائقة السطوع)
 * 3. Relativistic Accretion Disk (قرص التراكم البلازمي الدوار)
 * 4. Gravitational Lensing Halo (انحناء الضوء والزمكان حول الثقب)
 * 5. Relativistic Polar Jets (نفاثات الطاقة البلازمية القطبية)
 * 6. Gravitational Matter Infall Vortex (دوامة جسيمات المادة المنجذبة)
 * ══════════════════════════════════════════════════════════════════════════
 */

// Generate a high-definition 512x512 procedural plasma accretion texture
function createAccretionTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const c = 256

  const grad = ctx.createRadialGradient(c, c, 55, c, c, 256)
  // Photon boundary (White-hot singularity)
  grad.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)')
  grad.addColorStop(0.06, 'rgba(255, 240, 180, 0.98)')
  // Inner relativistic plasma (Golden amber & solar orange)
  grad.addColorStop(0.18, 'rgba(255, 170, 40, 0.92)')
  grad.addColorStop(0.36, 'rgba(255, 95, 15, 0.78)')
  // Outer accretion swirl (Deep magenta & cyan photon drag)
  grad.addColorStop(0.58, 'rgba(180, 40, 120, 0.45)')
  grad.addColorStop(0.78, 'rgba(75, 20, 140, 0.20)')
  grad.addColorStop(0.92, 'rgba(20, 10, 60, 0.06)')
  grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  // Add subtle swirl turbulence bands
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2
    const r1 = 65 + Math.random() * 160
    const r2 = r1 + 15 + Math.random() * 25
    ctx.strokeStyle = `rgba(255, 215, 120, ${0.08 + Math.random() * 0.12})`
    ctx.lineWidth = 2 + Math.random() * 4
    ctx.beginPath()
    ctx.arc(c, c, (r1 + r2) / 2, angle, angle + 0.9)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export interface BlackHoleInstance {
  group: THREE.Group
  update: (time: number, dt: number) => void
  position: THREE.Vector3
  radius: number
}

export function createCosmicBlackHole(position = new THREE.Vector3(320, -110, -320)): BlackHoleInstance {
  const group = new THREE.Group()
  group.position.copy(position)
  group.userData = { isBlackHole: true, label: 'Supermassive Singularity (الثقب الأسود)' }

  const HORIZON_RADIUS = 22.0
  const accretionTex = createAccretionTexture()

  // ── 1. EVENT HORIZON (أفق الحدث - PURE BLACK VOID) ──
  // A pitch-black sphere that absorbs 100% of light
  const horizonGeo = new THREE.SphereGeometry(HORIZON_RADIUS, 36, 36)
  const horizonMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    depthTest: true,
  })
  const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat)
  horizonMesh.name = 'eventHorizon'
  group.add(horizonMesh)

  // ── 2. PHOTON SPHERE (حلقة الفوتونات فائقة السطوع) ──
  // The boundary where photons orbit the black hole
  const photonRingGeo = new THREE.RingGeometry(HORIZON_RADIUS * 1.01, HORIZON_RADIUS * 1.08, 64)
  const photonRingMat = new THREE.MeshBasicMaterial({
    color: 0xfff3d6,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const photonRing = new THREE.Mesh(photonRingGeo, photonRingMat)
  photonRing.rotation.x = Math.PI / 2.2
  group.add(photonRing)

  // ── 3. MAIN ACCRETION DISK (قرص التراكم المتوهج - HORIZONTAL SWIRL) ──
  const diskGeo = new THREE.RingGeometry(HORIZON_RADIUS * 1.15, HORIZON_RADIUS * 4.6, 96, 8)
  const diskMat = new THREE.MeshBasicMaterial({
    map: accretionTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const accretionDisk = new THREE.Mesh(diskGeo, diskMat)
  accretionDisk.rotation.x = Math.PI / 2.4
  accretionDisk.rotation.y = -0.22
  group.add(accretionDisk)

  // ── 4. GRAVITATIONAL LENSING HALO (انحناء الضوء الفضائي - INTERSTELLAR STYLE) ──
  // The iconic warped light halo that arches vertically around the black hole
  const haloGeo = new THREE.RingGeometry(HORIZON_RADIUS * 1.25, HORIZON_RADIUS * 3.4, 80, 6)
  const haloMat = new THREE.MeshBasicMaterial({
    map: accretionTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const lensingHalo = new THREE.Mesh(haloGeo, haloMat)
  // Perpendicular arch over the event horizon
  lensingHalo.rotation.x = 0.28
  lensingHalo.rotation.y = Math.PI / 3.2
  group.add(lensingHalo)

  // ── 5. RELATIVISTIC POLAR JETS (نفاثات البلازما القطبية) ──
  // High-energy particle beams erupting from the poles
  const jetGeo = new THREE.CylinderGeometry(1.2, 16.0, 240, 24, 1, true)
  const jetMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  // North Polar Jet
  const northJet = new THREE.Mesh(jetGeo, jetMat)
  northJet.position.y = 125
  northJet.rotation.z = 0.12
  group.add(northJet)

  // South Polar Jet
  const southJet = new THREE.Mesh(jetGeo, jetMat.clone())
  southJet.position.y = -125
  southJet.rotation.z = Math.PI + 0.12
  group.add(southJet)

  // ── 6. MATTER INFALL SPIRAL PARTICLES (دوامة المادة المنجذبة لداخل الثقب) ──
  const INFALL_COUNT = 360
  const infallGeo = new THREE.BufferGeometry()
  const infallPositions = new Float32Array(INFALL_COUNT * 3)
  const infallColors = new Float32Array(INFALL_COUNT * 3)

  interface InfallParticle {
    r: number
    theta: number
    speed: number
    yOffset: number
    colorType: number
  }

  const particleData: InfallParticle[] = []
  const maxRadius = HORIZON_RADIUS * 4.4
  const minRadius = HORIZON_RADIUS * 1.05

  for (let i = 0; i < INFALL_COUNT; i++) {
    const r = minRadius + Math.random() * (maxRadius - minRadius)
    const theta = Math.random() * Math.PI * 2
    const speed = 0.015 + Math.random() * 0.025
    const yOffset = (Math.random() - 0.5) * 5.0
    const colorType = Math.random()

    particleData.push({ r, theta, speed, yOffset, colorType })

    // Coordinate in tilted accretion plane
    const x = r * Math.cos(theta)
    const z = r * Math.sin(theta)
    const y = yOffset

    infallPositions[i * 3] = x
    infallPositions[i * 3 + 1] = y
    infallPositions[i * 3 + 2] = z

    if (colorType > 0.6) {
      // Hot white-gold
      infallColors[i * 3] = 1.0
      infallColors[i * 3 + 1] = 0.92
      infallColors[i * 3 + 2] = 0.75
    } else if (colorType > 0.25) {
      // Plasma orange
      infallColors[i * 3] = 1.0
      infallColors[i * 3 + 1] = 0.55
      infallColors[i * 3 + 2] = 0.15
    } else {
      // Cyan relativistic photon
      infallColors[i * 3] = 0.4
      infallColors[i * 3 + 1] = 0.85
      infallColors[i * 3 + 2] = 1.0
    }
  }

  infallGeo.setAttribute('position', new THREE.BufferAttribute(infallPositions, 3))
  infallGeo.setAttribute('color', new THREE.BufferAttribute(infallColors, 3))

  const infallMat = new THREE.PointsMaterial({
    size: 2.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const infallPoints = new THREE.Points(infallGeo, infallMat)
  // Align with accretion disk plane
  infallPoints.rotation.x = accretionDisk.rotation.x
  infallPoints.rotation.y = accretionDisk.rotation.y
  group.add(infallPoints)

  // ── 7. GRAVITATIONAL POINT LIGHT (Dim golden starlight emitted from disk) ──
  const diskLight = new THREE.PointLight(0xffa500, 2.8, 480, 2)
  group.add(diskLight)

  // ═════════════════════════════════════════════════════════════
  // ANIMATION & RELATIVISTIC DYNAMICS LOOP
  // ═════════════════════════════════════════════════════════════
  const update = (time: number, dt: number) => {
    // 1. Accretion Disk continuous relativistic rotation
    accretionDisk.rotation.z += dt * 0.42
    lensingHalo.rotation.z += dt * 0.28
    photonRing.rotation.z -= dt * 0.65

    // 2. Polar Jets relativistic flicker & breathing
    const jetFlicker = 1 + 0.12 * Math.sin(time * 8.0) + 0.06 * Math.cos(time * 15.0)
    northJet.scale.set(jetFlicker, 1, jetFlicker)
    southJet.scale.set(jetFlicker, 1, jetFlicker)

    // 3. Spiraling Matter Infall into Event Horizon
    const posAttr = infallGeo.attributes.position as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array

    for (let i = 0; i < INFALL_COUNT; i++) {
      const p = particleData[i]
      // Infall inward acceleration (Faster as it approaches singularity)
      const accel = (maxRadius / Math.max(p.r, minRadius)) * 0.35
      p.r -= p.speed * accel
      p.theta += p.speed * 1.8 * accel

      // If matter crosses into the event horizon, respawn at the outer accretion boundary!
      if (p.r <= minRadius) {
        p.r = maxRadius - Math.random() * 8.0
        p.theta = Math.random() * Math.PI * 2
      }

      positions[i * 3] = p.r * Math.cos(p.theta)
      positions[i * 3 + 1] = p.yOffset * (p.r / maxRadius)
      positions[i * 3 + 2] = p.r * Math.sin(p.theta)
    }

    posAttr.needsUpdate = true
  }

  return {
    group,
    update,
    position,
    radius: HORIZON_RADIUS,
  }
}
