import { Billboard, RoundedBox, Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { occupancyStyle } from '../../theme/tokens'
import type { Room, RoomOccupancyState } from '../../types/api'
import { Chair, Cone, LABEL_FONT, Plant, SeatedPerson } from './Furniture'
import { box, colors3d, material, sphere } from './resources'

export const ROOM_WIDTH = 9
export const ROOM_DEPTH = 7
const WALL_HEIGHT = 1.6
const WALL_THICKNESS = 0.14
const DOOR_WIDTH = 1.5

interface Seat {
  position: [number, number, number]
  rotationY: number
}

/** Table size and chair positions derived from the room's capacity. Chairs face the table. */
function useTableLayout(capacity: number) {
  return useMemo(() => {
    const ends = capacity >= 10 ? 2 : 0
    const perSide = Math.ceil((capacity - ends) / 2)
    const length = Math.max(1.6, perSide * 0.78)
    const width = capacity >= 10 ? 1.6 : 1.25
    const seats: Seat[] = []
    const sideZ = width / 2 + 0.42
    for (let i = 0; i < capacity - ends; i++) {
      const side = i % 2 === 0 ? 1 : -1
      const index = Math.floor(i / 2)
      const x = -length / 2 + (length / perSide) * (index + 0.5)
      seats.push({ position: [x, 0, side * sideZ], rotationY: side === 1 ? Math.PI : 0 })
    }
    if (ends) {
      seats.push({ position: [length / 2 + 0.5, 0, 0], rotationY: -Math.PI / 2 })
      seats.push({ position: [-length / 2 - 0.5, 0, 0], rotationY: Math.PI / 2 })
    }
    return { length, width, seats }
  }, [capacity])
}

const floorColors: Record<RoomOccupancyState, string> = {
  Available: colors3d.floorAvailable,
  InProgress: colors3d.floorInProgress,
  Booked: colors3d.floorBooked,
  Inactive: colors3d.floorInactive,
}

export interface RoomModelProps {
  room: Room
  state: RoomOccupancyState
  /** Number of figures to seat (attendees of the meeting shown). */
  people: number
  /** Front (glass wall + door) faces +z when 1, −z when −1. */
  facing?: 1 | -1
  selected?: boolean
  hovered?: boolean
  /** Floor-plan mode shows the floating name label; preview mode prints USER on the figures. */
  variant?: 'floor' | 'preview'
  onSelect?: (roomId: string) => void
  onHover?: (roomId: string | null) => void
}

export function RoomModel({
  room,
  state,
  people,
  facing = 1,
  selected = false,
  hovered = false,
  variant = 'floor',
  onSelect,
  onHover,
}: RoomModelProps) {
  const { length, width, seats } = useTableLayout(room.capacity)
  const inactive = state === 'Inactive'
  const personColor = state === 'Booked' ? colors3d.personBooked : colors3d.personInProgress
  const seated = state === 'InProgress' || state === 'Booked' ? Math.min(people, seats.length) : 0
  const has = (item: Room['equipment'][number]) => room.equipment.includes(item)
  const interactive = Boolean(onSelect)

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect?.(room.id)
  }

  const halfW = ROOM_WIDTH / 2
  const halfD = ROOM_DEPTH / 2
  const glassWidth = ROOM_WIDTH - DOOR_WIDTH - 0.6

  return (
    <group
      rotation={[0, facing === 1 ? 0 : Math.PI, 0]}
      onClick={interactive ? handleClick : undefined}
      onPointerOver={interactive ? (e) => (e.stopPropagation(), onHover?.(room.id)) : undefined}
      onPointerOut={interactive ? () => onHover?.(null) : undefined}
    >
      {/* Floor, tinted by state */}
      <mesh
        geometry={box(ROOM_WIDTH, 0.1, ROOM_DEPTH)}
        material={material(floorColors[state], hovered ? { emissive: '#FFFFFF', emissiveIntensity: 0.12 } : {})}
        position={[0, 0.05, 0]}
        receiveShadow
      />

      {/* Walls: solid back and sides, glass front with a door gap */}
      <mesh geometry={box(ROOM_WIDTH, WALL_HEIGHT, WALL_THICKNESS)} material={material(colors3d.wall)} position={[0, WALL_HEIGHT / 2, -halfD]} castShadow receiveShadow />
      <mesh geometry={box(WALL_THICKNESS, WALL_HEIGHT, ROOM_DEPTH)} material={material(colors3d.wall)} position={[-halfW, WALL_HEIGHT / 2, 0]} castShadow receiveShadow />
      <mesh geometry={box(WALL_THICKNESS, WALL_HEIGHT, ROOM_DEPTH)} material={material(colors3d.wall)} position={[halfW, WALL_HEIGHT / 2, 0]} castShadow receiveShadow />
      <mesh geometry={box(glassWidth, WALL_HEIGHT, 0.05)} material={material(colors3d.glass, { opacity: 0.28, roughness: 0.1 })} position={[-halfW + glassWidth / 2, WALL_HEIGHT / 2, halfD]} />
      <mesh geometry={box(0.6, WALL_HEIGHT, 0.05)} material={material(colors3d.glass, { opacity: 0.28, roughness: 0.1 })} position={[halfW - 0.3, WALL_HEIGHT / 2, halfD]} />
      <mesh geometry={box(ROOM_WIDTH, 0.05, 0.08)} material={material(colors3d.wallEdge)} position={[0, WALL_HEIGHT, halfD]} />
      <mesh geometry={box(ROOM_WIDTH, 0.05, 0.16)} material={material(colors3d.wallEdge)} position={[0, WALL_HEIGHT, -halfD]} />
      <mesh geometry={box(0.16, 0.05, ROOM_DEPTH)} material={material(colors3d.wallEdge)} position={[-halfW, WALL_HEIGHT, 0]} />
      <mesh geometry={box(0.16, 0.05, ROOM_DEPTH)} material={material(colors3d.wallEdge)} position={[halfW, WALL_HEIGHT, 0]} />

      {/* Meeting table and chairs */}
      <mesh geometry={box(length, 0.08, width)} material={material(inactive ? colors3d.chairInactive : colors3d.wood, { roughness: 0.6 })} position={[0, 0.76, 0]} castShadow receiveShadow />
      <mesh geometry={box(Math.max(0.4, length - 1), 0.7, 0.3)} material={material(colors3d.woodDark)} position={[0, 0.37, 0]} />
      {seats.map((seat, i) => (
        <Chair key={i} position={seat.position} rotationY={seat.rotationY} color={inactive ? colors3d.chairInactive : colors3d.chair} />
      ))}

      {/* People only when the time slot is taken */}
      {seats.slice(0, seated).map((seat, i) => (
        <SeatedPerson key={i} position={seat.position} rotationY={seat.rotationY} color={personColor} label={variant === 'preview'} />
      ))}

      {/* Equipment, so the room's capabilities are visible at a glance */}
      {has('TvScreen') && (
        <group position={[has('Projector') ? -1.5 : 0, 1.0, -halfD + 0.12]}>
          <mesh geometry={box(2.1, 1.15, 0.06)} material={material(colors3d.screen, { roughness: 0.3 })} />
          <mesh geometry={box(1.95, 1.0, 0.02)} material={material('#2E4A6B', { emissive: '#3C6EA8', emissiveIntensity: 0.35 })} position={[0, 0, 0.035]} />
        </group>
      )}
      {has('Projector') && (
        <>
          <group position={[has('TvScreen') ? 1.5 : 0, 1.0, -halfD + 0.1]}>
            <mesh geometry={box(2.3, 1.25, 0.03)} material={material('#FFFFFF', { roughness: 0.9 })} />
            <mesh geometry={box(2.4, 0.08, 0.08)} material={material('#5A5550')} position={[0, 0.66, 0]} />
          </group>
          <mesh geometry={box(0.36, 0.12, 0.3)} material={material('#D9D4CC', { metalness: 0.3 })} position={[0, 0.86, 0]} castShadow />
        </>
      )}
      {has('VideoConferencing') && (
        <mesh geometry={box(0.42, 0.12, 0.12)} material={material('#121417')} position={[has('TvScreen') && has('Projector') ? -1.5 : 0, has('TvScreen') ? 1.66 : 1.75, -halfD + 0.14]} />
      )}
      {has('Whiteboard') && (
        <group position={[-halfW + 0.1, 1.0, -0.6]} rotation={[0, Math.PI / 2, 0]}>
          <mesh geometry={box(2.4, 1.15, 0.04)} material={material(colors3d.whiteboard, { roughness: 0.25 })} />
          <mesh geometry={box(2.4, 0.05, 0.12)} material={material('#A8A29A')} position={[0, -0.6, 0.05]} />
        </group>
      )}

      <Plant position={[halfW - 0.55, 0.1, -halfD + 0.55]} scale={0.9} />
      <Plant position={[-halfW + 0.55, 0.1, halfD - 0.55]} scale={0.75} />
      {inactive && (
        <>
          <Cone position={[halfW - 1.4, 0.1, halfD - 0.6]} />
          <Cone position={[-halfW + 1.6, 0.1, -halfD + 0.9]} />
        </>
      )}

      {selected && <SelectionFrame />}

      {variant === 'floor' && (
        <Suspense fallback={null}>
          <RoomLabel room={room} state={state} selected={selected} />
        </Suspense>
      )}
    </group>
  )
}

function SelectionFrame() {
  const glow = material(colors3d.selection, { emissive: colors3d.selection, emissiveIntensity: 0.9 })
  const halfW = ROOM_WIDTH / 2
  const halfD = ROOM_DEPTH / 2
  return (
    <group position={[0, 0.14, 0]}>
      <mesh geometry={box(ROOM_WIDTH + 0.3, 0.08, 0.16)} material={glow} position={[0, 0, halfD + 0.15]} />
      <mesh geometry={box(ROOM_WIDTH + 0.3, 0.08, 0.16)} material={glow} position={[0, 0, -halfD - 0.15]} />
      <mesh geometry={box(0.16, 0.08, ROOM_DEPTH + 0.3)} material={glow} position={[halfW + 0.15, 0, 0]} />
      <mesh geometry={box(0.16, 0.08, ROOM_DEPTH + 0.3)} material={glow} position={[-halfW - 0.15, 0, 0]} />
    </group>
  )
}

/**
 * Floating name tag, drawn in the scene and always facing the camera. (DOM overlays per room were
 * unreliable: each one is a separate React root.) Clicks reach the room's group handler.
 */
function RoomLabel({ room, state, selected }: { room: Room; state: RoomOccupancyState; selected: boolean }) {
  const style = occupancyStyle[state]
  const width = Math.max(2.6, room.name.length * 0.27 + 1.3)
  return (
    <Billboard position={[0, 3.1, 0]} scale={1.7}>
      {selected && <RoundedBox args={[width + 0.22, 1.37, 0.03]} radius={0.24} smoothness={4} material={material(colors3d.selection)} position={[0, 0, -0.03]} />}
      <RoundedBox args={[width, 1.15, 0.04]} radius={0.2} smoothness={4} material={material('#26231F', { opacity: 0.9 })} />
      <mesh geometry={sphere(0.15)} material={material(style.color, { emissive: style.color, emissiveIntensity: 0.4 })} position={[-width / 2 + 0.38, 0.17, 0.05]} />
      <Text font={LABEL_FONT} fontSize={0.36} color="#FFFFFF" anchorX="left" anchorY="middle" position={[-width / 2 + 0.68, 0.19, 0.04]}>
        {room.name}
      </Text>
      <Text font={LABEL_FONT} fontSize={0.27} color="#D9D2C7" anchorX="left" anchorY="middle" position={[-width / 2 + 0.68, -0.22, 0.04]}>
        {state === 'Inactive' ? 'Inactive' : `${room.capacity} seats`}
      </Text>
    </Billboard>
  )
}
