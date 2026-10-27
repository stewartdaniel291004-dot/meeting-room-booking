// Types mirroring the backend DTOs. All timestamps are ISO 8601 strings in UTC.

export type EquipmentType = 'Projector' | 'TvScreen' | 'VideoConferencing' | 'Whiteboard'

export type ReservationStatus = 'Booked' | 'Completed' | 'Cancelled'

export type RoomOccupancyState = 'Available' | 'InProgress' | 'Booked' | 'Inactive'

export interface Room {
  id: string
  name: string
  capacity: number
  floor: number
  location: string
  equipment: EquipmentType[]
  isActive: boolean
}

export interface RoomDetails {
  room: Room
  currentReservation: Reservation | null
  upcomingReservations: Reservation[]
}

export interface Floor {
  floor: number
  roomCount: number
  activeRoomCount: number
}

export interface RoomOccupancy {
  roomId: string
  state: RoomOccupancyState
  reservation: Reservation | null
}

export interface RoomAvailability {
  roomId: string
  start: string
  end: string
  isAvailable: boolean
  reasons: ErrorDetail[]
  conflictingReservations: Reservation[]
}

export interface User {
  id: string
  firstName: string
  lastName: string
  fullName: string
  activeReservationCount: number
}

export interface UserDetails {
  user: User
  activeReservations: Reservation[]
}

export interface Reservation {
  id: number
  roomId: string
  roomName: string
  roomFloor: number
  organizerId: string
  organizerName: string
  meetingTitle: string
  startDateTime: string
  endDateTime: string
  actualEndDateTime: string | null
  attendeeCount: number
  status: ReservationStatus
  isInProgress: boolean
  endedEarly: boolean
  canCancel: boolean
  canEndEarly: boolean
  canEdit: boolean
}

export interface ReservationRequest {
  roomId: string
  organizerId: string
  meetingTitle: string
  startDateTime: string
  endDateTime: string
  attendeeCount: number
}

export interface RoomUsage {
  roomId: string
  roomName: string
  floor: number
  capacity: number
  isActive: boolean
  totalReservations: number
  upcomingReservations: number
  completedMeetings: number
  cancelledReservations: number
  earlyEndedMeetings: number
  plannedHours: number
  actualHours: number
  unusedHours: number
  usageRatePercent: number | null
  cancellationRatePercent: number | null
  averageSeatFillPercent: number | null
  isFrequentlyBookedRarelyUsed: boolean
  flagReasons: string[]
}

export interface RoomUsageReport {
  generatedAt: string
  from: string | null
  to: string | null
  thresholds: {
    minimumReservationsForFlag: number
    lowUsageThresholdPercent: number
    highCancellationThresholdPercent: number
  }
  totals: {
    totalReservations: number
    completedMeetings: number
    cancelledReservations: number
    earlyEndedMeetings: number
    plannedHours: number
    actualHours: number
    usageRatePercent: number | null
    flaggedRooms: number
  }
  rooms: RoomUsage[]
}

export interface DashboardSummary {
  generatedAt: string
  totalRooms: number
  activeRooms: number
  inactiveRooms: number
  availableNow: number
  occupiedNow: number
  upcomingReservations: number
  meetingsToday: number
  totalUsers: number
  inProgressMeetings: Reservation[]
  upcomingMeetings: Reservation[]
  utilizationHighlights: RoomUsage[]
}

export interface Settings {
  maximumDurationDays: number
  maximumBookingHorizonDays: number
  officeTimeZone: string
  serverTimeUtc: string
}

export interface ErrorDetail {
  code: string
  message: string
  field?: string | null
}

export interface ErrorResponse {
  code: string
  message: string
  details: ErrorDetail[]
}

export interface RoomFilters {
  minCapacity?: number
  floor?: number
  equipment?: EquipmentType[]
  isActive?: boolean
  search?: string
}

export interface ReservationFilters {
  roomId?: string
  organizerId?: string
  status?: ReservationStatus
  from?: string
  to?: string
  search?: string
}
