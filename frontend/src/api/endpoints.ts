import type {
  DashboardSummary,
  Floor,
  Reservation,
  ReservationFilters,
  ReservationRequest,
  Room,
  RoomAvailability,
  RoomDetails,
  RoomFilters,
  RoomOccupancy,
  RoomUsageReport,
  Settings,
  User,
  UserDetails,
} from '../types/api'
import { cleanParams, http } from './client'

export const api = {
  getSettings: () => http.get<Settings>('/settings').then((r) => r.data),

  getDashboardSummary: () => http.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),

  getRooms: (filters: RoomFilters = {}) =>
    http.get<Room[]>('/rooms', { params: cleanParams(filters) }).then((r) => r.data),

  getRoom: (id: string) => http.get<RoomDetails>(`/rooms/${encodeURIComponent(id)}`).then((r) => r.data),

  getFloors: () => http.get<Floor[]>('/rooms/floors').then((r) => r.data),

  getOccupancy: (start: string, end: string, floor?: number) =>
    http.get<RoomOccupancy[]>('/rooms/occupancy', { params: cleanParams({ start, end, floor }) }).then((r) => r.data),

  getAvailability: (roomId: string, start: string, end: string, excludeReservationId?: number) =>
    http
      .get<RoomAvailability>(`/rooms/${encodeURIComponent(roomId)}/availability`, {
        params: cleanParams({ start, end, excludeReservationId }),
      })
      .then((r) => r.data),

  getUsers: (search?: string) => http.get<User[]>('/users', { params: cleanParams({ search }) }).then((r) => r.data),

  getUser: (id: string) => http.get<UserDetails>(`/users/${encodeURIComponent(id)}`).then((r) => r.data),

  getReservations: (filters: ReservationFilters = {}) =>
    http.get<Reservation[]>('/reservations', { params: cleanParams(filters) }).then((r) => r.data),

  createReservation: (request: ReservationRequest) =>
    http.post<Reservation>('/reservations', request).then((r) => r.data),

  updateReservation: (id: number, request: ReservationRequest) =>
    http.put<Reservation>(`/reservations/${id}`, request).then((r) => r.data),

  cancelReservation: (id: number) => http.post<Reservation>(`/reservations/${id}/cancel`).then((r) => r.data),

  endReservationEarly: (id: number) => http.post<Reservation>(`/reservations/${id}/end-early`).then((r) => r.data),

  getRoomUsage: (from?: string, to?: string) =>
    http.get<RoomUsageReport>('/analytics/room-usage', { params: cleanParams({ from, to }) }).then((r) => r.data),
}
