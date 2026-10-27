import type { Room } from '../../types/api'
import { ROOM_DEPTH, ROOM_WIDTH } from './RoomModel'

export interface RoomPlacement {
  room: Room
  x: number
  z: number
  /** Which way the glass front faces: towards the corridor. */
  facing: 1 | -1
}

const COLUMNS = 3
const COLUMN_GAP = 1.5
const CORRIDOR = 6

/**
 * Lays rooms out in rows of three on either side of a central corridor (two rows per corridor).
 * Positions come purely from the order of the rooms, so any number of rooms from the API fits.
 */
export function layoutFloor(rooms: Room[]): { placements: RoomPlacement[]; emptySlots: { x: number; z: number }[]; width: number; depth: number } {
  const sorted = [...rooms].sort((a, b) => a.id.localeCompare(b.id))
  const slotCount = Math.max(6, Math.ceil(sorted.length / COLUMNS) * COLUMNS)
  const rows = slotCount / COLUMNS
  const corridors = Math.ceil(rows / 2)
  const blockDepth = ROOM_DEPTH * 2 + CORRIDOR + 3

  const slot = (index: number) => {
    const column = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    const block = Math.floor(row / 2)
    const isFirstRowOfBlock = row % 2 === 0
    const blockCenter = (block - (corridors - 1) / 2) * blockDepth
    const offset = CORRIDOR / 2 + ROOM_DEPTH / 2
    return {
      x: (column - (COLUMNS - 1) / 2) * (ROOM_WIDTH + COLUMN_GAP),
      z: blockCenter + (isFirstRowOfBlock ? -offset : offset),
      facing: (isFirstRowOfBlock ? 1 : -1) as 1 | -1,
    }
  }

  const placements = sorted.map((room, index) => ({ room, ...slot(index) }))
  const emptySlots = Array.from({ length: slotCount - sorted.length }, (_, i) => {
    const { x, z } = slot(sorted.length + i)
    return { x, z }
  })

  return {
    placements,
    emptySlots,
    width: COLUMNS * ROOM_WIDTH + (COLUMNS - 1) * COLUMN_GAP + 4,
    depth: corridors * blockDepth + 1,
  }
}
