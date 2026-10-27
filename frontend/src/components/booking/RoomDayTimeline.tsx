import { Box, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useReservations } from '../../hooks/queries'
import { palette, tableColors } from '../../theme/tokens'
import { formatRange, officeDayBounds, toOffice, type OfficeDate } from '../../utils/time'

const DAY_START = 7
const DAY_END = 21

/**
 * The selected room's bookings for one office day (07:00–21:00), with the requested slot overlaid,
 * so a free time can be spotted before submitting.
 */
export function RoomDayTimeline({
  roomId,
  date,
  selection,
  excludeReservationId,
}: {
  roomId: string
  date: OfficeDate
  selection?: { start: string; end: string }
  excludeReservationId?: number
}) {
  const bounds = officeDayBounds(date)
  const reservations = useReservations({ roomId, from: bounds.start, to: bounds.end })
  const dayStart = dayjs(bounds.start).add(DAY_START, 'hour')
  const span = (DAY_END - DAY_START) * 60

  const toPercent = (iso: string) => {
    const minutes = dayjs(iso).diff(dayStart, 'minute')
    return Math.min(100, Math.max(0, (minutes / span) * 100))
  }

  const blocks = (reservations.data ?? []).filter((r) => r.status !== 'Cancelled' && r.id !== excludeReservationId)

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Room schedule · {toOffice(bounds.start).format('ddd D MMM')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {blocks.length === 0 ? 'No bookings' : `${blocks.length} booking${blocks.length > 1 ? 's' : ''}`}
        </Typography>
      </Stack>
      {reservations.isPending ? (
        <Skeleton variant="rounded" height={30} />
      ) : (
        <Box sx={{ position: 'relative', height: 30, borderRadius: 1.5, bgcolor: palette.greenSoft, overflow: 'hidden', border: `1px solid ${palette.border}` }}>
          {blocks.map((r) => {
            const left = toPercent(r.startDateTime)
            const right = toPercent(r.actualEndDateTime ?? r.endDateTime)
            if (right <= left) return null
            return (
              <Tooltip key={r.id} title={`${r.meetingTitle} · ${r.organizerName} · ${formatRange(r.startDateTime, r.actualEndDateTime ?? r.endDateTime)}`}>
                <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${right - left}%`, bgcolor: tableColors.statusBooked, opacity: 0.85 }} />
              </Tooltip>
            )
          })}
          {selection && toPercent(selection.end) > toPercent(selection.start) && (
            <Box
              sx={{
                position: 'absolute',
                top: 2,
                bottom: 2,
                left: `${toPercent(selection.start)}%`,
                width: `${toPercent(selection.end) - toPercent(selection.start)}%`,
                border: `2px solid ${palette.amber}`,
                bgcolor: 'rgba(245,184,46,0.28)',
                borderRadius: 1,
              }}
              aria-label="Selected time"
            />
          )}
        </Box>
      )}
      <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
        {[7, 9, 11, 13, 15, 17, 19, 21].map((h) => (
          <Typography key={h} variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
            {String(h).padStart(2, '0')}:00
          </Typography>
        ))}
      </Stack>
    </Box>
  )
}
