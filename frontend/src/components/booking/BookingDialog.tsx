import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material'
import { CalendarPlus, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useRooms } from '../../hooks/queries'
import { palette } from '../../theme/tokens'
import type { Reservation } from '../../types/api'
import { defaultBookingSlot, toOffice, type BookingSlot } from '../../utils/time'
import { LoadingState } from '../common/States'
import { BookingForm } from './BookingForm'

export interface OpenBookingOptions {
  roomId?: string
  reservation?: Reservation
  slot?: BookingSlot
}

type OpenBooking = (options?: OpenBookingOptions) => void

const BookingDialogContext = createContext<OpenBooking>(() => {})

/** Lets any page open the booking dialog ("Book this room", "New reservation", "Edit"). */
export function BookingDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<(OpenBookingOptions & { key: number }) | null>(null)
  const open = useCallback<OpenBooking>((options = {}) => setRequest({ ...options, key: Date.now() }), [])

  return (
    <BookingDialogContext.Provider value={open}>
      {children}
      {request && <BookingDialog key={request.key} options={request} onClose={() => setRequest(null)} />}
    </BookingDialogContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export const useBookingDialog = () => useContext(BookingDialogContext)

function slotFromReservation(reservation: Reservation): BookingSlot {
  const start = toOffice(reservation.startDateTime)
  const end = toOffice(reservation.endDateTime)
  return {
    startDate: start.format('YYYY-MM-DD'),
    startTime: start.format('HH:mm'),
    endDate: end.format('YYYY-MM-DD'),
    endTime: end.format('HH:mm'),
  }
}

function BookingDialog({ options, onClose }: { options: OpenBookingOptions; onClose: () => void }) {
  const rooms = useRooms()
  const { reservation } = options
  const [roomId, setRoomId] = useState(options.roomId ?? reservation?.roomId ?? '')
  const [slot, setSlot] = useState<BookingSlot>(
    options.slot ?? (reservation ? slotFromReservation(reservation) : defaultBookingSlot()),
  )

  const roomList = rooms.data ?? []
  const effectiveRoomId = roomId || roomList.find((r) => r.isActive)?.id || ''

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth scroll="body">
      <DialogTitle component="div" sx={{ pr: 7 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <CalendarPlus size={22} color={palette.orange} />
          <Typography variant="h2" component="h2">
            {reservation ? `Edit “${reservation.meetingTitle}”` : 'New reservation'}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 16, top: 16 }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {rooms.isPending ? (
          <LoadingState />
        ) : (
          <BookingForm
            rooms={roomList}
            roomId={effectiveRoomId}
            onRoomChange={setRoomId}
            showRoomSelect
            slot={slot}
            onSlotChange={setSlot}
            reservation={reservation}
            onSuccess={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
