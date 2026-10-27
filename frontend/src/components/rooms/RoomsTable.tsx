import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { CalendarPlus, DoorOpen } from 'lucide-react'
import { palette, roomRowBackground, tableColors } from '../../theme/tokens'
import type { Room, RoomOccupancy } from '../../types/api'
import { floorLabel } from '../../utils/rooms'
import { EquipmentIcons, OccupancyStatus, RoomActiveStatus } from '../common/StatusBadges'

/**
 * Rooms table. `compact` is the dashboard variant (as in the reference design); the full variant adds
 * the ID, location, active status and a booking action.
 */
export function RoomsTable({
  rooms,
  occupancy,
  selectedRoomId,
  onSelect,
  onBook,
  compact = false,
}: {
  rooms: Room[]
  occupancy?: Map<string, RoomOccupancy>
  selectedRoomId?: string
  onSelect?: (room: Room) => void
  onBook?: (room: Room) => void
  compact?: boolean
}) {
  return (
    <TableContainer>
      <Table size={compact ? 'small' : 'medium'} aria-label="Rooms">
        <TableHead>
          <TableRow>
            <TableCell>Room</TableCell>
            <TableCell>{compact ? 'Floor' : 'Floor / location'}</TableCell>
            <TableCell align={compact ? 'left' : 'right'}>Capacity</TableCell>
            <TableCell>Equipment</TableCell>
            {!compact && <TableCell>Status</TableCell>}
            <TableCell>{compact ? 'Status' : 'Now'}</TableCell>
            {onBook && <TableCell align="right" />}
          </TableRow>
        </TableHead>
        <TableBody>
          {rooms.map((room) => {
            const state = occupancy?.get(room.id)?.state ?? (room.isActive ? undefined : 'Inactive')
            const selected = room.id === selectedRoomId
            const background = roomRowBackground({ selected, state })
            return (
              <TableRow
                key={room.id}
                hover={!background}
                selected={selected}
                onClick={onSelect ? () => onSelect(room) : undefined}
                sx={{
                  cursor: onSelect ? 'pointer' : undefined,
                  bgcolor: background,
                  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tableColors.rowSelected },
                  '&:hover': background ? { bgcolor: background } : undefined,
                  '&:last-child td': { borderBottom: 0 },
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 30,
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: room.isActive ? palette.orangeSoft : palette.greySoft,
                        color: room.isActive ? palette.orangeDark : palette.grey,
                        flexShrink: 0,
                      }}
                    >
                      <DoorOpen size={17} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', color: room.isActive ? 'text.primary' : 'text.secondary' }}>
                        {room.name}
                      </Typography>
                      {!compact && (
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                          ID: {room.id}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', whiteSpace: compact ? 'nowrap' : undefined }}>
                  {compact ? `${room.floor}${['st', 'nd', 'rd'][room.floor - 1] ?? 'th'}` : `${floorLabel(room.floor)} · ${room.location}`}
                </TableCell>
                <TableCell align={compact ? 'left' : 'right'} sx={{ color: 'text.secondary' }}>
                  {room.capacity}
                </TableCell>
                <TableCell>
                  <EquipmentIcons equipment={room.equipment} size={compact ? 16 : 18} />
                </TableCell>
                {!compact && (
                  <TableCell>
                    <RoomActiveStatus isActive={room.isActive} />
                  </TableCell>
                )}
                <TableCell>{state ? <OccupancyStatus state={state} /> : '—'}</TableCell>
                {onBook && (
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CalendarPlus size={15} />}
                      disabled={!room.isActive}
                      onClick={(e) => (e.stopPropagation(), onBook(room))}
                    >
                      Book
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
