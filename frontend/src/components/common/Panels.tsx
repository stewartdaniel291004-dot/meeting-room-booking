import { Box, Paper, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { palette } from '../../theme/tokens'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'space-between', mb: 3 }}
    >
      <Box>
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 640 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1.5} className="no-print">
          {actions}
        </Stack>
      )}
    </Stack>
  )
}

/** A white card with an icon-and-title header, as used throughout the dashboard. */
export function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  sx,
  contentSx,
}: {
  title?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  sx?: SxProps<Theme>
  contentSx?: SxProps<Theme>
}) {
  return (
    <Paper
      variant="outlined"
      sx={[
        { borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(38,35,31,0.04)' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {title && (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2.25, pb: 1.5, gap: 1 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            {Icon && (
              <Box sx={{ color: palette.orange, display: 'flex' }}>
                <Icon size={20} />
              </Box>
            )}
            <Typography variant="h3" component="h2" noWrap>
              {title}
            </Typography>
          </Stack>
          {action}
        </Stack>
      )}
      <Box sx={[{ flex: 1, minHeight: 0 }, ...(Array.isArray(contentSx) ? contentSx : [contentSx])]}>{children}</Box>
    </Paper>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color = palette.orange,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  color?: string
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, p: 2.25, display: 'flex', gap: 1.75, alignItems: 'center', minWidth: 0 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 3,
          display: { xs: 'none', sm: 'grid' },
          placeItems: 'center',
          color,
          bgcolor: `${color}1A`,
          flexShrink: 0,
        }}
      >
        <Icon size={22} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {hint}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
