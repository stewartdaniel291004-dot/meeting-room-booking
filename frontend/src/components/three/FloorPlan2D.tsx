import { Box, ButtonBase, Typography } from '@mui/material'
import { occupancyStyle, palette } from '../../theme/tokens'
import type { Room, RoomOccupancy } from '../../types/api'

/** Accessible 2D floor plan used when WebGL is unavailable. Same data, same interactions. */
export function FloorPlan2D({
  rooms,
  occupancy,
  selectedRoomId,
  onSelectRoom,
}: {
  rooms: Room[]
  occupancy: Map<string, RoomOccupancy>
  selectedRoomId?: string
  onSelectRoom: (roomId: string) => void
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        pt: 9,
        pb: 8,
        px: 3,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gridAutoRows: 'minmax(90px, 1fr)',
        gap: 2,
        overflow: 'auto',
      }}
    >
      {rooms.map((room) => {
        const state = occupancy.get(room.id)?.state ?? (room.isActive ? 'Available' : 'Inactive')
        const style = occupancyStyle[state]
        const selected = room.id === selectedRoomId
        return (
          <ButtonBase
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            sx={{
              borderRadius: 3,
              bgcolor: style.soft,
              border: `2px solid ${selected ? palette.amber : style.color}`,
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              p: 1.5,
              textAlign: 'left',
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>{room.name}</Typography>
            <Typography variant="caption" sx={{ color: style.color, fontWeight: 600 }}>
              {style.label} · {room.capacity} seats
            </Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}
