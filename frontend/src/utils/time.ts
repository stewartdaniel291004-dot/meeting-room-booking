import dayjs, { type Dayjs } from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Time convention: the API speaks UTC (ISO 8601 with "Z"). Everything the user sees or types is in the
 * office time zone published by the backend (/api/settings), so every viewer sees the same booking times
 * regardless of their own computer's time zone. Conversion happens only in this module.
 */
let officeTimeZone = 'UTC'

export function setOfficeTimeZone(zone: string) {
  officeTimeZone = zone
}

export const getOfficeTimeZone = () => officeTimeZone

/** "YYYY-MM-DD" in office time. */
export type OfficeDate = string
/** "HH:mm" in office time. */
export type OfficeTime = string

export const officeNow = (): Dayjs => dayjs().tz(officeTimeZone)

export const officeToday = (): OfficeDate => officeNow().format('YYYY-MM-DD')

export const toOffice = (iso: string): Dayjs => dayjs.utc(iso).tz(officeTimeZone)

/** Combines an office-local date and time into a UTC ISO timestamp for the API. */
export const officeDateTimeToIso = (date: OfficeDate, time: OfficeTime): string =>
  dayjs.tz(`${date}T${time}:00`, officeTimeZone).toISOString()

/** [start, end) of an office-local day as UTC ISO timestamps, for date-range filters. */
export function officeDayBounds(date: OfficeDate): { start: string; end: string } {
  const start = dayjs.tz(`${date}T00:00:00`, officeTimeZone)
  return { start: start.toISOString(), end: start.add(1, 'day').toISOString() }
}

/** Calendar-date Dayjs object for date pickers, anchored in the office zone. */
export const officeDateToDayjs = (date: OfficeDate): Dayjs => dayjs.tz(`${date}T12:00:00`, officeTimeZone)

export const formatTime = (iso: string) => toOffice(iso).format('HH:mm')

export const formatDate = (iso: string) => toOffice(iso).format('ddd, D MMM YYYY')

export const formatDateTime = (iso: string) => toOffice(iso).format('D MMM YYYY, HH:mm')

export const formatOfficeDate = (date: OfficeDate) => officeDateToDayjs(date).format('ddd, D MMM YYYY')

export function formatRange(startIso: string, endIso: string): string {
  const start = toOffice(startIso)
  const end = toOffice(endIso)
  return start.isSame(end, 'day')
    ? `${start.format('D MMM YYYY, HH:mm')}–${end.format('HH:mm')}`
    : `${start.format('D MMM, HH:mm')} – ${end.format('D MMM YYYY, HH:mm')}`
}

export function formatDuration(startIso: string, endIso: string): string {
  const minutes = Math.round(dayjs(endIso).diff(dayjs(startIso), 'minute'))
  if (minutes < 60) return `${minutes} min`
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  return [days && `${days}d`, hours && `${hours}h`, rest && `${rest}m`].filter(Boolean).join(' ')
}

export function relativeToNow(iso: string): string {
  const minutes = Math.round(dayjs(iso).diff(dayjs(), 'minute'))
  const abs = Math.abs(minutes)
  const text = abs < 60 ? `${abs} min` : abs < 1440 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} d`
  return minutes >= 0 ? `in ${text}` : `${text} ago`
}

/** Quarter-hour choices for the time dropdowns. */
export const TIME_OPTIONS: OfficeTime[] = Array.from({ length: 96 }, (_, i) =>
  `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
)

export interface BookingSlot {
  startDate: OfficeDate
  startTime: OfficeTime
  endDate: OfficeDate
  endTime: OfficeTime
}

/** Next half-hour slot today, one hour long; tomorrow 09:00 if that would run past midnight. */
export function defaultBookingSlot(): BookingSlot {
  const now = officeNow()
  const minutes = now.hour() * 60 + now.minute()
  const nextSlot = Math.ceil((minutes + 1) / 30) * 30
  if (nextSlot + 60 >= 24 * 60) {
    const tomorrow = now.add(1, 'day').format('YYYY-MM-DD')
    return { startDate: tomorrow, startTime: '09:00', endDate: tomorrow, endTime: '10:00' }
  }

  const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const today = now.format('YYYY-MM-DD')
  return { startDate: today, startTime: toTime(nextSlot), endDate: today, endTime: toTime(nextSlot + 60) }
}

export function slotToIso(slot: BookingSlot): { start: string; end: string } {
  return {
    start: officeDateTimeToIso(slot.startDate, slot.startTime),
    end: officeDateTimeToIso(slot.endDate, slot.endTime),
  }
}

/** The current moment as a short window, used to show "what is happening right now". */
export function nowSlotIso(): { start: string; end: string } {
  const now = dayjs()
  return { start: now.toISOString(), end: now.add(1, 'minute').toISOString() }
}
