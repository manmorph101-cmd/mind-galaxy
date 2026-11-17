'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGalaxyStore } from '@/store/galaxyStore'
import type { NodeType } from '@/types'
import { playSelectSound } from '@/lib/sound'
import { getCelestialColor } from '@/lib/colors'
import {
  getCircadianCosmicTheme,
  createDeepSpaceNebulae,
  createCosmicDustParticles,
  ShootingStarManager,
} from '@/lib/spaceAtmosphere'

/* ═══════════════════════════════════════════════════════════════
   COSMIC NEURAL SPACE — Smooth Cinematic Camera & Persistent 3D
   • Stable Three.js lifecycle (Zero camera reset on node add)
   • Smooth cinematic fly-to transition when selecting nodes
   • Camera position & target persisted in localStorage
   • Multi-stop gradient light-to-dark (Volumetric celestial depth)
   • Pure black void (#000000) & pure circular neon dots
   ═══════════════════════════════════════════════════════════════ */

function hexToThreeColor(hex: string) { return new THREE.Color(hex) }

// Cache generated celestial textures for peak rendering performance
const glowTextureCache = new Map<string, THREE.Texture>()

// High-definition 256x256 multi-stop celestial glow texture:
// Luminous radiant core to deep cosmic rim into void
function getCelestialGlowTexture(colorInput: string | THREE.Color): THREE.Texture {
  const hexStr = typeof colorInput === 'string'
    ? colorInput
    : `#${colorInput.getHexString()}`
  const cacheKey = hexStr.toLowerCase()

  if (glowTextureCache.has(cacheKey)) {
    return glowTextureCache.get(cacheKey)!
  }

  const celestial = getCelestialColor(hexStr)
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const c = 128
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c)

  const lightColor = new THREE.Color(celestial.light)
  const midColor = new THREE.Color(celestial.hex)
  const deepColor = new THREE.Color(celestial.deep)

  const lr = Math.round(lightColor.r * 255), lg = Math.round(lightColor.g * 255), lb = Math.round(lightColor.b * 255)
  const mr = Math.round(midColor.r * 255), mg = Math.round(midColor.g * 255), mb = Math.round(midColor.b * 255)
  const dr = Math.round(deepColor.r * 255), dg = Math.round(deepColor.g * 255), db = Math.round(deepColor.b * 255)

  // 0.00: White-hot photon singularity
  grad.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)')
  // 0.09: Radiant light tone (Luminous core)
  grad.addColorStop(0.09, `rgba(${lr}, ${lg}, ${lb}, 0.98)`)
  // 0.26: Vibrant chromatic celestial body
  grad.addColorStop(0.26, `rgba(${mr}, ${mg}, ${mb}, 0.88)`)
  // 0.54: Deep rich cosmic shade (Deep rim)
  grad.addColorStop(0.54, `rgba(${dr}, ${dg}, ${db}, 0.38)`)
  // 0.82: Atmospheric corona edge
  grad.addColorStop(0.82, `rgba(${dr}, ${dg}, ${db}, 0.08)`)
  // 1.00: Seamless blend into pure black void
  grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  glowTextureCache.set(cacheKey, texture)
  return texture
}

export default function CosmicSpace3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { nodes, edges, selectedNodeId, selectNode } = useGalaxyStore()

  const nodesRef = useRef(nodes); nodesRef.current = nodes
  const edgesRef = useRef(edges); edgesRef.current = edges
  const selectedRef = useRef(selectedNodeId); selectedRef.current = selectedNodeId

  // Nodes excitation state dictionary (nodeId -> excitation level 0..1)
  const excitations = useRef<Map<string, number>>(new Map())

  // Persistent Three.js Object References
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const nodesGroupRef = useRef<THREE.Group | null>(null)
  const edgesGroupRef = useRef<THREE.Group | null>(null)
  const pulsesGroupRef = useRef<THREE.Group | null>(null)

  // Smooth Camera Animation Targets
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const targetCamPos = useRef(new THREE.Vector3(0, 70, 380))
  const isUserInteracting = useRef(false)
  const isAnimatingToNode = useRef(false)

  // 6-Second Idle Auto-Rotation State
  const lastUserActivity = useRef(typeof performance !== 'undefined' ? performance.now() : 0)
  const autoRotateBlend = useRef(0)

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  hoveredIdRef.current = hoveredId

  const [labels, setLabels] = useState<Array<{
    id: string
    label: string
    color: string
    x: number
    y: number
    visible: boolean
    type: NodeType
    isSkill: boolean
    isSelected: boolean
    isHovered: boolean
    distance: number
  }>>([])

  // ═════════════════════════════════════════════════════════════
  // 1. REBUILD NODES & EDGES (Called whenever nodes/edges change)
  // NEVER resets camera or re-creates the WebGL context!
  // ═════════════════════════════════════════════════════════════
  const rebuildScene = useCallback(() => {
    const nodesGroup = nodesGroupRef.current
    const edgesGroup = edgesGroupRef.current
    const pulsesGroup = pulsesGroupRef.current
    if (!nodesGroup || !edgesGroup || !pulsesGroup) return

    while (nodesGroup.children.length) nodesGroup.remove(nodesGroup.children[0])
    while (edgesGroup.children.length) edgesGroup.remove(edgesGroup.children[0])
    while (pulsesGroup.children.length) pulsesGroup.remove(pulsesGroup.children[0])

    const curNodes = nodesRef.current
    const curEdges = edgesRef.current

    const posMap = new Map<string, THREE.Vector3>()
    posMap.set('origin', new THREE.Vector3(0, 0, 0))

    // ── CIRCULAR DOTS (Pure Radiant Light Points with Light-to-Dark Depth) ──
    curNodes.forEach((node) => {
      const pos = new THREE.Vector3(node.x, node.y, node.z ?? 0)
      posMap.set(node.id, pos)
      const celestial = getCelestialColor(node.color)
      const lightCol = new THREE.Color(celestial.light)
      const midCol = new THREE.Color(celestial.hex)
      const group = new THREE.Group()
      group.position.copy(pos)
      group.userData = { nodeId: node.id, nodeType: node.type }

      // True definition: node is primary skill if it has no parent or parent is 'origin'
      const isSkill = !node.parentId || node.parentId === 'origin'
      // Refined small dots: primary soma is 4.2, child synapse is 1.35
      const baseR = isSkill ? 4.2 : 1.35

      if (!excitations.current.has(node.id)) {
        excitations.current.set(node.id, 0.8) // gentle initial spawn flash
      }

      // ── VOLUMETRIC CELESTIAL SPHERE (Light Core to Deep Rim) ──
      // Layer 1 (Innermost core): Dazzling white-hot photon singularity
      const innerGeo = new THREE.SphereGeometry(baseR * 0.42, 16, 16)
      const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      group.add(new THREE.Mesh(innerGeo, innerMat))

      // Layer 2 (Mantle): Luminous radiant light tone
      const mantleGeo = new THREE.SphereGeometry(baseR * 0.76, 20, 20)
      const mantleMat = new THREE.MeshBasicMaterial({
        color: lightCol,
        transparent: true,
        opacity: 0.95,
      })
      group.add(new THREE.Mesh(mantleGeo, mantleMat))

      // Layer 3 (Outer surface): Vibrant pure chromatic sphere
      const dotGeo = new THREE.SphereGeometry(baseR, 24, 24)
      const dotMat = new THREE.MeshBasicMaterial({
        color: midCol,
        transparent: true,
        opacity: 0.85,
      })
      const dotMesh = new THREE.Mesh(dotGeo, dotMat)
      dotMesh.name = 'dotCore'
      group.add(dotMesh)

      // Circular Celestial Glow (Multi-stop gradient sprite)
      const tex = getCelestialGlowTexture(node.color)
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: isSkill ? 0.85 : 0.48,
        depthWrite: false,
      })
      const glowSprite = new THREE.Sprite(spriteMat)
      // Refined glow scale: child subnodes stay crisp and never bloom into a blinding blob
      const glowScale = isSkill ? baseR * 6.6 : baseR * 3.2
      glowSprite.scale.set(glowScale, glowScale, 1)
      glowSprite.name = 'glowSprite'
      glowSprite.userData = { baseScale: glowScale }
      group.add(glowSprite)

      // Point light for dynamic illumination — ONLY for primary skill nucleus to avoid saturation
      if (isSkill) {
        const pLight = new THREE.PointLight(midCol.getHex(), 1.25, 115, 2)
        pLight.name = 'nodeLight'
        group.add(pLight)
      }

      // Cellular Membrane / Aura enveloping the neural dendrites (Subtle ethereal glow)
      if (isSkill) {
        const clusterTaskCount = curNodes.filter(n => n.parentId === node.id || n.skillId === node.id).length
        const haloScale = 28 + Math.min(26, clusterTaskCount * 1.0)
        const haloTex = getCelestialGlowTexture(node.color)
        const haloMat = new THREE.SpriteMaterial({
          map: haloTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          opacity: 0.05,
          depthWrite: false,
        })
        const haloSprite = new THREE.Sprite(haloMat)
        haloSprite.scale.set(haloScale, haloScale, 1)
        haloSprite.name = 'somaHalo'
        haloSprite.userData = { baseScale: haloScale }
        group.add(haloSprite)
      }

      nodesGroup.add(group)
    })

    // ── EDGES: SYNAPTIC LINES WITH SMART TRIANGULATION ──
    curEdges.forEach((edge, i) => {
      const from = posMap.get(edge.fromId)
      const to = posMap.get(edge.toId)
      if (!from || !to) return

      const targetNode = curNodes.find(n => n.id === edge.toId)
      const edgeColorHex = targetNode ? targetNode.color : '#ffffff'
      const edgeColor = hexToThreeColor(edgeColorHex)

      // Organic curve between points
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
      const dist = from.distanceTo(to)
      const offset = new THREE.Vector3(
        Math.sin(i * 2.3) * dist * 0.08,
        Math.cos(i * 1.7) * dist * 0.08,
        Math.sin(i * 0.9) * dist * 0.08,
      )
      const ctrl = mid.clone().add(offset)
      const curve = new THREE.QuadraticBezierCurve3(from, ctrl, to)
      const pts = curve.getPoints(36)

      // Sleek laser line
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const lineMat = new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: 0.40,
        blending: THREE.AdditiveBlending,
      })
      edgesGroup.add(new THREE.Line(lineGeo, lineMat))

      // Synaptic light impulse travelling between connected dots
      const pulseGeo = new THREE.SphereGeometry(1.4, 10, 10)
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending })
      const pulse = new THREE.Mesh(pulseGeo, pulseMat)

      const sparkTex = getCelestialGlowTexture(edgeColorHex)
      const sparkSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: sparkTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      )
      sparkSprite.scale.set(8, 8, 1)
      pulse.add(sparkSprite)

      pulse.userData = { curve, t: edge.offset ?? Math.random(), speed: 0.0035 + (i % 3) * 0.001 }
      pulsesGroup.add(pulse)
    })
  }, [])

  // ═════════════════════════════════════════════════════════════
  // 2. SMOOTH CAMERA FLY-TO (Triggers when selectedNodeId changes)
  // ═════════════════════════════════════════════════════════════
  useEffect(() => {
    const camera = cameraRef.current
    if (!camera) return

    if (!selectedNodeId) {
      // Return gently to orbit view
      targetLookAt.current.set(0, 0, 0)
      const viewDir = camera.position.clone().normalize()
      if (viewDir.lengthSq() < 0.01) viewDir.set(0, 0.2, 1).normalize()
      targetCamPos.current.copy(viewDir.multiplyScalar(360))
      isAnimatingToNode.current = true
      return
    }

    const targetNode = nodesRef.current.find(n => n.id === selectedNodeId)
    if (targetNode) {
      const nodePos = new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z ?? 0)

      // Set target look at to node
      targetLookAt.current.copy(nodePos)

      // Compute smooth fly-in camera position maintaining current viewing direction
      const viewDir = camera.position.clone().sub(nodePos).normalize()
      if (viewDir.lengthSq() < 0.01) viewDir.set(0, 0.3, 1).normalize()

      // Comfortable viewing distance tailored to the cluster radius
      const clusterCount = nodesRef.current.filter(n => n.parentId === targetNode.id || n.skillId === targetNode.id).length
      const viewDistance = targetNode.type !== 'task'
        ? (115 + Math.min(65, clusterCount * 2.2))
        : 75
      targetCamPos.current.copy(nodePos).add(viewDir.multiplyScalar(viewDistance))

      isAnimatingToNode.current = true
      isUserInteracting.current = false
    }
  }, [selectedNodeId])

  // ═════════════════════════════════════════════════════════════
  // 3. REBUILD SCENE WHEN NODES/EDGES CHANGE (Camera is preserved!)
  // ═════════════════════════════════════════════════════════════
  useEffect(() => {
    rebuildScene()
  }, [nodes, edges, rebuildScene])

  // ═════════════════════════════════════════════════════════════
  // 4. MAIN THREE.JS INITIALIZATION (RUNS ONCE ON MOUNT)
  // ═════════════════════════════════════════════════════════════
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // ── SCENE ──
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(0x000000)

    // Circadian Cosmic Atmosphere & Time-of-Day Shift
    const circadian = getCircadianCosmicTheme()
    scene.fog = new THREE.FogExp2(circadian.horizonColor.getHex(), 0.00045)

    // Ethereal Deep-Space Nebulae (Soft, non-intrusive breathing horizon)
    const nebulae = createDeepSpaceNebulae(circadian.nebulaTint)
    scene.add(nebulae)

    // Floating Stardust Particles (Weightless Brownian motes with parallax depth)
    const { points: dustPoints, update: updateDust } = createCosmicDustParticles(circadian.dustColor)
    scene.add(dustPoints)

    // Distant Shooting Stars / Meteors passing diagonally across active camera view ("الشهب")
    const shootingStars = new ShootingStarManager()
    scene.add(shootingStars.group)

    // ── CAMERA (Restore saved position if available) ──
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 5000)
    cameraRef.current = camera

    let savedCam: { px: number; py: number; pz: number; tx: number; ty: number; tz: number } | null = null
    try {
      const raw = localStorage.getItem('mindgalaxy_cam_v2')
      if (raw) savedCam = JSON.parse(raw)
    } catch {}

    if (savedCam) {
      camera.position.set(savedCam.px, savedCam.py, savedCam.pz)
      targetLookAt.current.set(savedCam.tx, savedCam.ty, savedCam.tz)
      targetCamPos.current.copy(camera.position)
    } else {
      camera.position.set(0, 70, 380)
      targetCamPos.current.set(0, 70, 380)
    }

    // ── RENDERER ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    rendererRef.current = renderer
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    el.appendChild(renderer.domElement)

    // ── CONTROLS ──
    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.enableDamping = true
    controls.dampingFactor = 0.045
    controls.rotateSpeed = 0.6
    controls.zoomSpeed = 0.95
    controls.minDistance = 25
    controls.maxDistance = 1400
    controls.autoRotate = false
    controls.enablePan = true

    if (savedCam) {
      controls.target.set(savedCam.tx, savedCam.ty, savedCam.tz)
    }

    // Detect user manual interaction so it doesn't fight smooth lerp or auto-rotation
    controls.addEventListener('start', () => {
      isUserInteracting.current = true
      isAnimatingToNode.current = false
      lastUserActivity.current = performance.now()
    })

    controls.addEventListener('change', () => {
      if (isUserInteracting.current) {
        lastUserActivity.current = performance.now()
      }
    })

    controls.addEventListener('end', () => {
      isUserInteracting.current = false
      lastUserActivity.current = performance.now()
      targetLookAt.current.copy(controls.target)
      targetCamPos.current.copy(camera.position)

      // Save camera coordinates to localStorage so user viewpoint persists
      try {
        localStorage.setItem('mindgalaxy_cam_v2', JSON.stringify({
          px: camera.position.x, py: camera.position.y, pz: camera.position.z,
          tx: controls.target.x, ty: controls.target.y, tz: controls.target.z,
        }))
      } catch {}
    })

    // ── LIGHTS ──
    scene.add(new THREE.AmbientLight(0x222222, 0.8))
    const coreLight = new THREE.PointLight(0xffffff, 3.0, 800, 1.4)
    coreLight.position.set(0, 0, 0)
    scene.add(coreLight)

    // ── DEEP SPACE STARFIELD ──
    const STAR_COUNT = 6000
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(STAR_COUNT * 3)
    const starSizes = new Float32Array(STAR_COUNT)
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 350 + Math.random() * 2200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i * 3 + 2] = r * Math.cos(phi)
      starSizes[i] = Math.random() * 1.8 + 0.4
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = sin(uTime * 0.6 + position.x * 0.01 + position.y * 0.013) * 0.35 + 0.65;
          vAlpha = twinkle * 0.8;
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          float alpha = (1.0 - d * d) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ── ORIGIN: Pure White Circular Dot (✦) ──
    const originGroup = new THREE.Group()
    scene.add(originGroup)

    const originCoreGeo = new THREE.SphereGeometry(4.2, 32, 32)
    const originCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const originMesh = new THREE.Mesh(originCoreGeo, originCoreMat)
    originGroup.add(originMesh)

    const whiteTexture = getCelestialGlowTexture('#ffffff')
    const originGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: whiteTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    originGlow.scale.set(28, 28, 1)
    originGroup.add(originGlow)

    // ── DYNAMIC OBJECTS HOLDERS ──
    const nodesGroup = new THREE.Group()
    scene.add(nodesGroup)
    nodesGroupRef.current = nodesGroup

    const edgesGroup = new THREE.Group()
    scene.add(edgesGroup)
    edgesGroupRef.current = edgesGroup

    const pulsesGroup = new THREE.Group()
    scene.add(pulsesGroup)
    pulsesGroupRef.current = pulsesGroup

    // Build current scene initial state
    rebuildScene()

    // ── RAYCASTER & INTERACTION ──
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)

    const registerUserActivity = () => {
      lastUserActivity.current = performance.now()
    }

    const onPointerMove = (e: MouseEvent) => {
      registerUserActivity()
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(nodesGroup.children, true)
      if (hits.length) {
        document.body.style.cursor = 'pointer'
        let obj = hits[0].object
        while (obj.parent && obj.parent !== nodesGroup) obj = obj.parent
        setHoveredId(obj.userData?.nodeId ?? null)
      } else {
        document.body.style.cursor = 'default'
        setHoveredId(null)
      }
    }

    const findClickedNodeId = (): string | null => {
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(nodesGroup.children, true)
      if (!hits.length) return null
      let obj = hits[0].object
      while (obj.parent && obj.parent !== nodesGroup) obj = obj.parent
      return obj.userData?.nodeId ?? null
    }

    const triggerExcitation = (nodeId: string) => {
      excitations.current.set(nodeId, 1.0)
    }

    const onClick = (e: MouseEvent) => {
      registerUserActivity()
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
      const id = findClickedNodeId()
      if (id) {
        selectNode(id)
        triggerExcitation(id)
        playSelectSound()
      }
    }

    const onResetCamEvent = () => {
      registerUserActivity()
      targetLookAt.current.set(0, 0, 0)
      targetCamPos.current.set(0, 70, 380)
      isAnimatingToNode.current = true
      isUserInteracting.current = false
      controls.target.set(0, 0, 0)
      try {
        localStorage.removeItem('mindgalaxy_cam_v2')
      } catch {}
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerdown', registerUserActivity)
    window.addEventListener('wheel', registerUserActivity, { passive: true })
    window.addEventListener('keydown', registerUserActivity)
    window.addEventListener('touchstart', registerUserActivity, { passive: true })
    window.addEventListener('touchmove', registerUserActivity, { passive: true })
    window.addEventListener('click', onClick)
    window.addEventListener('mindgalaxy:resetCamera', onResetCamEvent)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // ══════════════════════════════════════
    //  ANIMATION LOOP
    // ══════════════════════════════════════
    const startTime = performance.now() * 0.001
    let lastTime = startTime
    const tmpV = new THREE.Vector3()
    let af: number

    const animate = () => {
      af = requestAnimationFrame(animate)
      const now = performance.now() * 0.001
      const t = now - startTime
      const dt = Math.min(0.05, Math.max(0.001, now - lastTime))
      lastTime = now

      starMat.uniforms.uTime.value = t
      stars.rotation.y = t * 0.0015

      // Nebulae ultra-slow cosmic breathing rotation
      nebulae.rotation.y = t * 0.00012
      nebulae.rotation.z = t * 0.00007

      // Floating weightless stardust Brownian drift
      updateDust(t)

      // Distant shooting stars streaking across camera view ("الشهب")
      shootingStars.update(dt, camera)

      // Origin breathing excitation (slow 12s cycle, 3% amplitude)
      const originBreathe = 1 + 0.03 * Math.sin(t * 0.5)
      originGlow.scale.set(28 * originBreathe, 28 * originBreathe, 1)

      // Animate synaptic impulses traveling across lines & triangles
      pulsesGroup.children.forEach(child => {
        const mesh = child as THREE.Mesh
        const { curve, speed } = mesh.userData
        mesh.userData.t = (mesh.userData.t + speed) % 1
        const pt = curve.getPoint(mesh.userData.t)
        mesh.position.copy(pt)
      })

      // Light excitation animation
      nodesGroup.children.forEach(group => {
        const id = group.userData.nodeId
        const nodeType = group.userData.nodeType
        if (!id) return

        let exc = excitations.current.get(id) ?? 0

        if (Math.sin(t * 0.4 + group.position.x * 0.03) > 0.995 && exc < 0.1) {
          exc = 0.35
        }

        if (exc > 0.01) {
          exc = Math.max(0, exc - 0.012)
          excitations.current.set(id, exc)
        }

        // Habit dots have a subtle discipline heartbeat pulse
        const habitPulse = nodeType === 'habit' ? 0.08 * Math.sin(t * 3.2) : 0

        const isSel = id === selectedRef.current
        const excitationBoost = 1 + exc * 0.8 + (isSel ? 0.25 : 0) + habitPulse

        const glowSprite = group.getObjectByName('glowSprite') as THREE.Sprite
        if (glowSprite) {
          const baseScale = glowSprite.userData.baseScale || 26
          glowSprite.scale.set(baseScale * excitationBoost, baseScale * excitationBoost, 1)
          glowSprite.material.opacity = Math.min(0.9, 0.4 + exc * 0.4 + (nodeType === 'habit' ? 0.1 : 0))
        }

        const pLight = group.getObjectByName('nodeLight') as THREE.PointLight
        if (pLight) {
          pLight.intensity = (isSel ? 2.0 : 1.0) * excitationBoost
        }

        // Cellular Membrane Halo gentle breathing
        const somaHalo = group.getObjectByName('somaHalo') as THREE.Sprite
        if (somaHalo) {
          const baseHalo = somaHalo.userData.baseScale || 32
          const haloBreathe = 1 + 0.035 * Math.sin(t * 1.3 + group.position.x * 0.05)
          somaHalo.scale.set(baseHalo * haloBreathe, baseHalo * haloBreathe, 1)
        }
      })

      // ── CINEMATIC SMOOTH CAMERA GLIDE ──
      if (isAnimatingToNode.current && !isUserInteracting.current) {
        controls.target.lerp(targetLookAt.current, 0.065)
        camera.position.lerp(targetCamPos.current, 0.055)

        // Stop animating when arrived close enough
        if (
          camera.position.distanceTo(targetCamPos.current) < 0.8 &&
          controls.target.distanceTo(targetLookAt.current) < 0.5
        ) {
          isAnimatingToNode.current = false
        }
      }

      // ── 6-SECOND IDLE 360° CINEMATIC AUTO-ROTATION ──
      const idleMs = performance.now() - lastUserActivity.current
      const shouldAutoRotate = idleMs > 6000 && !isUserInteracting.current && !isAnimatingToNode.current

      if (shouldAutoRotate) {
        // Smoothly blend in rotation speed (ease-in over ~1.5s)
        autoRotateBlend.current = THREE.MathUtils.lerp(autoRotateBlend.current, 1.0, 0.02)
      } else {
        // Smoothly blend out rotation speed on user interaction
        autoRotateBlend.current = THREE.MathUtils.lerp(autoRotateBlend.current, 0.0, 0.09)
      }

      if (autoRotateBlend.current > 0.005) {
        controls.autoRotate = true
        // Smooth majestic speed (~0.48 rpm)
        controls.autoRotateSpeed = 0.52 * autoRotateBlend.current
      } else {
        controls.autoRotate = false
      }

      controls.update()

      // ═════════════════════════════════════════════════════════════
      // ── 2D SCREEN-SPACE ANTI-COLLISION & SMART ELEVATION ENGINE ──
      // Completely prevents overlapping label stacks and text collisions!
      // ═════════════════════════════════════════════════════════════
      const selId = selectedRef.current
      const hovId = hoveredIdRef.current

      type CandidateLabel = {
        id: string
        label: string
        color: string
        type: NodeType
        isSkill: boolean
        x: number
        y: number
        visible: boolean
        isSelected: boolean
        isHovered: boolean
        distance: number
        priority: number
      }

      const candidates: CandidateLabel[] = []

      nodesRef.current.forEach(node => {
        tmpV.set(node.x, node.y, node.z ?? 0)
        tmpV.project(camera)
        const inFrustum = tmpV.z < 1 && tmpV.z > -1 && Math.abs(tmpV.x) < 1.15 && Math.abs(tmpV.y) < 1.15
        if (!inFrustum) return

        const sx = ((tmpV.x + 1) * window.innerWidth) / 2
        const sy = ((-tmpV.y + 1) * window.innerHeight) / 2
        const dist = camera.position.distanceTo(new THREE.Vector3(node.x, node.y, node.z ?? 0))
        if (dist > 950) return

        const isSkill = !node.parentId || node.parentId === 'origin'
        const isSelected = node.id === selId
        const isHovered = node.id === hovId
        const isParentSelected = Boolean(selId && (node.parentId === selId || node.skillId === selId))

        // Visibility rules:
        // - Primary skills: always visible
        // - Sub-nodes: visible when selected, hovered, or when parent cluster is selected
        const eligible = isSkill || isSelected || isHovered || isParentSelected
        if (!eligible) return

        const priority = (isSelected ? 100 : 0) + (isHovered ? 80 : 0) + (isSkill ? 40 : 10)

        candidates.push({
          id: node.id,
          label: node.label,
          color: node.color,
          type: node.type,
          isSkill,
          x: sx,
          y: sy,
          visible: true,
          isSelected,
          isHovered,
          distance: dist,
          priority,
        })
      })

      // Sort: highest priority items claim their anchor position first
      candidates.sort((a, b) => b.priority - a.priority)

      // Screen-space 2D AABB collision detection & displacement
      const placedBoxes: Array<{ x: number; y: number; w: number; h: number }> = []
      const resolved: Array<{
        id: string
        label: string
        color: string
        type: NodeType
        isSkill: boolean
        x: number
        y: number
        visible: boolean
        isSelected: boolean
        isHovered: boolean
        distance: number
      }> = []

      const LABEL_W = 86
      const LABEL_H = 26
      const PADDING = 6

      for (const cand of candidates) {
        const baseY = cand.y + (cand.isSkill ? 18 : 12)
        const baseX = cand.x

        // Potential offsets: [center, down, up, right, left, double-down, double-up]
        const testOffsets = [
          { dx: 0, dy: 0 },
          { dx: 0, dy: LABEL_H + PADDING },
          { dx: 0, dy: -(LABEL_H + PADDING) },
          { dx: LABEL_W * 0.65, dy: 0 },
          { dx: -LABEL_W * 0.65, dy: 0 },
          { dx: 0, dy: (LABEL_H + PADDING) * 2 },
          { dx: 0, dy: -(LABEL_H + PADDING) * 2 },
        ]

        let chosen = testOffsets[0]
        let found = false

        for (const off of testOffsets) {
          const tx = baseX + off.dx
          const ty = baseY + off.dy
          const bLeft = tx - LABEL_W / 2
          const bTop = ty - LABEL_H / 2

          let collide = false
          for (const pb of placedBoxes) {
            if (
              bLeft < pb.x + pb.w &&
              bLeft + LABEL_W > pb.x &&
              bTop < pb.y + pb.h &&
              bTop + LABEL_H > pb.y
            ) {
              collide = true
              break
            }
          }

          if (!collide) {
            chosen = off
            found = true
            placedBoxes.push({ x: bLeft, y: bTop, w: LABEL_W, h: LABEL_H })
            break
          }
        }

        // If no non-colliding spot exists and it is an unselected subnode, omit to preserve legibility
        if (!found && !cand.isSelected && !cand.isHovered && !cand.isSkill) {
          continue
        }

        resolved.push({
          ...cand,
          x: baseX + chosen.dx,
          y: baseY + chosen.dy,
        })
      }

      setLabels(resolved)

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(af)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', registerUserActivity)
      window.removeEventListener('wheel', registerUserActivity)
      window.removeEventListener('keydown', registerUserActivity)
      window.removeEventListener('touchstart', registerUserActivity)
      window.removeEventListener('touchmove', registerUserActivity)
      window.removeEventListener('click', onClick)
      window.removeEventListener('mindgalaxy:resetCamera', onResetCamEvent)

      shootingStars.dispose()
      scene.remove(nebulae)
      scene.remove(dustPoints)
      scene.remove(shootingStars.group)

      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [rebuildScene, selectNode])

  return (
    <div className="relative w-full h-full bg-black">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* When galaxy has ONLY Origin in the beginning */}
      {nodes.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-16 pointer-events-none text-center select-none">
          <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-1">
            ✦ Consciousness Nucleus
          </p>
          <p className="text-[11px] text-white/20">
            Click &quot;+ Add Node&quot; to plant your first skill in space
          </p>
        </div>
      )}

      {/* Floating 2D Minimalist Labels with Smart Anti-Collision */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {labels.map(lbl => {
          if (!lbl.visible || lbl.distance > 850) return null
          const isHovered = lbl.id === hoveredId
          const opacity = Math.max(0.28, Math.min(1, 1 - (lbl.distance - 140) / 710))

          return (
            <div
              key={lbl.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150"
              style={{
                left: `${lbl.x}px`,
                top: `${lbl.y}px`,
                opacity: isHovered || lbl.isSelected ? 1 : opacity,
                zIndex: isHovered || lbl.isSelected ? 30 : lbl.isSkill ? 20 : 10,
              }}
            >
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all ${
                  lbl.isSelected
                    ? 'bg-white/[0.18] border-white/80 shadow-lg scale-105'
                    : isHovered
                    ? 'bg-black/90 border-white/60 shadow-md scale-105'
                    : 'bg-black/80 border-white/[0.08]'
                }`}
                style={(lbl.isSelected || isHovered) ? { boxShadow: `0 0 16px ${lbl.color}88` } : {}}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: lbl.color, boxShadow: `0 0 8px ${lbl.color}` }}
                />
                <span className={`text-[10px] font-semibold tracking-wide whitespace-nowrap ${
                  lbl.isSelected || isHovered ? 'text-white' : lbl.isSkill ? 'text-white/90' : 'text-white/60'
                }`}>
                  {lbl.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
