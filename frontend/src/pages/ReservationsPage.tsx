import { Box, Button, FormControl, InputAdornment, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { CalendarPlus, CalendarX, FilterX, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBookingDialog } from '../components/booking/BookingDialog'
import { PageHeader, SectionCard } from '../components/common/Panels'
import { EmptyState, ErrorState, TableSkeleton } from '../components/common/States'
import { ReservationsTable } from '../components/reservations/ReservationsTable'
import { useReservations, useRooms, useUsers } from '../hooks/queries'
import type { ReservationFilters, ReservationStatus } from '../types/api'
import { getOfficeTimeZone, officeDateToDayjs, officeDayBounds, officeNow, type OfficeDate } from '../utils/time'

const STATUSES: ReservationStatus[] = ['Booked', 'Completed', 'Cancelled']

export default function ReservationsPage() {
  const [params, setParams] = useSearchParams()
  const openBooking = useBookingDialog()
  const rooms = useRooms()
  const users = useUsers()
  const [searchText, setSearchText] = useState(params.get('search') ?? '')

  const fromDate = params.get('from') ?? undefined
  const toDate = params.get('to') ?? undefined
  const rangeInvalid = Boolean(fromDate && toDate && fromDate > toDate)

  // Filters are applied by the API; dates are whole office days, "to" inclusive.
  const filters: ReservationFilters = useMemo(
    () => ({
      roomId: params.get('roomId') ?? undefined,
      organizerId: params.get('organizerId') ?? undefined,
      status: (params.get('status') as ReservationStatus | null) ?? undefined,
      from: fromDate ? officeDayBounds(fromDate).start : undefined,
      to: toDate ? officeDayBounds(toDate).end : undefined,
      search: params.get('search') ?? undefined,
    }),
    [params, fromDate, toDate],
  )
  const reservations = useReservations(filters, !rangeInvalid)

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const preset = (fromOffset: number, toOffset: number) => {
    const today = officeNow()
    update({ from: today.add(fromOffset, 'day').format('YYYY-MM-DD'), to: today.add(toOffset, 'day').format('YYYY-MM-DD') })
  }

  const hasFilters = ['roomId', 'organizerId', 'status', 'from', 'to', 'search'].some((key) => params.has(key))

  const datePicker = (label: string, value: OfficeDate | undefined, key: 'from' | 'to') => (
    <DatePicker
      label={label}
      value={value ? officeDateToDayjs(value) : null}
      onChange={(date) => update({ [key]: date && date.isValid() ? date.format('YYYY-MM-DD') : undefined })}
      timezone={getOfficeTimeZone()}
      slotProps={{ textField: { size: 'small', sx: { width: 170 }, error: rangeInvalid }, field: { clearable: true } }}
    />
  )

  return (
    <>
      <PageHeader
        title="Reservations"
        description="Create, edit, cancel or end meetings early. Cancelled and completed reservations are kept for history and analytics."
        actions={
          <Button variant="contained" startIcon={<CalendarPlus size={18} />} onClick={() => openBooking()}>
            New reservation
          </Button>
        }
      />

      <SectionCard>
        <Stack spacing={1.5} sx={{ p: 2.5, pb: 2 }}>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search title, room or organizer"
              value={searchText}
              onChange={(e) => (setSearchText(e.target.value), update({ search: e.target.value.trim() || undefined }))}
              sx={{ width: { xs: '100%', sm: 260 } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="reservationspage-room-label">Room</InputLabel>
              <Select labelId="reservationspage-room-label" label="Room" value={params.get('roomId') ?? ''} onChange={(e) => update({ roomId: e.target.value || undefined })}>
                <MenuItem value="">All rooms</MenuItem>
                {(rooms.data ?? []).map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name} ({r.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="reservationspage-organizer-label">Organizer</InputLabel>
              <Select labelId="reservationspage-organizer-label" label="Organizer" value={params.get('organizerId') ?? ''} onChange={(e) => update({ organizerId: e.target.value || undefined })}>
                <MenuItem value="">All organizers</MenuItem>
                {(users.data ?? []).map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="reservationspage-status-label">Status</InputLabel>
              <Select labelId="reservationspage-status-label" label="Status" value={params.get('status') ?? ''} onChange={(e) => update({ status: e.target.value || undefined })}>
                <MenuItem value="">All statuses</MenuItem>
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {datePicker('From date', fromDate, 'from')}
            {datePicker('To date', toDate, 'to')}
            <Button size="small" onClick={() => preset(0, 0)}>
              Today
            </Button>
            <Button size="small" onClick={() => preset(0, 6)}>
              Next 7 days
            </Button>
            <Button size="small" onClick={() => preset(-7, -1)}>
              Past 7 days
            </Button>
            {hasFilters && (
              <Button size="small" color="inherit" startIcon={<FilterX size={16} />} onClick={() => (setSearchText(''), setParams(new URLSearchParams(), { replace: true }))}>
                Clear filters
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {reservations.data && !rangeInvalid ? `${reservations.data.length} reservation${reservations.data.length === 1 ? '' : 's'}` : ''}
            </Typography>
          </Stack>
          {rangeInvalid && (
            <Typography variant="caption" color="error">
              The “From” date must be on or before the “To” date.
            </Typography>
          )}
        </Stack>

        {rangeInvalid ? null : reservations.isPending ? (
          <TableSkeleton rows={8} />
        ) : reservations.isError ? (
          <ErrorState error={reservations.error} onRetry={() => reservations.refetch()} />
        ) : reservations.data.length === 0 ? (
          <EmptyState icon={CalendarX} title="No reservations found" description="Adjust or clear the filters to see more." />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <ReservationsTable reservations={reservations.data} />
          </Box>
        )}
      </SectionCard>
    </>
  )
}
