import { Box, Drawer } from '@mui/material'
import { Suspense, lazy, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingState } from '../common/States'
import { isWebGLAvailable } from '../three/webgl'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const ViewCanvas = lazy(() => import('../three/ViewCanvas').then((m) => ({ default: m.ViewCanvas })))

export const SIDEBAR_WIDTH = 236

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="aside" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: 0 }} className="no-print">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH } }}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, borderRight: 'none', borderTopRightRadius: 24, borderBottomRightRadius: 24 } }}
        >
          <Sidebar />
        </Drawer>
      </Box>

      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <Box sx={{ flex: 1, px: { xs: 2, md: 3.5 }, pt: 1.5, pb: 5, maxWidth: 1680, width: '100%', mx: 'auto' }}>
          <Suspense fallback={<LoadingState minHeight={320} />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>

      {isWebGLAvailable() && (
        <Suspense fallback={null}>
          <ViewCanvas />
        </Suspense>
      )}
    </Box>
  )
}
