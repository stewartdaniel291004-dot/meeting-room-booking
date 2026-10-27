import { Box, Button, CircularProgress, Skeleton, Stack, Typography } from '@mui/material'
import { Inbox, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { errorMessage } from '../../api/client'
import { palette } from '../../theme/tokens'

export function LoadingState({ label = 'Loading…', minHeight = 160 }: { label?: string; minHeight?: number }) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', minHeight, color: 'text.secondary' }} role="status">
      <CircularProgress size={28} />
      <Typography variant="body2">{label}</Typography>
    </Stack>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={40} />
      ))}
    </Stack>
  )
}

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: 'center', justifyContent: 'center', minHeight: compact ? 100 : 180, p: 3, textAlign: 'center' }}
      role="alert"
    >
      <Box sx={{ color: palette.red }}>
        <TriangleAlert size={compact ? 22 : 30} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {errorMessage(error)}
      </Typography>
      {onRetry && (
        <Button size="small" variant="outlined" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Stack>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', py: 5, px: 3, textAlign: 'center' }}>
      <Box sx={{ color: palette.muted, mb: 0.5 }}>
        <Icon size={30} />
      </Box>
      <Typography variant="subtitle2">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
          {description}
        </Typography>
      )}
      {action}
    </Stack>
  )
}
