import { Alert, Snackbar, type AlertColor } from '@mui/material'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  severity: AlertColor
}

type Notify = (message: string, severity?: AlertColor) => void

const ToastContext = createContext<Notify>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const notify = useCallback<Notify>((message, severity = 'success') => {
    setToast({ id: Date.now(), message, severity })
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <Snackbar
        key={toast?.id}
        open={Boolean(toast)}
        autoHideDuration={toast?.severity === 'error' ? 8000 : 4500}
        onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity ?? 'success'}
          variant="filled"
          sx={{ borderRadius: 3, boxShadow: '0 12px 32px rgba(38,35,31,0.18)', maxWidth: 480 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext)
