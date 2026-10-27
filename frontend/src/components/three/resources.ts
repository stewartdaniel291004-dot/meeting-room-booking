import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  type BufferGeometry,
} from 'three'

/**
 * Shared geometries and materials. The office has hundreds of chairs, people and wall panels; sharing
 * one instance per shape/colour keeps GPU memory and shader compiles low on ordinary laptops.
 * The set is small and lives for the whole session, so nothing is disposed.
 */
const geometries = new Map<string, BufferGeometry>()
const materials = new Map<string, MeshStandardMaterial>()

function cachedGeometry(key: string, create: () => BufferGeometry): BufferGeometry {
  let geometry = geometries.get(key)
  if (!geometry) {
    geometry = create()
    geometries.set(key, geometry)
  }
  return geometry
}

export const box = (w: number, h: number, d: number) => cachedGeometry(`box:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d))

export const sphere = (r: number) => cachedGeometry(`sphere:${r}`, () => new SphereGeometry(r, 24, 16))

export const cylinder = (top: number, bottom: number, h: number) =>
  cachedGeometry(`cyl:${top}:${bottom}:${h}`, () => new CylinderGeometry(top, bottom, h, 20))

export const capsule = (r: number, length: number) =>
  cachedGeometry(`capsule:${r}:${length}`, () => new CapsuleGeometry(r, length, 6, 14))

export const foliage = (r: number) => cachedGeometry(`foliage:${r}`, () => new IcosahedronGeometry(r, 1))

interface MaterialOptions {
  opacity?: number
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
}

export function material(color: string, options: MaterialOptions = {}): MeshStandardMaterial {
  const key = `${color}|${options.opacity ?? 1}|${options.emissive ?? ''}|${options.emissiveIntensity ?? 0}|${options.roughness ?? 0.8}|${options.metalness ?? 0}`
  let result = materials.get(key)
  if (!result) {
    const opacity = options.opacity ?? 1
    result = new MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.8,
      metalness: options.metalness ?? 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
    })
    materials.set(key, result)
  }
  return result
}

export const colors3d = {
  floorAvailable: '#E9DAC1',
  floorInProgress: '#BFE6C9',
  floorBooked: '#F2B9AF',
  floorInactive: '#D2CDC5',
  wall: '#F8F4EE',
  wallEdge: '#3B3631',
  glass: '#BFE3F0',
  wood: '#C8925A',
  woodDark: '#8D5F34',
  chair: '#3C3936',
  chairInactive: '#8E8A85',
  plant: '#3E9B4F',
  plantDark: '#2D7A3C',
  pot: '#EDE6DA',
  screen: '#1D2026',
  whiteboard: '#FFFFFF',
  personInProgress: '#2EB84D',
  personBooked: '#E5483B',
  selection: '#F5B82E',
  plate: '#DCCDB5',
  corridor: '#EFE6D8',
  sofa: '#8C7B6B',
} as const
