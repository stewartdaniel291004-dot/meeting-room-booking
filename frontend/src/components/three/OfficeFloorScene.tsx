import { CameraControls, useCursor } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RoomOccupancy } from '../../types/api'
import { CoffeeTable, Plant, Sofa } from './Furniture'
import { layoutFloor, type RoomPlacement } from './floorLayout'
import { box, colors3d, material } from './resources'
import { ROOM_DEPTH, RoomModel } from './RoomModel'
import type { Room } from '../../types/api'

export type CameraMode = 'overview' | 'room'

export interface CameraCommand {
  mode: CameraMode
  /** Changes on every request, so asking for the same mode again (e.g. "reset") still moves the camera. */
  token: number
}

interface OfficeFloorSceneProps {
  rooms: Room[]
  occupancy: Map<string, RoomOccupancy>
  selectedRoomId?: string
  onSelectRoom: (roomId: string) => void
  camera: CameraCommand
}

const OVERVIEW = { position: [0, 25, 25] as const, target: [0, 0, 1] as const }

/**
 * The interactive floor: rotate (left drag), zoom (wheel / pinch), pan (right drag / two fingers).
 * Rendering is on demand, so an idle floor plan costs nothing.
 */
export function OfficeFloorScene(props: OfficeFloorSceneProps) {
  return (
    <Canvas
      shadows="percentage"
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [...OVERVIEW.position], fov: 40, near: 0.5, far: 200 }}
      style={{ touchAction: 'none' }}
    >
      <FloorContents {...props} />
    </Canvas>
  )
}

function FloorContents({ rooms, occupancy, selectedRoomId, onSelectRoom, camera }: OfficeFloorSceneProps) {
  const controls = useRef<CameraControls>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  useCursor(Boolean(hovered))

  const layout = useMemo(() => layoutFloor(rooms), [rooms])
  // Narrow (portrait) canvases need the overview camera further back to fit the whole floor.
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height))
  const distance = Math.min(2.2, Math.max(1, 1.45 / aspect))
  const selected = layout.placements.find((p) => p.room.id === selectedRoomId)

  // Move the camera only when asked (button press or floor change), never on plain selection.
  const floorKey = rooms.map((r) => r.id).join(',')
  useEffect(() => {
    const target =
      camera.mode === 'room' && selected
        ? roomView(selected)
        : { position: OVERVIEW.position.map((v) => v * distance) as [number, number, number], target: OVERVIEW.target }
    const [px, py, pz] = target.position
    const [tx, ty, tz] = target.target
    controls.current?.setLookAt(px, py, pz, tx, ty, tz, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selection alone must not move the camera
  }, [camera.token, camera.mode, floorKey, distance])

  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#FFF6E8', '#BFA88A', 0.6]} />
      <directionalLight
        position={[14, 26, 12]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-bias={-0.0004}
      />

      <CameraControls
        ref={controls}
        makeDefault
        minDistance={7}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.25}
        dollySpeed={0.6}
      />

      {/* Building plate and corridor */}
      <mesh geometry={box(layout.width, 0.3, layout.depth)} material={material(colors3d.plate)} position={[0, -0.15, 0]} receiveShadow />
      <mesh geometry={box(layout.width - 1, 0.02, 5.2)} material={material(colors3d.corridor)} position={[0, 0.01, 0]} receiveShadow />
      {[-15.5, 15.5].map((x) => (
        <Plant key={x} position={[x, 0, 0]} scale={1.2} />
      ))}
      {[-5.25, 5.25].map((x) => (
        <Plant key={x} position={[x, 0, 2.2]} scale={0.8} />
      ))}

      {/* Free slots become shared lounge areas */}
      {layout.emptySlots.map(({ x, z }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh geometry={box(8.6, 0.04, ROOM_DEPTH - 0.4)} material={material('#E4D6C0')} position={[0, 0.02, 0]} receiveShadow />
          <Sofa position={[0, 0, -1.6]} />
          <Sofa position={[0, 0, 1.6]} rotationY={Math.PI} />
          <CoffeeTable position={[0, 0, 0]} />
          <Plant position={[3.4, 0, -2.4]} />
          <Plant position={[-3.4, 0, 2.4]} scale={0.9} />
        </group>
      ))}

      {layout.placements.map((placement) => {
        const info = occupancy.get(placement.room.id)
        const state = info?.state ?? (placement.room.isActive ? 'Available' : 'Inactive')
        return (
          <group key={placement.room.id} position={[placement.x, 0, placement.z]}>
            <RoomModel
              room={placement.room}
              state={state}
              people={info?.reservation?.attendeeCount ?? 0}
              facing={placement.facing}
              selected={placement.room.id === selectedRoomId}
              hovered={placement.room.id === hovered}
              onSelect={onSelectRoom}
              onHover={setHovered}
            />
          </group>
        )
      })}
    </>
  )
}

function roomView({ x, z, facing }: RoomPlacement) {
  // Look through the glass front, slightly from above.
  return { position: [x, 9.5, z + facing * 9.5] as const, target: [x, 0.6, z] as const }
}
