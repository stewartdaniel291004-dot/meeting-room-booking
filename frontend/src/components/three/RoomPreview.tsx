import { PerspectiveCamera, View } from '@react-three/drei'
import { Box, Typography } from '@mui/material'
import { Suspense } from 'react'
import { occupancyStyle } from '../../theme/tokens'
import type { Room, RoomOccupancyState } from '../../types/api'
import { box, colors3d, material } from './resources'
import { ROOM_DEPTH, ROOM_WIDTH, RoomModel } from './RoomModel'
import { isWebGLAvailable } from './webgl'

/**
 * Close-up of a single room in one visual state: empty (Available), green figures (meeting in progress)
 * or red figures (booked for the selected time).
 */
export function RoomPreview({
  room,
  state,
  people,
  height = 220,
  zoom = 1,
}: {
  room: Room
  state: RoomOccupancyState
  people: number
  height?: number | string
  zoom?: number
}) {
  if (!isWebGLAvailable()) {
    const style = occupancyStyle[state]
    return (
      <Box sx={{ height, borderRadius: 3, bgcolor: style.soft, display: 'grid', placeItems: 'center', border: `2px solid ${style.color}` }}>
        <Typography sx={{ color: style.color, fontWeight: 700 }}>{style.label}</Typography>
      </Box>
    )
  }

  const distance = 9.2 / zoom
  return (
    <View
      style={{
        height,
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #F6EBDB 0%, #E7D5BB 100%)',
      }}
    >
      <PerspectiveCamera makeDefault position={[0, distance * 0.78, distance]} fov={38} onUpdate={(camera) => camera.lookAt(0, 0.4, 0)} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#FFF6E8', '#BFA88A', 0.5]} />
      <directionalLight position={[5, 10, 6]} intensity={1.5} />
      <mesh geometry={box(ROOM_WIDTH + 3, 0.2, ROOM_DEPTH + 3)} material={material(colors3d.plate)} position={[0, -0.1, 0]} />
      <Suspense fallback={null}>
        <RoomModel room={room} state={state} people={people} variant="preview" />
      </Suspense>
    </View>
  )
}
