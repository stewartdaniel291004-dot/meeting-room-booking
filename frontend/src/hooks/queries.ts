import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/endpoints'
import type { ReservationFilters, ReservationRequest, RoomFilters } from '../types/api'

/** Query keys share a root per resource so a mutation can refresh everything that depends on it. */
export const queryKeys = {
  settings: ['settings'] as const,
  dashboard: ['dashboard'] as const,
  rooms: (filters: RoomFilters = {}) => ['rooms', 'list', filters] as const,
  room: (id: string) => ['rooms', 'detail', id] as const,
  floors: ['rooms', 'floors'] as const,
  occupancy: (start: string, end: string, floor?: number) => ['rooms', 'occupancy', start, end, floor] as const,
  availability: (roomId: string, start: string, end: string, excludeId?: number) =>
    ['rooms', 'availability', roomId, start, end, excludeId] as const,
  users: (search?: string) => ['users', 'list', search ?? ''] as const,
  user: (id: string) => ['users', 'detail', id] as const,
  reservations: (filters: ReservationFilters = {}) => ['reservations', 'list', filters] as const,
  roomUsage: (from?: string, to?: string) => ['analytics', 'room-usage', from, to] as const,
}

export const useSettings = () =>
  useQuery({ queryKey: queryKeys.settings, queryFn: api.getSettings, staleTime: Infinity })

export const useDashboardSummary = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: api.getDashboardSummary, refetchInterval: 60_000 })

export const useRooms = (filters: RoomFilters = {}) =>
  useQuery({ queryKey: queryKeys.rooms(filters), queryFn: () => api.getRooms(filters), placeholderData: keepPreviousData })

export const useRoom = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.room(id ?? ''), queryFn: () => api.getRoom(id!), enabled: Boolean(id) })

export const useFloors = () => useQuery({ queryKey: queryKeys.floors, queryFn: api.getFloors })

export const useOccupancy = (start: string | undefined, end: string | undefined, floor?: number) =>
  useQuery({
    queryKey: queryKeys.occupancy(start ?? '', end ?? '', floor),
    queryFn: () => api.getOccupancy(start!, end!, floor),
    enabled: Boolean(start && end && start < end),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

export const useAvailability = (roomId: string | undefined, start: string | undefined, end: string | undefined, excludeId?: number) =>
  useQuery({
    queryKey: queryKeys.availability(roomId ?? '', start ?? '', end ?? '', excludeId),
    queryFn: () => api.getAvailability(roomId!, start!, end!, excludeId),
    enabled: Boolean(roomId && start && end),
  })

export const useUsers = (search?: string) =>
  useQuery({ queryKey: queryKeys.users(search), queryFn: () => api.getUsers(search), placeholderData: keepPreviousData })

export const useUser = (id: string | undefined) =>
  useQuery({ queryKey: queryKeys.user(id ?? ''), queryFn: () => api.getUser(id!), enabled: Boolean(id) })

export const useReservations = (filters: ReservationFilters = {}, enabled = true) =>
  useQuery({
    queryKey: queryKeys.reservations(filters),
    queryFn: () => api.getReservations(filters),
    placeholderData: keepPreviousData,
    enabled,
  })

export const useRoomUsage = (from?: string, to?: string) =>
  useQuery({ queryKey: queryKeys.roomUsage(from, to), queryFn: () => api.getRoomUsage(from, to) })

/**
 * Reservation mutations. Any change can affect availability, counts, the dashboard and analytics,
 * so every success refreshes all data-bearing queries (settings excluded).
 */
export function useReservationMutations() {
  const queryClient = useQueryClient()
  const refresh = () =>
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.settings[0] })

  const create = useMutation({ mutationFn: (request: ReservationRequest) => api.createReservation(request), onSuccess: refresh })
  const update = useMutation({
    mutationFn: ({ id, request }: { id: number; request: ReservationRequest }) => api.updateReservation(id, request),
    onSuccess: refresh,
  })
  const cancel = useMutation({ mutationFn: (id: number) => api.cancelReservation(id), onSuccess: refresh })
  const endEarly = useMutation({ mutationFn: (id: number) => api.endReservationEarly(id), onSuccess: refresh })

  return { create, update, cancel, endEarly }
}
