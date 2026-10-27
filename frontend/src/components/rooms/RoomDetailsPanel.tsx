import { Box, Button, ButtonBase, Divider, IconButton, Stack, Typography } from '@mui/material'
import { CalendarPlus, ChevronLeft, ChevronRight, MapPin, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useRoom } from '../../hooks/queries'
import { occupancyStyle, palette } from '../../theme/tokens'
import type { Reservation, Room, RoomOccupancy, RoomOccupancyState } from '../../types/api'
import { floorLabel } from '../../utils/rooms'
import { formatRange, formatTime, relativeToNow } from '../../utils/time'
import { EquipmentChips, StatusDot } from '../common/StatusBadges'
import { RoomPreview } from '../three/RoomPreview'

const PREVIEW_STATES: { state: RoomOccupancyState; label: string }[] = [
  { state: 'Available', label: 'Empty (Available)' },
  { state: 'InProgress', label: 'During booking' },
  { state: 'Booked', label: 'Booked (Full)' },
]

const stateLabel = (state: RoomOccupancyState) => (state === 'InProgress' ? 'During Booking' : occupancyStyle[state].label)

export function RoomDetailsPanel({
  room,
  occupancy,
  windowLabel,
  onPrevious,
  onNext,
  onBook,
  previewHeight = 230,
}: {
  room: Room
  /** The room's state for the selected time window. */
  occupancy?: RoomOccupancy
  windowLabel?: string
  onPrevious?: () => void
  onNext?: () => void
  onBook?: () => void
  previewHeight?: number
}) {
  const details = useRoom(room.id)
  const actual: RoomOccupancyState = occupancy?.state ?? (room.isActive ? 'Available' : 'Inactive')
  // Thumbnails let the user preview the other visual states; the actual one is highlighted.
  const [previewOverride, setPreviewOverride] = useState<{ roomId: string; state: RoomOccupancyState } | null>(null)
  const previewState = previewOverride?.roomId === room.id ? previewOverride.state : actual
  const isExample = previewState !== actual

  const people = (state: RoomOccupancyState) => {
    if (state === 'Available' || state === 'Inactive') return 0
    if (state === actual && occupancy?.reservation) return occupancy.reservation.attendeeCount
    return state === 'Booked' ? room.capacity : Math.max(1, Math.ceil(room.capacity * 0.7))
  }

  const style = occupancyStyle[actual]
  const current = details.data?.currentReservation
  const upcoming = details.data?.upcomingReservations ?? []

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h2" component="h2" sx={{ fontSize: '1.6rem' }}>
              {room.name}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusDot color={style.color} label={stateLabel(actual)} size={12} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ bgcolor: palette.greySoft, px: 1, py: 0.5, borderRadius: 1.5, fontWeight: 600 }}>
            {room.id}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2.5} sx={{ flexWrap: 'wrap', mt: 1.25, color: 'text.secondary' }} useFlexGap>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <UsersRound size={17} />
            <Typography variant="body2">{room.capacity} seats</Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <MapPin size={17} />
            <Typography variant="body2">
              {floorLabel(room.floor)} · {room.location}
            </Typography>
          </Stack>
        </Stack>
        <Box sx={{ mt: 1.5 }}>
          <EquipmentChips equipment={room.equipment} />
        </Box>
      </Box>

      <Box sx={{ position: 'relative' }}>
        <RoomPreview room={room} state={previewState} people={people(previewState)} height={previewHeight} />
        {onPrevious && (
          <IconButton onClick={onPrevious} aria-label="Previous room" sx={arrowSx('left')}>
            <ChevronLeft size={20} />
          </IconButton>
        )}
        {onNext && (
          <IconButton onClick={onNext} aria-label="Next room" sx={arrowSx('right')}>
            <ChevronRight size={20} />
          </IconButton>
        )}
        {isExample && (
          <Typography
            variant="caption"
            sx={{ position: 'absolute', left: 10, top: 10, zIndex: 6, bgcolor: 'rgba(38,35,31,0.8)', color: '#FFF', px: 1, py: 0.25, borderRadius: 1 }}
          >
            Example view · actual: {stateLabel(actual)}
          </Typography>
        )}
      </Box>

      {room.isActive ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25 }}>
          {PREVIEW_STATES.map(({ state, label }) => {
            const isActual = state === actual
            const s = occupancyStyle[state]
            return (
              <ButtonBase
                key={state}
                onClick={() => setPreviewOverride(isActual ? null : { roomId: room.id, state })}
                aria-pressed={previewState === state}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  border: `2px solid ${isActual ? s.color : previewState === state ? palette.amber : palette.border}`,
                  bgcolor: isActual ? s.soft : palette.surface,
                }}
              >
                <RoomPreview room={room} state={state} people={people(state)} height={74} zoom={0.92} />
                <Typography variant="caption" sx={{ py: 0.75, fontWeight: 600, color: isActual ? s.color : 'text.primary' }}>
                  {label}
                </Typography>
              </ButtonBase>
            )
          })}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: palette.textSecondary, bgcolor: palette.greySoft, p: 1.5, borderRadius: 2 }}>
          This room is inactive (for example, under renovation) and cannot be booked.
        </Typography>
      )}

      <Divider />

      <Stack spacing={1.25}>
        {windowLabel && (
          <SlotSummary state={actual} reservation={occupancy?.reservation ?? null} windowLabel={windowLabel} />
        )}
        {current && (
          <InfoLine label="Now" text={`${current.meetingTitle} · ${current.organizerName} · until ${formatTime(current.endDateTime)}`} color={palette.green} />
        )}
        <Typography variant="subtitle2" sx={{ pt: 0.5 }}>
          Upcoming reservations
        </Typography>
        {upcoming.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {details.isPending ? 'Loading…' : 'Nothing booked yet.'}
          </Typography>
        ) : (
          upcoming.slice(0, 3).map((r) => (
            <InfoLine key={r.id} label={relativeToNow(r.startDateTime)} text={`${formatRange(r.startDateTime, r.endDateTime)} · ${r.meetingTitle}`} color={palette.red} />
          ))
        )}
      </Stack>

      {onBook && room.isActive && (
        <Button variant="contained" startIcon={<CalendarPlus size={18} />} onClick={onBook} size="large">
          Book {room.name}
        </Button>
      )}
    </Stack>
  )
}

function SlotSummary({ state, reservation, windowLabel }: { state: RoomOccupancyState; reservation: Reservation | null; windowLabel: string }) {
  const style = occupancyStyle[state]
  const text =
    state === 'Available'
      ? 'Free for this time. Backend rules are checked again when you book.'
      : state === 'Inactive'
        ? 'Not bookable.'
        : reservation
          ? `${reservation.meetingTitle} · ${reservation.organizerName} · ${formatRange(reservation.startDateTime, reservation.actualEndDateTime ?? reservation.endDateTime)}`
          : style.label
  return <InfoLine label={windowLabel} text={text} color={style.color} />
}

function InfoLine({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2">{text}</Typography>
      </Box>
    </Stack>
  )
}

const arrowSx = (side: 'left' | 'right') => ({
  position: 'absolute' as const,
  top: '50%',
  [side]: 10,
  transform: 'translateY(-50%)',
  bgcolor: 'rgba(255,253,249,0.95)',
  boxShadow: 2,
  zIndex: 6,
  '&:hover': { bgcolor: '#FFF' },
})
