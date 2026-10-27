import { Avatar, Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import { CalendarDays, ChartColumn, DoorOpen, LayoutDashboard, Users } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { palette } from '../../theme/tokens'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rooms', label: 'Rooms', icon: DoorOpen },
  { to: '/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
] as const

export function Logo() {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      {/* Same artwork as public/favicon.svg: a "C" that doubles as a round table with seats. */}
      <Box component="img" src="/favicon.svg" alt="" sx={{ width: 40, height: 40 }} />
      <Box sx={{ lineHeight: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.05, letterSpacing: '-0.02em' }}>Caucus</Typography>
        <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2, color: palette.textSecondary }}>Room booking</Typography>
      </Box>
    </Stack>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  return (
    <Stack sx={{ height: '100%', px: 2, py: 3, bgcolor: '#F8F2E8' }}>
      <Box sx={{ px: 1, mb: 4 }}>
        <Logo />
      </Box>

      <List component="nav" aria-label="Main navigation" sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to)
          return (
            <ListItemButton
              key={to}
              component={NavLink}
              to={to}
              onClick={onNavigate}
              selected={active}
              aria-current={active ? 'page' : undefined}
              sx={{
                borderRadius: 2.5,
                py: 1.1,
                color: palette.charcoal,
                '&.Mui-selected, &.Mui-selected:hover': {
                  bgcolor: palette.orange,
                  color: '#FFFFFF',
                  boxShadow: '0 6px 16px rgba(242,138,26,0.32)',
                },
                '&:hover': { bgcolor: palette.orangeSoft },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                <Icon size={21} />
              </ListItemIcon>
              <ListItemText primary={label} slotProps={{ primary: { sx: { fontWeight: active ? 700 : 500 } } }} />
            </ListItemButton>
          )
        })}
      </List>

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 1, pt: 2, borderTop: `1px solid ${palette.border}` }}>
        <Avatar sx={{ bgcolor: palette.charcoal, width: 40, height: 40, fontSize: 15, fontWeight: 700 }}>GU</Avatar>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Guest User
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ID: G-001 · no sign-in needed
          </Typography>
        </Box>
      </Stack>
    </Stack>
  )
}
