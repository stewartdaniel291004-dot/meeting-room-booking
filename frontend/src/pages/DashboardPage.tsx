import { Box, Button, LinearProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { ArrowRight, Building2, CalendarCheck, CalendarDays, ChartColumn, CircleCheck, DoorOpen, Timer, UserRound, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { BookingForm } from '../components/booking/BookingForm'
import { SectionCard, StatCard } from '../components/common/Panels'
import { EmptyState, ErrorState, LoadingState, TableSkeleton } from '../components/common/States'
import { ReservationStatusChip } from '../components/common/StatusBadges'
import { RoomDetailsPanel } from '../components/rooms/RoomDetailsPanel'
import { RoomsTable } from '../components/rooms/RoomsTable'
import { OfficeFloorPlan } from '../components/three/OfficeFloorPlan'
import { UsersTable } from '../components/users/UsersTable'
import { useDashboardSummary, useFloors, useOccupancy, useRooms, useUsers } from '../hooks/queries'
import { palette } from '../theme/tokens'
import type { RoomOccupancy } from '../types/api'
import { formatOfficeDate, formatRange, nowSlotIso, relativeToNow, slotToIso, defaultBookingSlot, type BookingSlot } from '../utils/time'

type TimeView = 'slot' | 'now'

export default function DashboardPage() {
  const summary = useDashboardSummary()
  const floors = useFloors()
  const rooms = useRooms()
  const users = useUsers()

  const [slot, setSlot] = useState<BookingSlot>(defaultBookingSlot)
  const [timeView, setTimeView] = useState<TimeView>('slot')
  const [floor, setFloor] = useState<number>()
  const [selectedRoomId, setSelectedRoomId] = useState<string>()
  const [nowIso, setNowIso] = useState(nowSlotIso)

  useEffect(() => {
    const id = window.setInterval(() => setNowIso(nowSlotIso()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Room states shown in 3D, the room table and the details panel all come from this one window.
  const slotIso = useMemo(() => slotToIso(slot), [slot])
  const viewIso = timeView === 'now' ? nowIso : slotIso
  const occupancy = useOccupancy(viewIso.start, viewIso.end)
  const occupancyMap = useMemo(() => new Map<string, RoomOccupancy>((occupancy.data ?? []).map((o) => [o.roomId, o])), [occupancy.data])

  const allRooms = useMemo(() => rooms.data ?? [], [rooms.data])
  const activeFloor = floor ?? (floors.data?.find((f) => f.floor === 3) ?? floors.data?.[0])?.floor
  const floorRooms = useMemo(() => allRooms.filter((r) => r.floor === activeFloor), [allRooms, activeFloor])
  const selectedRoom = floorRooms.find((r) => r.id === selectedRoomId) ?? floorRooms.find((r) => r.isActive) ?? floorRooms[0]

  const windowLabel =
    timeView === 'now' ? 'Right now' : `${formatOfficeDate(slot.startDate)} · ${slot.startTime}–${slot.endDate !== slot.startDate ? `${formatOfficeDate(slot.endDate)} ` : ''}${slot.endTime}`

  const changeFloor = (next: number) => {
    setFloor(next)
    setSelectedRoomId(undefined)
  }

  const stepRoom = (direction: 1 | -1) => {
    if (!selectedRoom || floorRooms.length === 0) return
    const index = floorRooms.findIndex((r) => r.id === selectedRoom.id)
    setSelectedRoomId(floorRooms[(index + direction + floorRooms.length) % floorRooms.length].id)
  }

  const s = summary.data
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Explore the office in 3D, check a room for your time slot and book it in one place.
        </Typography>
      </Box>

      {/* Headline numbers, all calculated by the backend */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' } }}>
        <StatCard icon={Building2} label="Total rooms" value={s?.totalRooms ?? '–'} hint={s ? `${s.activeRooms} active · ${s.inactiveRooms} inactive` : undefined} />
        <StatCard icon={CircleCheck} label="Available now" value={s?.availableNow ?? '–'} hint="active rooms without a meeting" color={palette.green} />
        <StatCard icon={Timer} label="Occupied now" value={s?.occupiedNow ?? '–'} hint="meetings in progress" color={palette.red} />
        <StatCard icon={CalendarCheck} label="Upcoming reservations" value={s?.upcomingReservations ?? '–'} hint={s ? `${s.meetingsToday} meetings today` : undefined} color={palette.blue} />
        <StatCard icon={Users} label="Users" value={s?.totalUsers ?? '–'} hint="can organize meetings" color={palette.charcoal} />
      </Box>
      {summary.isError && <ErrorState compact error={summary.error} onRetry={() => summary.refetch()} />}

      {/* 3D floor + selected room */}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.75fr) minmax(360px, 1fr)' } }}>
        <Stack spacing={1.25} sx={{ minWidth: 0 }}>
          <Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Click a room to select it. Drag to rotate, scroll to zoom, right-drag to pan.
            </Typography>
            <ToggleButtonGroup size="small" exclusive value={timeView} onChange={(_, v: TimeView | null) => v && setTimeView(v)} aria-label="Time shown on the floor plan">
              <ToggleButton value="slot">Selected booking time</ToggleButton>
              <ToggleButton value="now">Right now</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          {floors.isError || rooms.isError ? (
            <SectionCard>
              <ErrorState error={floors.error ?? rooms.error} onRetry={() => (floors.refetch(), rooms.refetch())} />
            </SectionCard>
          ) : activeFloor === undefined ? (
            <SectionCard>
              <LoadingState minHeight={420} label="Loading the office…" />
            </SectionCard>
          ) : (
            <OfficeFloorPlan
              floors={floors.data ?? []}
              floor={activeFloor}
              onFloorChange={changeFloor}
              rooms={floorRooms}
              occupancy={occupancyMap}
              selectedRoomId={selectedRoom?.id}
              onSelectRoom={setSelectedRoomId}
              windowLabel={windowLabel}
              loading={occupancy.isFetching}
              height={{ xs: 380, md: 560 }}
            />
          )}
        </Stack>

        <SectionCard contentSx={{ p: 2.5 }}>
          {selectedRoom ? (
            <RoomDetailsPanel
              room={selectedRoom}
              occupancy={occupancyMap.get(selectedRoom.id)}
              windowLabel={windowLabel}
              onPrevious={() => stepRoom(-1)}
              onNext={() => stepRoom(1)}
            />
          ) : (
            <EmptyState icon={DoorOpen} title="No room selected" description="Choose a room on the floor plan to see its details." />
          )}
        </SectionCard>
      </Box>

      {/* Rooms · Users · Booking, as in the reference layout */}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', xl: 'minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1.2fr)' } }}>
        <SectionCard title="Rooms" icon={DoorOpen} action={<ViewAll to="/rooms" />}>
          {rooms.isPending ? (
            <TableSkeleton />
          ) : (
            <RoomsTable compact rooms={floorRooms} occupancy={occupancyMap} selectedRoomId={selectedRoom?.id} onSelect={(r) => setSelectedRoomId(r.id)} />
          )}
        </SectionCard>

        <SectionCard title="Users" icon={UserRound} action={<ViewAll to="/users" />}>
          {users.isPending ? <TableSkeleton /> : users.isError ? <ErrorState compact error={users.error} /> : <UsersTable compact users={(users.data ?? []).slice(0, 6)} />}
        </SectionCard>

        <SectionCard title={selectedRoom ? `Book ${selectedRoom.name}` : 'Book a room'} icon={CalendarDays} contentSx={{ px: 2.5, pb: 2.5 }} sx={{ gridColumn: { md: '1 / -1', xl: 'auto' } }}>
          {selectedRoom?.isActive ? (
            <BookingForm rooms={allRooms} roomId={selectedRoom.id} slot={slot} onSlotChange={(next) => (setSlot(next), setTimeView('slot'))} />
          ) : (
            <EmptyState
              icon={DoorOpen}
              title={selectedRoom ? `${selectedRoom.name} is inactive` : 'Select a room'}
              description={selectedRoom ? 'Inactive rooms cannot be booked. Pick another room on the floor plan.' : 'Pick a room on the floor plan to book it.'}
            />
          )}
        </SectionCard>
      </Box>

      {/* Upcoming meetings + utilization summary */}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' } }}>
        <SectionCard title="Upcoming meetings" icon={CalendarCheck} action={<ViewAll to="/reservations?status=Booked" />} contentSx={{ px: 2.5, pb: 2 }}>
          {!s ? (
            <TableSkeleton rows={4} />
          ) : s.inProgressMeetings.length + s.upcomingMeetings.length === 0 ? (
            <EmptyState title="No upcoming meetings" />
          ) : (
            <Stack divider={<Box sx={{ borderTop: `1px solid ${palette.border}` }} />}>
              {[...s.inProgressMeetings, ...s.upcomingMeetings].slice(0, 7).map((r) => (
                <Stack key={r.id} direction="row" spacing={2} sx={{ alignItems: 'center', py: 1.25 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {r.meetingTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {r.roomName} · {r.organizerName} · {formatRange(r.startDateTime, r.endDateTime)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
                    {r.isInProgress ? `ends ${relativeToNow(r.endDateTime)}` : relativeToNow(r.startDateTime)}
                  </Typography>
                  <ReservationStatusChip reservation={r} />
                </Stack>
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard title="Room utilization" icon={ChartColumn} action={<ViewAll to="/analytics" />} contentSx={{ px: 2.5, pb: 2.5 }}>
          {!s ? (
            <TableSkeleton rows={4} />
          ) : (
            <Stack spacing={1.75}>
              <Typography variant="body2" color="text.secondary">
                Share of booked meeting time actually used (recorded end times). Low values mean rooms are booked but vacated early.
              </Typography>
              {s.utilizationHighlights.map((room) => (
                <Box key={room.roomId}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {room.roomName}
                      {room.isFrequentlyBookedRarelyUsed && (
                        <Typography component="span" variant="caption" sx={{ ml: 1, color: palette.red, fontWeight: 700 }}>
                          booked but rarely used
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {room.usageRatePercent === null ? 'no completed meetings' : `${room.usageRatePercent}% used · ${room.totalReservations} bookings`}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={room.usageRatePercent ?? 0}
                    aria-label={`${room.roomName} usage`}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: palette.greySoft,
                      '& .MuiLinearProgress-bar': { bgcolor: room.isFrequentlyBookedRarelyUsed ? palette.red : palette.green, borderRadius: 4 },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </SectionCard>
      </Box>
    </Stack>
  )
}

function ViewAll({ to }: { to: string }) {
  return (
    <Button component={RouterLink} to={to} size="small" endIcon={<ArrowRight size={16} />} sx={{ color: palette.orangeDark, flexShrink: 0 }}>
      View all
    </Button>
  )
}
