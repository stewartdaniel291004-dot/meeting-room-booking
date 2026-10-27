import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { ChevronRight } from 'lucide-react'
import { colorForUser, tableColors } from '../../theme/tokens'
import type { User } from '../../types/api'
import { UserFigure } from '../three/UserFigure'

export function UsersTable({
  users,
  onSelect,
  selectedUserId,
  compact = false,
}: {
  users: User[]
  onSelect?: (user: User) => void
  selectedUserId?: string
  compact?: boolean
}) {
  return (
    <TableContainer>
      <Table size={compact ? 'small' : 'medium'} aria-label="Users">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: compact ? 72 : 96 }}>User</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>ID</TableCell>
            <TableCell align="center">Active reservations</TableCell>
            {onSelect && <TableCell sx={{ width: 40 }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user, index) => (
            <TableRow
              key={user.id}
              hover
              selected={user.id === selectedUserId}
              onClick={onSelect ? () => onSelect(user) : undefined}
              sx={{
                cursor: onSelect ? 'pointer' : undefined,
                '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tableColors.rowSelected },
                '&:last-child td': { borderBottom: 0 },
              }}
            >
              <TableCell sx={{ py: 0.5 }}>
                <UserFigure color={colorForUser(user.id)} size={compact ? 42 : 56} phase={index * 0.9} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user.fullName}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {user.id}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 700, color: tableColors.count }}>
                  {user.activeReservationCount}
                </Typography>
              </TableCell>
              {onSelect && (
                <TableCell sx={{ color: 'text.secondary' }}>
                  <ChevronRight size={18} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
