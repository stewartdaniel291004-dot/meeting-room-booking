import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { Ban, CircleStop, Pencil } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { useReservationMutations } from '../../hooks/queries'
import type { Reservation } from '../../types/api'
import { formatDateTime, formatDuration, formatTime } from '../../utils/time'
import { useBookingDialog } from '../booking/BookingDialog'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ReservationStatusChip } from '../common/StatusBadges'
import { useToast } from '../common/ToastProvider'

type PendingAction = { type: 'cancel' | 'end'; reservation: Reservation }

export function ReservationsTable({ reservations, pageSize = 15 }: { reservations: Reservation[]; pageSize?: number }) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(pageSize)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const { cancel, endEarly } = useReservationMutations()
  const notify = useToast()
  const openBooking = useBookingDialog()

  const lastPage = Math.max(0, Math.ceil(reservations.length / rowsPerPage) - 1)
  const currentPage = Math.min(page, lastPage)
  const rows = reservations.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage)
  const busy = cancel.isPending || endEarly.isPending

  const confirm = async () => {
    if (!pending) return
    try {
      if (pending.type === 'cancel') {
        await cancel.mutateAsync(pending.reservation.id)
        notify(`“${pending.reservation.meetingTitle}” was cancelled. ${pending.reservation.roomName} is free again.`)
      } else {
        const ended = await endEarly.mutateAsync(pending.reservation.id)
        notify(`“${ended.meetingTitle}” ended at ${formatTime(ended.actualEndDateTime!)}. ${ended.roomName} is released.`)
      }
    } catch (error) {
      notify(errorMessage(error), 'error')
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <TableContainer>
        <Table aria-label="Reservations" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell>Room</TableCell>
              <TableCell>Organizer</TableCell>
              <TableCell>Meeting title</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell align="center">Attendees</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {r.roomName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.roomId} · floor {r.roomFloor}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{r.organizerName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.organizerId}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="body2" noWrap title={r.meetingTitle} sx={{ textDecoration: r.status === 'Cancelled' ? 'line-through' : undefined }}>
                    {r.meetingTitle}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.startDateTime)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatDateTime(r.endDateTime)}
                  {r.endedEarly && r.actualEndDateTime && (
                    <Typography variant="caption" color="text.secondary" component="div">
                      ended {formatTime(r.actualEndDateTime)} (used {formatDuration(r.startDateTime, r.actualEndDateTime)})
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">{r.attendeeCount}</TableCell>
                <TableCell>
                  <ReservationStatusChip reservation={r} />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    {r.canEdit && (
                      <Tooltip title="Edit reservation">
                        <IconButton size="small" onClick={() => openBooking({ reservation: r })} aria-label={`Edit ${r.meetingTitle}`}>
                          <Pencil size={17} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {r.canEndEarly && (
                      <Tooltip title="End meeting now">
                        <IconButton size="small" color="success" onClick={() => setPending({ type: 'end', reservation: r })} aria-label={`End ${r.meetingTitle} early`}>
                          <CircleStop size={17} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {r.canCancel && (
                      <Tooltip title="Cancel reservation">
                        <IconButton size="small" color="error" onClick={() => setPending({ type: 'cancel', reservation: r })} aria-label={`Cancel ${r.meetingTitle}`}>
                          <Ban size={17} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!r.canEdit && !r.canEndEarly && !r.canCancel && (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {reservations.length > rowsPerPage && (
        <Box sx={{ borderTop: (t) => `1px solid ${t.palette.divider}` }}>
          <TablePagination
            component="div"
            count={reservations.length}
            page={currentPage}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => (setRowsPerPage(Number(e.target.value)), setPage(0))}
            rowsPerPageOptions={[15, 30, 50]}
          />
        </Box>
      )}

      <ConfirmDialog
        open={pending?.type === 'cancel'}
        title="Cancel this reservation?"
        message={
          pending && (
            <>
              <strong>{pending.reservation.meetingTitle}</strong> in {pending.reservation.roomName} ({formatDateTime(pending.reservation.startDateTime)}) will be
              marked as cancelled and the room becomes available again. The record is kept for reporting.
            </>
          )
        }
        confirmLabel="Cancel reservation"
        confirmColor="error"
        busy={busy}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.type === 'end'}
        title="End this meeting now?"
        message={
          pending && (
            <>
              <strong>{pending.reservation.meetingTitle}</strong> in {pending.reservation.roomName} will be completed now. The actual end time is recorded
              and the rest of the slot (until {formatTime(pending.reservation.endDateTime)}) becomes bookable.
            </>
          )
        }
        confirmLabel="End meeting"
        confirmColor="success"
        busy={busy}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </>
  )
}
