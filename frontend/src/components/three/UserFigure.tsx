import { PerspectiveCamera, RoundedBox, Text, View } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Box, Typography } from '@mui/material'
import { Suspense, useRef } from 'react'
import type { Group } from 'three'
import { USER_FONT } from './Furniture'
import { capsule, material, sphere } from './resources'
import { isWebGLAvailable } from './webgl'

/**
 * A small, friendly 3D figure with "USER" printed on both the head and the torso.
 * Rendered through the shared ViewCanvas; falls back to a 2D badge without WebGL.
 */
export function UserFigure({ color, size = 52, phase = 0 }: { color: string; size?: number; phase?: number }) {
  if (!isWebGLAvailable()) {
    return <UserFigure2D color={color} size={size} />
  }

  return (
    <View style={{ width: size, height: size * 1.15, flexShrink: 0 }} aria-hidden>
      <PerspectiveCamera makeDefault position={[0, 1.1, 4.2]} fov={30} onUpdate={(camera) => camera.lookAt(0, 1.0, 0)} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 5]} intensity={1.4} />
      <Suspense fallback={null}>
        <Figure color={color} phase={phase} />
      </Suspense>
    </View>
  )
}

function Figure({ color, phase }: { color: string; phase: number }) {
  const group = useRef<Group>(null)
  const body = material(color, { roughness: 0.45 })

  // Gentle idle sway so the figures feel alive without distracting.
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime + phase
    group.current.rotation.y = Math.sin(t * 0.8) * 0.22
    group.current.position.y = Math.sin(t * 1.6) * 0.02
  })

  return (
    <group ref={group}>
      {/* Legs */}
      <mesh geometry={capsule(0.13, 0.32)} material={body} position={[-0.18, 0.28, 0]} />
      <mesh geometry={capsule(0.13, 0.32)} material={body} position={[0.18, 0.28, 0]} />
      {/* Torso */}
      <RoundedBox args={[0.92, 0.82, 0.5]} radius={0.2} smoothness={4} material={body} position={[0, 0.92, 0]} />
      {/* Arms */}
      <mesh geometry={capsule(0.11, 0.42)} material={body} position={[-0.58, 0.92, 0]} rotation={[0, 0, 0.25]} />
      <mesh geometry={capsule(0.11, 0.42)} material={body} position={[0.58, 0.92, 0]} rotation={[0, 0, -0.25]} />
      {/* Head */}
      <mesh geometry={sphere(0.4)} material={body} position={[0, 1.66, 0]} />

      <Text font={USER_FONT} characters="USER" fontSize={0.17} color="#FFFFFF" anchorX="center" anchorY="middle" position={[0, 1.68, 0.41]} outlineWidth={0.006} outlineColor="#000000" outlineOpacity={0.2}>
        USER
      </Text>
      <Text font={USER_FONT} characters="USER" fontSize={0.2} color="#FFFFFF" anchorX="center" anchorY="middle" position={[0, 0.95, 0.26]} outlineWidth={0.006} outlineColor="#000000" outlineOpacity={0.2}>
        USER
      </Text>
    </group>
  )
}

function UserFigure2D({ color, size }: { color: string; size: number }) {
  return (
    <Box sx={{ width: size, height: size * 1.15, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }} aria-hidden>
      <Box sx={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', bgcolor: color, display: 'grid', placeItems: 'center' }}>
        <Typography sx={{ color: '#FFF', fontSize: size * 0.13, fontWeight: 800 }}>USER</Typography>
      </Box>
      <Box sx={{ width: size * 0.62, height: size * 0.5, mt: '2px', borderRadius: '40% 40% 12px 12px', bgcolor: color, display: 'grid', placeItems: 'center' }}>
        <Typography sx={{ color: '#FFF', fontSize: size * 0.13, fontWeight: 800 }}>USER</Typography>
      </Box>
    </Box>
  )
}
