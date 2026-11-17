'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Circle, Line, Text, Group, Arc } from 'react-konva'
import { useGalaxyStore, getCategoryColor } from '@/store/galaxyStore'
import type { GalaxyNode, GalaxyEdge } from '@/types'
import Konva from 'konva'

const ORIGIN_NODE = {
  id: 'origin',
  label: '✦ Origin',
  x: 0, y: 0,
  color: '#ffffff',
  r: 22,
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface NodeShapeProps {
  node: GalaxyNode
  isSelected: boolean
  onClick: () => void
  onDragEnd: (x: number, y: number) => void
  tick: number
}

function NodeShape({ node, isSelected, onClick, onDragEnd, tick }: NodeShapeProps) {
  const r = 14
  const pulse = Math.sin(tick * 0.04 + (node.x + node.y) * 0.01)
  const glowR = r * (2.5 + 0.3 * pulse)

  return (
    <Group
      x={node.x}
      y={node.y}
      draggable
      onClick={onClick}
      onTap={onClick}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {/* Outer glow */}
      <Circle
        radius={glowR}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={r * 0.3}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={glowR}
        fillRadialGradientColorStops={[
          0, hexToRgba(node.color, 0.25 + 0.1 * pulse),
          1, hexToRgba(node.color, 0),
        ]}
        listening={false}
      />
      {/* Selection ring */}
      {isSelected && (
        <Circle
          radius={r + 7}
          stroke={node.color}
          strokeWidth={1.5}
          dash={[4, 4]}
          fill="transparent"
          listening={false}
        />
      )}
      {/* Core */}
      <Circle
        radius={r}
        fillRadialGradientStartPoint={{ x: -r * 0.3, y: -r * 0.3 }}
        fillRadialGradientStartRadius={r * 0.1}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={r}
        fillRadialGradientColorStops={[0, '#ffffff', 0.3, node.color, 1, node.color + '88']}
        shadowColor={node.color}
        shadowBlur={12}
        shadowOpacity={0.6}
      />
      {/* Progress arc */}
      {node.progress > 0 && node.progress < 100 && (
        <Arc
          innerRadius={r + 3}
          outerRadius={r + 6}
          angle={(node.progress / 100) * 360}
          rotation={-90}
          fill={node.color}
          listening={false}
        />
      )}
      {/* Done check */}
      {node.done && (
        <Text
          text="✓"
          fontSize={r * 0.9}
          fill="rgba(0,0,0,0.7)"
          align="center"
          verticalAlign="middle"
          offsetX={r * 0.25}
          offsetY={r * 0.45}
          listening={false}
        />
      )}
      {/* Label */}
      <Text
        text={node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
        fontSize={11}
        fontStyle="600"
        fill="rgba(255,255,255,0.9)"
        align="center"
        y={r + 5}
        offsetX={50}
        width={100}
        shadowColor={node.color}
        shadowBlur={6}
        listening={false}
      />
    </Group>
  )
}

interface EdgeLineProps {
  edge: GalaxyEdge
  fromNode: { x: number; y: number; color: string } | null
  toNode: GalaxyNode | null
  tick: number
}

function EdgeLine({ edge, fromNode, toNode, tick }: EdgeLineProps) {
  if (!fromNode || !toNode) return null
  const t = ((tick * 0.004 + edge.offset) % 1 + 1) % 1
  const dotX = fromNode.x + (toNode.x - fromNode.x) * t
  const dotY = fromNode.y + (toNode.y - fromNode.y) * t
  const alpha = 0.4 + 0.3 * Math.sin(tick * 0.03 + edge.offset)

  return (
    <Group listening={false}>
      <Line
        points={[fromNode.x, fromNode.y, toNode.x, toNode.y]}
        stroke={hexToRgba(toNode.color, alpha * 0.5)}
        strokeWidth={1.5}
      />
      <Circle
        x={dotX} y={dotY}
        radius={2.5}
        fill={hexToRgba(toNode.color, 0.9)}
      />
    </Group>
  )
}

export default function GalaxyCanvas() {
  const { nodes, edges, camera, selectedNodeId, selectNode, setCamera, updateNode } = useGalaxyStore()
  const [tick, setTick] = useState(0)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const stageRef = useRef<Konva.Stage>(null)

  // Animation tick
  useEffect(() => {
    let af: number
    const loop = () => { setTick(t => t + 1); af = requestAnimationFrame(loop) }
    af = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(af)
  }, [])

  // Resize
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const getNodePos = useCallback((id: string) => {
    if (id === 'origin') return { x: 0, y: 0, color: '#ffffff' }
    const n = nodes.find(n => n.id === id)
    return n ? { x: n.x, y: n.y, color: n.color } : null
  }, [nodes])

  const handleDragEnd = useCallback(async (nodeId: string, x: number, y: number) => {
    // Convert from stage coords to world coords
    const worldX = x - size.w / 2 - camera.x
    const worldY = y - size.h / 2 - camera.y
    updateNode(nodeId, { x: worldX / camera.zoom, y: worldY / camera.zoom })
    // Persist
    await fetch('/api/nodes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: nodeId, x: worldX / camera.zoom, y: worldY / camera.zoom }),
    })
  }, [size, camera, updateNode])

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const factor = e.evt.deltaY < 0 ? 1.1 : 0.9
    setCamera({ zoom: Math.max(0.3, Math.min(3, camera.zoom * factor)) })
  }

  return (
    <Stage
      ref={stageRef}
      width={size.w}
      height={size.h}
      x={size.w / 2 + camera.x}
      y={size.h / 2 + camera.y}
      scaleX={camera.zoom}
      scaleY={camera.zoom}
      draggable
      onDragEnd={(e) => setCamera({ x: e.target.x() - size.w / 2, y: e.target.y() - size.h / 2 })}
      onWheel={handleWheel}
      onClick={(e) => { if (e.target === e.target.getStage()) selectNode(null) }}
    >
      <Layer>
        {/* Edges */}
        {edges.map(edge => (
          <EdgeLine
            key={edge.id}
            edge={edge}
            fromNode={getNodePos(edge.fromId)}
            toNode={nodes.find(n => n.id === edge.toId) ?? null}
            tick={tick}
          />
        ))}

        {/* Origin node */}
        <Group x={0} y={0} onClick={() => selectNode(null)}>
          <Circle
            radius={40}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={5}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={40}
            fillRadialGradientColorStops={[0, 'rgba(255,255,255,0.15)', 1, 'rgba(255,255,255,0)']}
            listening={false}
          />
          <Circle
            radius={22}
            fillRadialGradientStartPoint={{ x: -6, y: -6 }}
            fillRadialGradientStartRadius={2}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={22}
            fillRadialGradientColorStops={[0, '#ffffff', 0.5, '#c4b5fd', 1, '#7c3aed']}
            shadowColor="#a78bfa"
            shadowBlur={20}
            shadowOpacity={0.8}
          />
          <Text
            text="✦"
            fontSize={14}
            fill="rgba(0,0,0,0.7)"
            align="center"
            offsetX={7}
            offsetY={7}
            listening={false}
          />
          <Text
            text="Origin"
            fontSize={11}
            fontStyle="600"
            fill="rgba(255,255,255,0.7)"
            align="center"
            y={27}
            offsetX={30}
            width={60}
            listening={false}
          />
        </Group>

        {/* Nodes */}
        {nodes.map(node => (
          <NodeShape
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            tick={tick}
            onClick={() => selectNode(node.id)}
            onDragEnd={(x, y) => handleDragEnd(node.id, x, y)}
          />
        ))}
      </Layer>
    </Stage>
  )
}
