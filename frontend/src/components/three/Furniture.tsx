import { Text } from '@react-three/drei'
import interBold from '@fontsource/inter/files/inter-latin-800-normal.woff?url'
import interSemiBold from '@fontsource/inter/files/inter-latin-600-normal.woff?url'
import { Suspense } from 'react'
import { box, capsule, colors3d, cylinder, foliage, material, sphere } from './resources'

type Vec3 = [number, number, number]

export const USER_FONT = interBold
export const LABEL_FONT = interSemiBold

/** Office chair facing +z in local space (rotate the group to face the table). */
export function Chair({ position, rotationY = 0, color = colors3d.chair }: { position: Vec3; rotationY?: number; color?: string }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={box(0.5, 0.08, 0.5)} material={material(color)} position={[0, 0.45, 0]} castShadow />
      <mesh geometry={box(0.5, 0.55, 0.07)} material={material(color)} position={[0, 0.75, -0.24]} castShadow />
      <mesh geometry={cylinder(0.04, 0.04, 0.4)} material={material('#6B6661', { metalness: 0.4 })} position={[0, 0.22, 0]} />
    </group>
  )
}

/**
 * A stylised seated person facing +z. With `label`, "USER" is printed on the face and the torso,
 * matching the user figures used elsewhere in the app.
 */
export function SeatedPerson({
  position,
  rotationY = 0,
  color,
  label = false,
}: {
  position: Vec3
  rotationY?: number
  color: string
  label?: boolean
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={capsule(0.21, 0.32)} material={material(color, { roughness: 0.55 })} position={[0, 0.88, -0.04]} castShadow />
      <mesh geometry={sphere(0.2)} material={material(color, { roughness: 0.5 })} position={[0, 1.36, -0.02]} castShadow />
      <mesh geometry={capsule(0.08, 0.32)} material={material(color, { roughness: 0.55 })} position={[0.24, 0.86, 0.08]} rotation={[0.9, 0, 0]} />
      <mesh geometry={capsule(0.08, 0.32)} material={material(color, { roughness: 0.55 })} position={[-0.24, 0.86, 0.08]} rotation={[0.9, 0, 0]} />
      {label && (
        // The font loads lazily; the figure itself must not wait for it.
        <Suspense fallback={null}>
          <Text font={USER_FONT} characters="USER" fontSize={0.085} color="#FFFFFF" anchorX="center" anchorY="middle" position={[0, 1.37, 0.185]}>
            USER
          </Text>
          <Text font={USER_FONT} characters="USER" fontSize={0.09} color="#FFFFFF" anchorX="center" anchorY="middle" position={[0, 0.92, 0.18]}>
            USER
          </Text>
        </Suspense>
      )}
    </group>
  )
}

export function Plant({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh geometry={cylinder(0.24, 0.18, 0.42)} material={material(colors3d.pot)} position={[0, 0.21, 0]} castShadow />
      <mesh geometry={foliage(0.36)} material={material(colors3d.plant)} position={[0, 0.72, 0]} castShadow />
      <mesh geometry={foliage(0.26)} material={material(colors3d.plantDark)} position={[0.16, 1.02, 0.06]} castShadow />
      <mesh geometry={foliage(0.22)} material={material(colors3d.plant)} position={[-0.14, 1.1, -0.08]} castShadow />
    </group>
  )
}

export function Sofa({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={box(2.4, 0.4, 0.9)} material={material(colors3d.sofa)} position={[0, 0.3, 0]} castShadow />
      <mesh geometry={box(2.4, 0.55, 0.22)} material={material(colors3d.sofa)} position={[0, 0.65, -0.34]} castShadow />
      <mesh geometry={box(0.22, 0.6, 0.9)} material={material(colors3d.sofa)} position={[1.1, 0.4, 0]} />
      <mesh geometry={box(0.22, 0.6, 0.9)} material={material(colors3d.sofa)} position={[-1.1, 0.4, 0]} />
    </group>
  )
}

export function CoffeeTable({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh geometry={cylinder(0.6, 0.6, 0.06)} material={material(colors3d.wood)} position={[0, 0.42, 0]} castShadow />
      <mesh geometry={cylinder(0.08, 0.12, 0.4)} material={material(colors3d.woodDark)} position={[0, 0.2, 0]} />
    </group>
  )
}

export function Cone({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh geometry={cylinder(0.04, 0.22, 0.6)} material={material('#F28A1A')} position={[0, 0.3, 0]} castShadow />
      <mesh geometry={cylinder(0.11, 0.15, 0.1)} material={material('#FFFFFF')} position={[0, 0.3, 0]} />
      <mesh geometry={box(0.5, 0.04, 0.5)} material={material('#F28A1A')} position={[0, 0.02, 0]} />
    </group>
  )
}
