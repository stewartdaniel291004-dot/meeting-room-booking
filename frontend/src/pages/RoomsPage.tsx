import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { CalendarPlus, DoorOpen, FilterX, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBookingDialog } from '../components/booking/BookingDialog'
import { PageHeader, SectionCard } from '../components/common/Panels'
import { EmptyState, ErrorState, TableSkeleton } from '../components/common/States'
import { RoomDetailsPanel } from '../components/rooms/RoomDetailsPanel'
import { RoomsTable } from '../components/rooms/RoomsTable'
import { useFloors, useOccupancy, useRooms } from '../hooks/queries'
import type { EquipmentType, RoomFilters, RoomOccupancy } from '../types/api'
import { EQUIPMENT, EQUIPMENT_TYPES, floorLabel } from '../utils/rooms'
import { nowSlotIso } from '../utils/time'

/** Filters live in the URL so a filtered view can be shared or bookmarked. */
function useRoomFilters() {
  const [params, setParams] = useSearchParams()
  const filters: RoomFilters = {
    floor: params.get('floor') ? Number(params.get('floor')) : undefined,
    minCapacity: params.get('minCapacity') ? Number(params.get('minCapacity')) : undefined,
    equipment: params.getAll('equipment') as EquipmentType[],
    isActive: params.get('status') === 'active' ? true : params.get('status') === 'inactive' ? false : undefined,
    search: params.get('search') ?? undefined,
  }

  const update = (changes: Record<string, string | string[] | undefined>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      next.delete(key)
      for (const item of Array.isArray(value) ? value : value ? [value] : []) next.append(key, item)
    }
    setParams(next, { replace: true })
  }

  return { filters, params, update }
}

export default function RoomsPage() {
  const { filters, params, update } = useRoomFilters()
  const rooms = useRooms(filters)
  const floors = useFloors()
  const openBooking = useBookingDialog()
  const [now] = useState(nowSlotIso)
  const occupancy = useOccupancy(now.start, now.end)
  const occupancyMap = useMemo(() => new Map<string, RoomOccupancy>((occupancy.data ?? []).map((o) => [o.roomId, o])), [occupancy.data])
  const [searchText, setSearchText] = useState(filters.search ?? '')

  const selectedId = params.get('room') ?? undefined
  const allRooms = useRooms()
  const selectedRoom = allRooms.data?.find((r) => r.id === selectedId)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // On narrow screens the details panel sits below the table; bring it into view.
    if (selectedId && window.innerWidth < 1200) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedId])
  const hasFilters = Boolean(filters.floor || filters.minCapacity || filters.equipment?.length || filters.isActive !== undefined || filters.search)

  return (
    <>
      <PageHeader
        title="Rooms"
        description="All meeting rooms with capacity, location and equipment. Inactive rooms (for example under renovation) are listed but cannot be booked."
        actions={
          <Button variant="contained" startIcon={<CalendarPlus size={18} />} onClick={() => openBooking()}>
            New reservation
          </Button>
        }
      />

      <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: selectedRoom ? 'minmax(0, 1fr) 410px' : 'minmax(0, 1fr)' } }}>
      <SectionCard contentSx={{ display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', p: 2.5, pb: 2 }}>
          <TextField
            size="small"
            placeholder="Search by name or ID"
            value={searchText}
            onChange={(e) => (setSearchText(e.target.value), update({ search: e.target.value || undefined }))}
            sx={{ width: { xs: '100%', sm: 220 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="roomspage-floor-label">Floor</InputLabel>
            <Select labelId="roomspage-floor-label" label="Floor" value={filters.floor ?? ''} onChange={(e) => update({ floor: String(e.target.value) || undefined })}>
              <MenuItem value="">All floors</MenuItem>
              {(floors.data ?? []).map((f) => (
                <MenuItem key={f.floor} value={f.floor}>
                  {floorLabel(f.floor)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="number"
            label="Min capacity"
            value={filters.minCapacity ?? ''}
            onChange={(e) => update({ minCapacity: Number(e.target.value) > 0 ? String(Math.trunc(Number(e.target.value))) : undefined })}
            sx={{ width: 130 }}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <FormControl size="small" sx={{ minWidth: 220, maxWidth: '100%' }}>
            <InputLabel id="roomspage-equipment-label">Equipment</InputLabel>
            <Select labelId="roomspage-equipment-label"
              multiple
              label="Equipment"
              value={filters.equipment ?? []}
              onChange={(e) => update({ equipment: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
              input={<OutlinedInput label="Equipment" />}
              renderValue={(selected) => (
                <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden' }}>
                  {selected.map((item) => (
                    <Chip key={item} size="small" label={EQUIPMENT[item].label} />
                  ))}
                </Stack>
              )}
            >
              {EQUIPMENT_TYPES.map((item) => {
                const { label, icon: Icon } = EQUIPMENT[item]
                return (
                  <MenuItem key={item} value={item}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Icon size={16} />
                      <span>{label}</span>
                    </Stack>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="roomspage-status-label">Status</InputLabel>
            <Select labelId="roomspage-status-label" label="Status" value={params.get('status') ?? ''} onChange={(e) => update({ status: e.target.value || undefined })}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          {hasFilters && (
            <Button
              size="small"
              color="inherit"
              startIcon={<FilterX size={16} />}
              onClick={() => (setSearchText(''), update({ floor: undefined, minCapacity: undefined, equipment: undefined, status: undefined, search: undefined }))}
            >
              Clear filters
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {rooms.data ? `${rooms.data.length} room${rooms.data.length === 1 ? '' : 's'}` : ''}
          </Typography>
        </Stack>

        {rooms.isPending ? (
          <TableSkeleton rows={8} />
        ) : rooms.isError ? (
          <ErrorState error={rooms.error} onRetry={() => rooms.refetch()} />
        ) : rooms.data.length === 0 ? (
          <EmptyState icon={DoorOpen} title="No rooms match these filters" description="Try a lower minimum capacity, fewer equipment items or another floor." />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <RoomsTable
              rooms={rooms.data}
              occupancy={occupancyMap}
              selectedRoomId={selectedId}
              onSelect={(room) => update({ room: room.id })}
              onBook={(room) => openBooking({ roomId: room.id })}
            />
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ px: 2.5, py: 1.5 }}>
          “Now” shows whether a meeting is running at this moment. Pick a time in the booking dialog to check a specific slot.
        </Typography>
      </SectionCard>

      {/* Inline panel rather than a drawer: the 3D preview must stay in the page layer to be visible. */}
      {selectedRoom && (
        <Box ref={panelRef} sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
          <SectionCard contentSx={{ p: 2.5, pt: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: -1 }}>
              <IconButton onClick={() => update({ room: undefined })} aria-label="Close room details" size="small">
                <X size={18} />
              </IconButton>
            </Stack>
            <RoomDetailsPanel
              room={selectedRoom}
              occupancy={occupancyMap.get(selectedRoom.id)}
              windowLabel="Right now"
              onBook={() => openBooking({ roomId: selectedRoom.id })}
            />
          </SectionCard>
        </Box>
      )}
      </Box>
    </>
  )
}
