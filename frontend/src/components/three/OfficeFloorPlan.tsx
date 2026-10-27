import { Box, Button, ButtonGroup, Chip, CircularProgress, MenuItem, Select, Stack, Tooltip, Typography } from '@mui/material'
import { Clock, Focus, RotateCcw } from 'lucide-react'
import { Component, Suspense, lazy, useState, type ReactNode } from 'react'
import { occupancyStyle, palette } from '../../theme/tokens'
import type { Floor, Room, RoomOccupancy, RoomOccupancyState } from '../../types/api'
import { floorLabel } from '../../utils/rooms'
import type { CameraCommand, CameraMode } from './OfficeFloorScene'
import { FloorPlan2D } from './FloorPlan2D'
import { isWebGLAvailable } from './webgl'

const OfficeFloorScene = lazy(() => import('./OfficeFloorScene').then((m) => ({ default: m.OfficeFloorScene })))

interface OfficeFloorPlanProps {
  floors: Floor[]
  floor: number
  onFloorChange: (floor: number) => void
  rooms: Room[]
  occupancy: Map<string, RoomOccupancy>
  selectedRoomId?: string
  onSelectRoom: (roomId: string) => void
  /** Describes the time window the room states refer to. */
  windowLabel: string
  loading?: boolean
  height?: number | Record<string, number>
}

const LEGEND: RoomOccupancyState[] = ['Available', 'InProgress', 'Booked', 'Inactive']

export function OfficeFloorPlan({
  floors,
  floor,
  onFloorChange,
  rooms,
  occupancy,
  selectedRoomId,
  onSelectRoom,
  windowLabel,
  loading,
  height = { xs: 380, md: 520 },
}: OfficeFloorPlanProps) {
  const [camera, setCamera] = useState<CameraCommand>({ mode: 'overview', token: 0 })
  const setMode = (mode: CameraMode) => setCamera((c) => ({ mode, token: c.token + 1 }))
  const webgl = isWebGLAvailable()

  return (
    <Box
      sx={{
        position: 'relative',
        // Own stacking context: 3D labels stay inside the plan instead of covering the sticky top bar.
        isolation: 'isolate',
        height,
        borderRadius: 4,
        overflow: 'hidden',
        background: 'radial-gradient(120% 90% at 50% 20%, #FBF4E8 0%, #EADBC4 70%, #DCC8AA 100%)',
        border: `1px solid ${palette.border}`,
      }}
    >
      {webgl ? (
        <SceneBoundary fallback={<FloorPlan2D rooms={rooms} occupancy={occupancy} selectedRoomId={selectedRoomId} onSelectRoom={onSelectRoom} />}>
          <Suspense fallback={<SceneLoading />}>
            <OfficeFloorScene rooms={rooms} occupancy={occupancy} selectedRoomId={selectedRoomId} onSelectRoom={onSelectRoom} camera={camera} />
          </Suspense>
        </SceneBoundary>
      ) : (
        <FloorPlan2D rooms={rooms} occupancy={occupancy} selectedRoomId={selectedRoomId} onSelectRoom={onSelectRoom} />
      )}

      {/* Floor dropdown + time window */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', position: 'absolute', top: 14, left: 14, right: 72, flexWrap: 'wrap', rowGap: 1 }}>
        <Select
          size="small"
          value={floors.some((f) => f.floor === floor) ? floor : ''}
          onChange={(e) => onFloorChange(Number(e.target.value))}
          sx={{ bgcolor: 'rgba(255,253,249,0.95)', borderRadius: 2.5, minWidth: 140, fontWeight: 600 }}
          inputProps={{ 'aria-label': 'Floor' }}
        >
          {floors.map((f) => (
            <MenuItem key={f.floor} value={f.floor}>
              {floorLabel(f.floor)}
            </MenuItem>
          ))}
        </Select>
        <Chip
          icon={<Clock size={14} />}
          label={windowLabel}
          sx={{ bgcolor: 'rgba(38,35,31,0.82)', color: '#FFF', fontWeight: 500, '& .MuiChip-icon': { color: '#FFF' }, maxWidth: '100%' }}
        />
        {loading && <CircularProgress size={18} />}
      </Stack>

      {/* Floor quick switch, as in the reference design */}
      <Stack
        sx={{ position: 'absolute', top: 14, right: 14, bgcolor: 'rgba(255,253,249,0.95)', borderRadius: 3, p: 0.5, boxShadow: 1 }}
        spacing={0.5}
        role="group"
        aria-label="Select floor"
      >
        {[...floors].reverse().map((f) => (
          <Button
            key={f.floor}
            size="small"
            onClick={() => onFloorChange(f.floor)}
            variant={f.floor === floor ? 'contained' : 'text'}
            color={f.floor === floor ? 'primary' : 'inherit'}
            sx={{ minWidth: 44, px: 1, fontWeight: 700 }}
            aria-pressed={f.floor === floor}
          >
            {f.floor}F
          </Button>
        ))}
      </Stack>

      {/* Legend */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          position: 'absolute',
          left: 14,
          bottom: 14,
          bgcolor: 'rgba(255,253,249,0.95)',
          borderRadius: 2.5,
          px: 1.5,
          py: 0.75,
          flexWrap: 'wrap',
          rowGap: 0.5,
          maxWidth: 'calc(100% - 28px)',
        }}
      >
        {LEGEND.map((state) => (
          <Stack key={state} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: occupancyStyle[state].color }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {occupancyStyle[state].label}
            </Typography>
          </Stack>
        ))}
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 9, borderRadius: 0.5, border: `2px solid ${palette.amber}` }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Selected
          </Typography>
        </Stack>
      </Stack>

      {/* Camera controls */}
      {webgl && (
        <ButtonGroup
          size="small"
          variant="contained"
          color="inherit"
          sx={{ position: 'absolute', right: 14, bottom: 14, bgcolor: 'rgba(255,253,249,0.95)', borderRadius: 2.5, boxShadow: 1, display: { xs: 'none', sm: 'flex' } }}
        >
          <Tooltip title="Reset to the floor overview">
            <Button onClick={() => setMode('overview')} startIcon={<RotateCcw size={15} />} sx={{ bgcolor: 'transparent' }}>
              Overview
            </Button>
          </Tooltip>
          <Tooltip title={selectedRoomId ? 'Fly to the selected room' : 'Select a room first'}>
            <span>
              <Button onClick={() => setMode('room')} disabled={!selectedRoomId} startIcon={<Focus size={15} />} sx={{ bgcolor: 'transparent' }}>
                Room view
              </Button>
            </span>
          </Tooltip>
        </ButtonGroup>
      )}
    </Box>
  )
}

function SceneLoading() {
  return (
    <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '100%' }} spacing={1}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        Building the 3D floor…
      </Typography>
    </Stack>
  )
}

/** Falls back to the 2D plan if WebGL fails at runtime (e.g. context creation errors). */
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
