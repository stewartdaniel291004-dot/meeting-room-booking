import { Box } from '@mui/material'
import { createContext, useContext, type ReactNode } from 'react'
import { useSettings } from '../hooks/queries'
import type { Settings } from '../types/api'
import { setOfficeTimeZone } from '../utils/time'
import { ErrorState, LoadingState } from '../components/common/States'

const OfficeSettingsContext = createContext<Settings | null>(null)

/**
 * Loads the backend settings once (booking limits, office time zone) before rendering the app, so every
 * control and every timestamp uses the same rules and zone as the API.
 */
export function OfficeSettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSettings()

  if (settings.isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingState label="Connecting to the booking service…" />
      </Box>
    )
  }

  if (settings.isError) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
      </Box>
    )
  }

  setOfficeTimeZone(settings.data.officeTimeZone)
  return <OfficeSettingsContext.Provider value={settings.data}>{children}</OfficeSettingsContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useOfficeSettings(): Settings {
  const settings = useContext(OfficeSettingsContext)
  if (!settings) {
    throw new Error('useOfficeSettings must be used inside OfficeSettingsProvider')
  }
  return settings
}
