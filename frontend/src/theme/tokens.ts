import type { ReservationStatus, RoomOccupancyState } from '../types/api'

export const palette = {
  background: '#F3ECE1',
  surface: '#FFFDF9',
  surfaceMuted: '#FAF5EE',
  border: '#E9E0D3',
  charcoal: '#26231F',
  text: '#2B2824',
  textSecondary: '#6E675E',
  muted: '#A39A8E',
  orange: '#F28A1A',
  orangeDark: '#D9720A',
  orangeSoft: '#FFF0DE',
  amber: '#F5B82E',
  amberSoft: '#FDF1C7',
  green: '#22A447',
  greenDark: '#1E8E3E',
  greenSoft: '#E3F5E8',
  red: '#E5483B',
  redSoft: '#FBE0DA',
  blue: '#2F6FDB',
  grey: '#9E978C',
  greySoft: '#EFEBE5',
} as const

/**
 * The established table colours from the reference design. Every table reads from here so the
 * treatment stays identical everywhere — in particular the red booked-room rows. Do not recolour.
 */
export const tableColors = {
  headerBackground: '#F1E9DC',
  headerText: '#4A443C',
  rowHover: '#FBF6EE',
  rowSelected: '#FDF1C7',
  rowBooked: '#FBE0DA',
  rowInactive: '#F2EFEA',
  statusAvailable: '#22A447',
  statusInProgress: '#22A447',
  statusBooked: '#E5483B',
  statusInactive: '#9E978C',
  count: '#2F6FDB',
} as const

export const occupancyStyle: Record<RoomOccupancyState, { color: string; soft: string; label: string }> = {
  Available: { color: tableColors.statusAvailable, soft: palette.greenSoft, label: 'Available' },
  InProgress: { color: tableColors.statusInProgress, soft: palette.greenSoft, label: 'In progress' },
  Booked: { color: tableColors.statusBooked, soft: palette.redSoft, label: 'Booked' },
  Inactive: { color: tableColors.statusInactive, soft: palette.greySoft, label: 'Inactive' },
}

export const reservationStatusStyle: Record<ReservationStatus | 'InProgress', { color: string; soft: string; label: string }> = {
  Booked: { color: tableColors.statusBooked, soft: palette.redSoft, label: 'Booked' },
  InProgress: { color: tableColors.statusInProgress, soft: palette.greenSoft, label: 'In progress' },
  Completed: { color: '#5B6B7A', soft: '#E8EDF2', label: 'Completed' },
  Cancelled: { color: palette.grey, soft: palette.greySoft, label: 'Cancelled' },
}

/** Distinct, restrained colours for user figures. */
export const userColors = ['#2F6FDB', '#E5483B', '#22A447', '#F5A524', '#8B5CF6', '#14A3B8', '#E2669B', '#6B7280'] as const

export function colorForUser(userId: string): string {
  const index = [...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return userColors[index % userColors.length]
}

/** Row background for room tables: selected (yellow), booked (red), inactive (grey). */
export function roomRowBackground(options: { selected?: boolean; state?: RoomOccupancyState }): string | undefined {
  if (options.selected) return tableColors.rowSelected
  if (options.state === 'Booked') return tableColors.rowBooked
  if (options.state === 'Inactive') return tableColors.rowInactive
  return undefined
}
