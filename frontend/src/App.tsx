import { Button } from '@mui/material'
import { lazy } from 'react'
import { Link as RouterLink, Route, Routes } from 'react-router-dom'
import { EmptyState } from './components/common/States'
import { AppLayout } from './components/layout/AppLayout'

// Pages are split into their own chunks; the 3D code only loads where it is used.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const RoomsPage = lazy(() => import('./pages/RoomsPage'))
const ReservationsPage = lazy(() => import('./pages/ReservationsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route
          path="*"
          element={
            <EmptyState
              title="Page not found"
              description="The page you are looking for does not exist."
              action={
                <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 1 }}>
                  Back to dashboard
                </Button>
              }
            />
          }
        />
      </Route>
    </Routes>
  )
}
