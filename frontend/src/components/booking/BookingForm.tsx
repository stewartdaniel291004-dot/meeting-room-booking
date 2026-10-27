import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { CircleCheck, Clock, Minus, Plus, TriangleAlert, UsersRound } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { useOfficeSettings } from '../../context/OfficeSettings'
import { useAvailability, useReservationMutations, useUsers } from '../../hooks/queries'
import { palette } from '../../theme/tokens'
import type { Reservation, Room } from '../../types/api'
import { EQUIPMENT } from '../../utils/rooms'
import {
  TIME_OPTIONS,
  formatRange,
  getOfficeTimeZone,
  officeDateToDayjs,
  officeNow,
  officeToday,
  slotToIso,
  type BookingSlot,
  type OfficeTime,
} from '../../utils/time'
import { useToast } from '../common/ToastProvider'
import { RoomDayTimeline } from './RoomDayTimeline'

export interface BookingFormProps {
  rooms: Room[]
  roomId: string
  onRoomChange?: (roomId: string) => void
  /** Show a room dropdown (dialog) or rely on the room chosen elsewhere (dashboard). */
  showRoomSelect?: boolean
  slot: BookingSlot
  onSlotChange: (slot: BookingSlot) => void
  /** When set, the form edits this reservation instead of creating a new one. */
  reservation?: Reservation
  onSuccess?: (reservation: Reservation) => void
  submitLabel?: string
}

const toMinutes = (time: OfficeTime) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const fromMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * Booking form. It helps the user (hints, live availability) but never decides validity itself:
 * every submission goes to the backend, whose rule messages are shown verbatim.
 */
export function BookingForm({
  rooms,
  roomId,
  onRoomChange,
  showRoomSelect = false,
  slot,
  onSlotChange,
  reservation,
  onSuccess,
  submitLabel,
}: BookingFormProps) {
  const settings = useOfficeSettings()
  const formId = useId()
  const notify = useToast()
  const users = useUsers()
  const { create, update } = useReservationMutations()
  const mutation = reservation ? update : create

  const [organizerId, setOrganizerId] = useState(reservation?.organizerId ?? '')
  const [title, setTitle] = useState(reservation?.meetingTitle ?? '')
  const [attendees, setAttendees] = useState(reservation?.attendeeCount ?? 2)
  const [multiDay, setMultiDay] = useState(slot.startDate !== slot.endDate)
  const [submitError, setSubmitError] = useState<ApiError | null>(null)
  const [touched, setTouched] = useState(false)

  const room = rooms.find((r) => r.id === roomId)
  const iso = useMemo(() => slotToIso(slot), [slot])
  const availability = useAvailability(room?.id, iso.start, iso.end, reservation?.id)

  const today = officeToday()
  const horizonEnd = officeNow().add(settings.maximumBookingHorizonDays, 'day').format('YYYY-MM-DD')
  const nowMinutes = officeNow().hour() * 60 + officeNow().minute()

  const hints = {
    title: touched && !title.trim() ? 'Give the meeting a title.' : undefined,
    organizer: touched && !organizerId ? 'Choose who organizes the meeting.' : undefined,
    range: iso.end <= iso.start ? 'The end time must be after the start time.' : undefined,
    attendees:
      room && attendees > room.capacity
        ? `${room.name} seats at most ${room.capacity} people.`
        : attendees < 1
          ? 'At least one attendee is required.'
          : undefined,
  }

  const setStartDate = (startDate: string) => {
    const endDate = multiDay && slot.endDate > startDate ? slot.endDate : startDate
    onSlotChange({ ...slot, startDate, endDate })
  }

  const setStartTime = (startTime: OfficeTime) => {
    // Keep the meeting length when moving the start, if it still fits in the day.
    const length = slot.startDate === slot.endDate ? toMinutes(slot.endTime) - toMinutes(slot.startTime) : 0
    const end = toMinutes(startTime) + Math.max(length, 30)
    onSlotChange({
      ...slot,
      startTime,
      endTime: slot.startDate === slot.endDate && end < 24 * 60 ? fromMinutes(end) : slot.endTime,
    })
  }

  const toggleMultiDay = (checked: boolean) => {
    setMultiDay(checked)
    if (!checked) onSlotChange({ ...slot, endDate: slot.startDate })
  }

  const submit = async () => {
    setTouched(true)
    setSubmitError(null)
    if (!room || !title.trim() || !organizerId) return

    const request = {
      roomId: room.id,
      organizerId,
      meetingTitle: title.trim(),
      startDateTime: iso.start,
      endDateTime: iso.end,
      attendeeCount: attendees,
    }
    try {
      const saved = reservation
        ? await update.mutateAsync({ id: reservation.id, request })
        : await create.mutateAsync(request)
      notify(`${saved.roomName} ${reservation ? 'updated' : 'booked'}: ${formatRange(saved.startDateTime, saved.endDateTime)}`)
      if (!reservation) {
        setTitle('')
        setTouched(false)
      }
      onSuccess?.(saved)
    } catch (error) {
      // Keep everything the user typed; show the backend's explanation.
      setSubmitError(error instanceof ApiError ? error : new ApiError(0, 'UNEXPECTED_ERROR', 'The booking could not be saved.'))
    }
  }

  const timeSelect = (label: string, value: OfficeTime, onChange: (v: OfficeTime) => void, isStart: boolean) => (
    <FormControl fullWidth size="small">
      <InputLabel id={`${formId}-${isStart ? 'start' : 'end'}`}>{label}</InputLabel>
      <Select
        labelId={`${formId}-${isStart ? 'start' : 'end'}`}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 280 } } } }}
      >
        {TIME_OPTIONS.map((time) => (
          <MenuItem key={time} value={time} disabled={isStart && slot.startDate === today && toMinutes(time) <= nowMinutes}>
            {time}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )

  return (
    <Stack spacing={2.25} component="form" noValidate onSubmit={(e) => (e.preventDefault(), void submit())}>
      {showRoomSelect && (
        <FormControl fullWidth size="small">
          <InputLabel id={`${formId}-room`}>Room</InputLabel>
          <Select labelId={`${formId}-room`} label="Room" value={roomId} onChange={(e) => onRoomChange?.(e.target.value)}>
            {rooms.map((r) => (
              <MenuItem key={r.id} value={r.id} disabled={!r.isActive}>
                {r.name} · {r.capacity} seats · floor {r.floor}
                {!r.isActive && ' (inactive)'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {room && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary' }}>
          <UsersRound size={15} />
          <Typography variant="body2">
            {room.capacity} seats · {room.location}
          </Typography>
          {room.equipment.map((item) => {
            const { icon: Icon, label } = EQUIPMENT[item]
            return (
              <Stack key={item} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Icon size={14} />
                <Typography variant="caption">{label}</Typography>
              </Stack>
            )
          })}
        </Stack>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          size="small"
          label="Meeting title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={Boolean(hints.title)}
          helperText={hints.title}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <FormControl size="small" fullWidth error={Boolean(hints.organizer)}>
          <InputLabel id={`${formId}-organizer`}>Organizer</InputLabel>
          <Select labelId={`${formId}-organizer`} label="Organizer" value={organizerId} onChange={(e) => setOrganizerId(e.target.value)}>
            {(users.data ?? []).map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.fullName} ({u.id})
              </MenuItem>
            ))}
          </Select>
          {hints.organizer && <FormHelperText>{hints.organizer}</FormHelperText>}
        </FormControl>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1.15fr) minmax(0, 1fr)' }, gap: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Select date
          </Typography>
          <Box sx={{ border: `1px solid ${palette.border}`, borderRadius: 3, bgcolor: palette.surfaceMuted }}>
            <DateCalendar
              value={officeDateToDayjs(slot.startDate)}
              onChange={(value) => value && setStartDate(value.format('YYYY-MM-DD'))}
              minDate={officeDateToDayjs(today)}
              maxDate={officeDateToDayjs(horizonEnd)}
              timezone={getOfficeTimeZone()}
              views={['day']}
              sx={{
                width: '100%',
                maxWidth: 340,
                height: 'auto',
                maxHeight: 330,
                '& .MuiPickersDay-root.Mui-selected': { bgcolor: palette.orange },
                '& .MuiPickersDay-root.Mui-selected:hover': { bgcolor: palette.orangeDark },
              }}
            />
          </Box>
        </Box>

        <Stack spacing={1.75}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Clock size={17} />
            <Typography variant="subtitle2">Select time</Typography>
          </Stack>
          {timeSelect('Start time', slot.startTime, setStartTime, true)}
          {multiDay && (
            <DatePicker
              label="End date"
              value={officeDateToDayjs(slot.endDate)}
              onChange={(value) => value && onSlotChange({ ...slot, endDate: value.format('YYYY-MM-DD') })}
              minDate={officeDateToDayjs(slot.startDate)}
              maxDate={officeDateToDayjs(slot.startDate).add(settings.maximumDurationDays, 'day')}
              timezone={getOfficeTimeZone()}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          )}
          {timeSelect('End time', slot.endTime, (endTime) => onSlotChange({ ...slot, endTime }), false)}
          <FormControlLabel
            control={<Checkbox size="small" checked={multiDay} onChange={(e) => toggleMultiDay(e.target.checked)} />}
            label={<Typography variant="body2">Spans several days (max {settings.maximumDurationDays})</Typography>}
          />
          {hints.range && (
            <Typography variant="caption" color="error">
              {hints.range}
            </Typography>
          )}

          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <UsersRound size={17} />
              <Typography variant="subtitle2">Number of attendees</Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
                <IconButton
                  aria-label="Fewer attendees"
                  onClick={() => setAttendees((n) => Math.max(1, n - 1))}
                  disabled={attendees <= 1}
                  sx={{ border: `1px solid ${palette.border}`, borderRadius: 2 }}
                >
                  <Minus size={18} />
                </IconButton>
                <TextField
                  size="small"
                  type="number"
                  value={attendees}
                  onChange={(e) => setAttendees(Math.trunc(Number(e.target.value)) || 0)}
                  error={Boolean(hints.attendees)}
                  slotProps={{ htmlInput: { min: 1, max: room?.capacity, 'aria-label': 'Number of attendees', style: { textAlign: 'center' } } }}
                  sx={{
                    width: 90,
                    flexShrink: 0,
                    // The −/+ buttons replace the browser's spinner, which otherwise covers two-digit values.
                    '& input': { px: 1, fontWeight: 600, MozAppearance: 'textfield' },
                    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', m: 0 },
                  }}
                />
                <IconButton
                  aria-label="More attendees"
                  onClick={() => setAttendees((n) => Math.min(room?.capacity ?? n + 1, n + 1))}
                  disabled={Boolean(room && attendees >= room.capacity)}
                  sx={{ border: `1px solid ${palette.border}`, borderRadius: 2 }}
                >
                  <Plus size={18} />
                </IconButton>
              </Stack>
              {room && (
                <Typography variant="caption" color="text.secondary">
                  max {room.capacity}
                </Typography>
              )}
            </Stack>
            {hints.attendees && (
              <Typography variant="caption" color="error" component="p" sx={{ mt: 0.5 }}>
                {hints.attendees}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>

      {room && (
        <>
          <AvailabilityLine loading={availability.isFetching} data={availability.data} />
          <RoomDayTimeline roomId={room.id} date={slot.startDate} selection={iso} excludeReservationId={reservation?.id} />
        </>
      )}

      {submitError && (
        <Alert severity="error" onClose={() => setSubmitError(null)} sx={{ borderRadius: 3 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>{reservation ? 'Changes not saved' : 'Booking not created'}</AlertTitle>
          {submitError.message}
          {submitError.details.length > 1 && (
            <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 2.5 }}>
              {submitError.details.slice(1).map((detail, i) => (
                <li key={i}>{detail.message}</li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Button
        type="submit"
        size="large"
        variant="contained"
        color="success"
        disabled={!room || mutation.isPending}
        startIcon={mutation.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ py: 1.4, fontSize: '1.05rem', borderRadius: 3, bgcolor: palette.greenDark }}
      >
        {mutation.isPending ? 'Saving…' : (submitLabel ?? (reservation ? 'Save changes' : 'Confirm Booking'))}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        Times are office time ({settings.officeTimeZone}). The server re-checks every rule when you confirm.
      </Typography>
    </Stack>
  )
}

function AvailabilityLine({ loading, data }: { loading: boolean; data?: { isAvailable: boolean; reasons: { message: string }[] } }) {
  if (!data) {
    return loading ? (
      <Typography variant="body2" color="text.secondary">
        Checking availability…
      </Typography>
    ) : null
  }
  return data.isAvailable ? (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: palette.greenDark }} role="status">
      <CircleCheck size={18} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Available for the selected time
      </Typography>
    </Stack>
  ) : (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', color: palette.red }} role="status">
      <Box sx={{ mt: '2px' }}>
        <TriangleAlert size={18} />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Not available for the selected time
        </Typography>
        {data.reasons.map((reason, i) => (
          <Typography key={i} variant="caption" component="p">
            {reason.message}
          </Typography>
        ))}
      </Box>
    </Stack>
  )
}
