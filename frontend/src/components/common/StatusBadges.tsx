import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material'
import { Ban, CircleCheck, CirclePlay, CalendarClock, CircleStop } from 'lucide-react'
import { occupancyStyle, palette, reservationStatusStyle } from '../../theme/tokens'
import type { EquipmentType, Reservation, RoomOccupancyState } from '../../types/api'
import { EQUIPMENT } from '../../utils/rooms'

/** Coloured dot + text label, so status never relies on colour alone. */
export function StatusDot({ color, label, size = 10 }: { color: string; label: string; size?: number }) {
  return (
    <Stack direction="row" spacing={1} component="span" sx={{ alignItems: 'center' }}>
      <Box component="span" sx={{ width: size, height: size, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} aria-hidden />
      <Typography component="span" variant="body2" sx={{ color, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
    </Stack>
  )
}

export function OccupancyStatus({ state }: { state: RoomOccupancyState }) {
  const style = occupancyStyle[state]
  return <StatusDot color={style.color} label={style.label} />
}

export function RoomActiveStatus({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Chip size="small" label="Active" icon={<CircleCheck size={14} />} sx={{ bgcolor: palette.greenSoft, color: palette.greenDark, '& .MuiChip-icon': { color: 'inherit' } }} />
  ) : (
    <Chip size="small" label="Inactive" icon={<Ban size={14} />} sx={{ bgcolor: palette.greySoft, color: palette.textSecondary, '& .MuiChip-icon': { color: 'inherit' } }} />
  )
}

const statusIcons = {
  Booked: CalendarClock,
  InProgress: CirclePlay,
  Completed: CircleCheck,
  Cancelled: Ban,
}

export function ReservationStatusChip({ reservation }: { reservation: Pick<Reservation, 'status' | 'isInProgress' | 'endedEarly'> }) {
  const key = reservation.isInProgress ? 'InProgress' : reservation.status
  const style = reservationStatusStyle[key]
  const Icon = statusIcons[key]
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Chip
        size="small"
        label={style.label}
        icon={<Icon size={14} />}
        sx={{ bgcolor: style.soft, color: style.color, '& .MuiChip-icon': { color: 'inherit' } }}
      />
      {reservation.endedEarly && (
        <Tooltip title="This meeting was ended before its planned end time">
          <Chip size="small" variant="outlined" label="Ended early" icon={<CircleStop size={13} />} sx={{ color: palette.textSecondary }} />
        </Tooltip>
      )}
    </Stack>
  )
}

export function EquipmentIcons({ equipment, size = 18 }: { equipment: EquipmentType[]; size?: number }) {
  if (equipment.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    )
  }
  return (
    <Stack direction="row" spacing={1.25} sx={{ color: palette.textSecondary }}>
      {equipment.map((item) => {
        const { label, icon: Icon } = EQUIPMENT[item]
        return (
          <Tooltip key={item} title={label}>
            <Box component="span" sx={{ display: 'inline-flex' }} aria-label={label} role="img">
              <Icon size={size} />
            </Box>
          </Tooltip>
        )
      })}
    </Stack>
  )
}

export function EquipmentChips({ equipment }: { equipment: EquipmentType[] }) {
  return (
    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
      {equipment.map((item) => {
        const { label, icon: Icon } = EQUIPMENT[item]
        return (
          <Chip
            key={item}
            size="small"
            variant="outlined"
            icon={<Icon size={15} />}
            label={label}
            sx={{ borderColor: palette.border, bgcolor: palette.surfaceMuted, fontWeight: 500, '& .MuiChip-icon': { color: palette.textSecondary } }}
          />
        )
      })}
      {equipment.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No equipment
        </Typography>
      )}
    </Stack>
  )
}
