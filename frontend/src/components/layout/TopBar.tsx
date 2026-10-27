import {
  Avatar,
  Badge,
  Box,
  ClickAwayListener,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Paper,
  Popover,
  Popper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Bell, CalendarDays, Menu, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOfficeSettings } from '../../context/OfficeSettings'
import { useDashboardSummary, useRooms, useUsers } from '../../hooks/queries'
import { palette } from '../../theme/tokens'
import { floorLabel } from '../../utils/rooms'
import { formatRange, formatTime, officeNow, relativeToNow } from '../../utils/time'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 1, sm: 2 }}
      sx={{ alignItems: 'center', px: { xs: 2, md: 3.5 }, py: 1.75, position: 'sticky', top: 0, zIndex: 10, bgcolor: 'rgba(243,236,225,0.92)', backdropFilter: 'blur(8px)' }}
      className="no-print"
    >
      <IconButton onClick={onMenuClick} sx={{ display: { md: 'none' } }} aria-label="Open navigation">
        <Menu />
      </IconButton>
      <GlobalSearch />
      <Box sx={{ flex: 1, display: { xs: 'none', lg: 'block' } }} />
      <OfficeClock />
      <Notifications />
      <Tooltip title="Guest User (no authentication in this demo)">
        <Avatar sx={{ bgcolor: palette.charcoal, width: 42, height: 42, fontSize: 15, fontWeight: 700, display: { xs: 'none', sm: 'flex' } }}>GU</Avatar>
      </Tooltip>
    </Stack>
  )
}

function OfficeClock() {
  const settings = useOfficeSettings()
  const [now, setNow] = useState(officeNow)
  useEffect(() => {
    const id = window.setInterval(() => setNow(officeNow()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <Tooltip title={`Office time (${settings.officeTimeZone}). All times in the app use this zone.`}>
      <Paper variant="outlined" sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, px: 2, py: 0.9, borderRadius: 3 }}>
        <CalendarDays size={22} color={palette.charcoal} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
            {now.format('D MMMM YYYY')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {now.format('dddd, HH:mm')}
          </Typography>
        </Box>
      </Paper>
    </Tooltip>
  )
}

function Notifications() {
  const summary = useDashboardSummary()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const navigate = useNavigate()
  const inProgress = summary.data?.inProgressMeetings ?? []
  const upcoming = summary.data?.upcomingMeetings.slice(0, 3) ?? []

  return (
    <>
      <Tooltip title="Meetings now and next">
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ bgcolor: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 3, width: 44, height: 44 }}
          aria-label={`${inProgress.length} meetings in progress`}
        >
          <Badge badgeContent={inProgress.length} color="primary">
            <Bell size={20} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, borderRadius: 3, mt: 1 } } }}
      >
        <List dense subheader={<ListSubheader sx={{ fontWeight: 700 }}>In progress</ListSubheader>}>
          {inProgress.length === 0 && <ListItemText sx={{ px: 2 }} secondary="No meetings are running right now." />}
          {inProgress.map((r) => (
            <ListItemButton key={r.id} onClick={() => (setAnchor(null), navigate(`/reservations?roomId=${r.roomId}`))}>
              <ListItemText primary={`${r.meetingTitle} · ${r.roomName}`} secondary={`${r.organizerName} · until ${formatTime(r.endDateTime)}`} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <List dense subheader={<ListSubheader sx={{ fontWeight: 700 }}>Up next</ListSubheader>}>
          {upcoming.map((r) => (
            <ListItemButton key={r.id} onClick={() => (setAnchor(null), navigate(`/reservations?roomId=${r.roomId}`))}>
              <ListItemText primary={`${r.meetingTitle} · ${r.roomName}`} secondary={`${formatRange(r.startDateTime, r.endDateTime)} (${relativeToNow(r.startDateTime)})`} />
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </>
  )
}

/** Search across rooms and users; Enter searches reservations by title, room or organizer. */
function GlobalSearch() {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const rooms = useRooms()
  const users = useUsers()

  const query = term.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!query) return { rooms: [], users: [] }
    return {
      rooms: (rooms.data ?? []).filter((r) => `${r.name} ${r.id}`.toLowerCase().includes(query)).slice(0, 5),
      users: (users.data ?? []).filter((u) => `${u.fullName} ${u.id}`.toLowerCase().includes(query)).slice(0, 5),
    }
  }, [query, rooms.data, users.data])

  const go = (path: string) => {
    setOpen(false)
    setTerm('')
    navigate(path)
  }

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={setAnchor} sx={{ flex: { xs: 1, lg: '0 1 460px' }, minWidth: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search rooms, users or reservations…"
          value={term}
          onChange={(e) => (setTerm(e.target.value), setOpen(true))}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query) go(`/reservations?search=${encodeURIComponent(term.trim())}`)
            if (e.key === 'Escape') setOpen(false)
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              sx: { bgcolor: palette.surface, borderRadius: 3, height: 46 },
            },
            htmlInput: { 'aria-label': 'Search rooms, users or reservations' },
          }}
        />
        <Popper open={open && Boolean(query)} anchorEl={anchor} placement="bottom-start" sx={{ zIndex: 1300, width: anchor?.offsetWidth }}>
          <Paper sx={{ mt: 1, borderRadius: 3, boxShadow: '0 16px 40px rgba(38,35,31,0.16)', overflow: 'hidden' }}>
            <List dense>
              {matches.rooms.length > 0 && <ListSubheader>Rooms</ListSubheader>}
              {matches.rooms.map((room) => (
                <ListItemButton key={room.id} onClick={() => go(`/rooms?room=${room.id}`)}>
                  <ListItemText primary={room.name} secondary={`${room.id} · ${floorLabel(room.floor)} · ${room.capacity} seats`} />
                </ListItemButton>
              ))}
              {matches.users.length > 0 && <ListSubheader>Users</ListSubheader>}
              {matches.users.map((user) => (
                <ListItemButton key={user.id} onClick={() => go(`/users?user=${user.id}`)}>
                  <ListItemText primary={user.fullName} secondary={`${user.id} · ${user.activeReservationCount} active reservations`} />
                </ListItemButton>
              ))}
              <Divider />
              <ListItemButton onClick={() => go(`/reservations?search=${encodeURIComponent(term.trim())}`)}>
                <ListItemText primary={`Search reservations for “${term.trim()}”`} slotProps={{ primary: { sx: { color: palette.orangeDark, fontWeight: 600 } } }} />
              </ListItemButton>
            </List>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}
