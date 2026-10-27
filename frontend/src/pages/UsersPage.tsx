import { Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import { CalendarDays, Search, UserRound, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { PageHeader, SectionCard } from '../components/common/Panels'
import { EmptyState, ErrorState, LoadingState, TableSkeleton } from '../components/common/States'
import { ReservationStatusChip } from '../components/common/StatusBadges'
import { UserFigure } from '../components/three/UserFigure'
import { UsersTable } from '../components/users/UsersTable'
import { useUser, useUsers } from '../hooks/queries'
import { colorForUser, palette, tableColors } from '../theme/tokens'
import { formatRange } from '../utils/time'

export default function UsersPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const users = useUsers(deferredSearch || undefined)
  const selectedId = params.get('user') ?? undefined

  const select = (id?: string) => {
    const next = new URLSearchParams(params)
    if (id) next.set('user', id)
    else next.delete('user')
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can organize meetings. Active reservations are booked meetings that have not ended yet, including ones in progress — counted by the server."
      />

      <Box sx={{ display: 'grid', gap: 2.5, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: selectedId ? 'minmax(0, 1fr) 400px' : 'minmax(0, 1fr)' } }}>
      <SectionCard>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', p: 2.5, pb: 2 }}>
          <TextField
            size="small"
            placeholder="Search by name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 300 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
          />
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {users.data ? `${users.data.length} user${users.data.length === 1 ? '' : 's'}` : ''}
          </Typography>
        </Stack>
        {users.isPending ? (
          <TableSkeleton rows={8} />
        ) : users.isError ? (
          <ErrorState error={users.error} onRetry={() => users.refetch()} />
        ) : users.data.length === 0 ? (
          <EmptyState icon={UserRound} title="No users found" description={`Nobody matches “${search}”.`} />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <UsersTable users={users.data} onSelect={(u) => select(u.id)} selectedUserId={selectedId} />
          </Box>
        )}
      </SectionCard>

      {selectedId && (
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
          <SectionCard contentSx={{ p: 2.5, pt: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: -1 }}>
              <IconButton onClick={() => select(undefined)} aria-label="Close user details" size="small">
                <X size={18} />
              </IconButton>
            </Stack>
            <UserDetails userId={selectedId} />
          </SectionCard>
        </Box>
      )}
      </Box>
    </>
  )
}

function UserDetails({ userId }: { userId: string }) {
  const details = useUser(userId)
  if (details.isPending) return <LoadingState />
  if (details.isError) return <ErrorState error={details.error} onRetry={() => details.refetch()} />

  const { user, activeReservations } = details.data
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <UserFigure color={colorForUser(user.id)} size={96} />
        <Box>
          <Typography variant="h2">{user.fullName}</Typography>
          <Typography variant="body2" color="text.secondary">
            ID: {user.id}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Active reservations: <strong style={{ color: tableColors.count }}>{user.activeReservationCount}</strong>
          </Typography>
        </Box>
      </Stack>

      <Typography variant="h4">Active reservations</Typography>
      {activeReservations.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No active reservations" />
      ) : (
        <Stack spacing={1.25}>
          {activeReservations.map((r) => (
            <Box key={r.id} sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${palette.border}`, bgcolor: palette.surfaceMuted }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {r.meetingTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.roomName} · {formatRange(r.startDateTime, r.endDateTime)} · {r.attendeeCount} attendees
                  </Typography>
                </Box>
                <ReservationStatusChip reservation={r} />
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
      <Button component={RouterLink} to={`/reservations?organizerId=${user.id}`} variant="outlined">
        Manage in Reservations
      </Button>
    </Stack>
  )
}
