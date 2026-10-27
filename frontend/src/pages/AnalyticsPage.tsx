import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { CalendarRange, CircleStop, Clock, Gauge, Printer, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { PageHeader, SectionCard, StatCard } from '../components/common/Panels'
import { EmptyState, ErrorState, LoadingState } from '../components/common/States'
import { useRoomUsage } from '../hooks/queries'
import { palette, tableColors } from '../theme/tokens'
import type { RoomUsage } from '../types/api'
import { formatDateTime, officeDayBounds, officeNow } from '../utils/time'

type Period = 'all' | '7' | '30'

// Two series on one hours axis. Validated with the dataviz palette checker (CVD ΔE 30).
const SERIES = { planned: '#E8913A', actual: '#2F6FDB' } as const

const percent = (value: number | null) => (value === null ? 'n/a' : `${value}%`)

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('all')
  const range = useMemo(() => {
    if (period === 'all') return { from: undefined, to: undefined }
    const today = officeNow().format('YYYY-MM-DD')
    const start = officeNow().subtract(Number(period), 'day').format('YYYY-MM-DD')
    return { from: officeDayBounds(start).start, to: officeDayBounds(today).end }
  }, [period])
  const report = useRoomUsage(range.from, range.to)

  const chartData = useMemo(
    () =>
      (report.data?.rooms ?? [])
        .filter((r) => r.plannedHours > 0)
        .map((r) => ({ name: r.roomName, planned: r.plannedHours, actual: r.actualHours, flagged: r.isFrequentlyBookedRarelyUsed })),
    [report.data],
  )

  return (
    <>
      <PageHeader
        title="Room usage analytics"
        description="Which rooms are often booked but rarely used? Booked hours are compared with recorded meeting hours (meetings ended early record their real end time)."
        actions={
          <>
            <ToggleButtonGroup size="small" exclusive value={period} onChange={(_, v: Period | null) => v && setPeriod(v)} aria-label="Period">
              <ToggleButton value="7">7 days</ToggleButton>
              <ToggleButton value="30">30 days</ToggleButton>
              <ToggleButton value="all">All time</ToggleButton>
            </ToggleButtonGroup>
            <Button variant="outlined" startIcon={<Printer size={17} />} onClick={() => window.print()}>
              Export PDF
            </Button>
          </>
        }
      />

      {report.isPending ? (
        <LoadingState minHeight={320} />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} />
      ) : (
        <Stack spacing={2.5}>
          <Alert severity="info" icon={<Gauge size={20} />} sx={{ borderRadius: 3 }}>
            Usage is measured from <strong>recorded meeting times</strong>, not sensors: it shows how long booked meetings actually ran, not how many people were
            physically present. A room is flagged when it has at least {report.data.thresholds.minimumReservationsForFlag} reservations and either less than{' '}
            {report.data.thresholds.lowUsageThresholdPercent}% of booked time was used or at least {report.data.thresholds.highCancellationThresholdPercent}% of
            bookings were cancelled. All figures are calculated by the backend.
          </Alert>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
            <StatCard icon={CalendarRange} label="Reservations" value={report.data.totals.totalReservations} hint={`${report.data.totals.completedMeetings} completed · ${report.data.totals.cancelledReservations} cancelled`} />
            <StatCard icon={Clock} label="Booked vs used hours" value={`${report.data.totals.actualHours} / ${report.data.totals.plannedHours}`} hint="completed meetings" color={palette.blue} />
            <StatCard icon={Gauge} label="Overall usage rate" value={percent(report.data.totals.usageRatePercent)} hint={`${report.data.totals.earlyEndedMeetings} meetings ended early`} color={palette.green} />
            <StatCard icon={TriangleAlert} label="Booked but rarely used" value={report.data.totals.flaggedRooms} hint="rooms flagged" color={palette.red} />
          </Box>

          <SectionCard title="Booked vs. used hours per room" icon={CircleStop} contentSx={{ px: 2, pb: 2 }}>
            {chartData.length === 0 ? (
              <EmptyState title="No completed meetings in this period" description="Usage appears once meetings have taken place." />
            ) : (
              <Box sx={{ height: 340 }} role="img" aria-label="Grouped bar chart of booked and used hours per room. The table below lists the same values.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2} barCategoryGap="22%">
                    <CartesianGrid vertical={false} stroke={palette.border} strokeWidth={1} />
                    <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: palette.border }} tick={{ fontSize: 12, fill: palette.textSecondary }} interval={0} angle={-30} textAnchor="end" height={56} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: palette.textSecondary }} unit=" h" allowDecimals={false} />
                    <ChartTooltip
                      cursor={{ fill: 'rgba(38,35,31,0.05)' }}
                      contentStyle={{ borderRadius: 10, border: `1px solid ${palette.border}`, fontSize: 13 }}
                      formatter={(value, name) => [`${value} h`, name === 'planned' ? 'Booked' : 'Used']}
                    />
                    <Legend itemSorter={(item) => (item.dataKey === 'planned' ? 0 : 1)} formatter={(value) => <span style={{ color: palette.text }}>{value === 'planned' ? 'Booked hours' : 'Used hours (recorded)'}</span>} />
                    <Bar dataKey="planned" fill={SERIES.planned} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="actual" fill={SERIES.actual} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </SectionCard>

          <SectionCard title="Per-room breakdown" icon={CalendarRange}>
            <Box sx={{ overflowX: 'auto' }}>
              <UsageTable rooms={report.data.rooms} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2.5, py: 1.5 }}>
              Generated {formatDateTime(report.data.generatedAt)} office time. Seat fill compares planned attendees to capacity; it is not measured attendance.
            </Typography>
          </SectionCard>
        </Stack>
      )}
    </>
  )
}

function UsageTable({ rooms }: { rooms: RoomUsage[] }) {
  return (
    <TableContainer>
      <Table size="small" aria-label="Room usage" sx={{ minWidth: 1000 }}>
        <TableHead>
          <TableRow>
            <TableCell>Room</TableCell>
            <TableCell align="right">Reservations</TableCell>
            <TableCell align="right">Upcoming</TableCell>
            <TableCell align="right">Completed</TableCell>
            <TableCell align="right">Cancelled</TableCell>
            <TableCell align="right">Ended early</TableCell>
            <TableCell align="right">Booked h</TableCell>
            <TableCell align="right">Used h</TableCell>
            <TableCell align="right">Usage rate</TableCell>
            <TableCell align="right">Cancellation rate</TableCell>
            <TableCell align="right">Seat fill</TableCell>
            <TableCell>Assessment</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rooms.map((r) => (
            <TableRow key={r.roomId} hover sx={{ bgcolor: r.isFrequentlyBookedRarelyUsed ? tableColors.rowBooked : undefined }}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {r.roomName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {r.roomId} · floor {r.floor}
                  {!r.isActive && ' · inactive'}
                </Typography>
              </TableCell>
              <TableCell align="right">{r.totalReservations}</TableCell>
              <TableCell align="right">{r.upcomingReservations}</TableCell>
              <TableCell align="right">{r.completedMeetings}</TableCell>
              <TableCell align="right">{r.cancelledReservations}</TableCell>
              <TableCell align="right">{r.earlyEndedMeetings}</TableCell>
              <TableCell align="right">{r.plannedHours}</TableCell>
              <TableCell align="right">{r.actualHours}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {percent(r.usageRatePercent)}
              </TableCell>
              <TableCell align="right">{percent(r.cancellationRatePercent)}</TableCell>
              <TableCell align="right">{percent(r.averageSeatFillPercent)}</TableCell>
              <TableCell>
                {r.isFrequentlyBookedRarelyUsed ? (
                  <Tooltip title={r.flagReasons.join(' ')}>
                    <Chip size="small" icon={<TriangleAlert size={14} />} label="Booked, rarely used" sx={{ bgcolor: palette.redSoft, color: tableColors.statusBooked, '& .MuiChip-icon': { color: 'inherit' } }} />
                  </Tooltip>
                ) : r.totalReservations === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No data
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    OK
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
