import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import './print.css'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'dayjs/locale/en-gb'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ApiError } from './api/client'
import { BookingDialogProvider } from './components/booking/BookingDialog'
import { ToastProvider } from './components/common/ToastProvider'
import { OfficeSettingsProvider } from './context/OfficeSettings'
import { theme } from './theme/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      // Don't retry client errors (4xx); they won't fix themselves.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* en-gb: weeks start on Monday, as in the reference design */}
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <BrowserRouter>
            <ToastProvider>
              <OfficeSettingsProvider>
                <BookingDialogProvider>
                  <App />
                </BookingDialogProvider>
              </OfficeSettingsProvider>
            </ToastProvider>
          </BrowserRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
