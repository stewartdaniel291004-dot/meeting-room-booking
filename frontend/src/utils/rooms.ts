import type { LucideIcon } from 'lucide-react'
import { Presentation, Projector, Tv, Video } from 'lucide-react'
import type { EquipmentType } from '../types/api'

export const EQUIPMENT: Record<EquipmentType, { label: string; icon: LucideIcon }> = {
  Projector: { label: 'Projector', icon: Projector },
  TvScreen: { label: 'TV screen', icon: Tv },
  VideoConferencing: { label: 'Video conferencing', icon: Video },
  Whiteboard: { label: 'Whiteboard', icon: Presentation },
}

export const EQUIPMENT_TYPES = Object.keys(EQUIPMENT) as EquipmentType[]

export const floorLabel = (floor: number) => {
  const suffix = floor % 10 === 1 && floor !== 11 ? 'st' : floor % 10 === 2 && floor !== 12 ? 'nd' : floor % 10 === 3 && floor !== 13 ? 'rd' : 'th'
  return `${floor}${suffix} Floor`
}
