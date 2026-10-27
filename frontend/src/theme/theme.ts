import { createTheme } from '@mui/material/styles'
import { palette, tableColors } from './tokens'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.orange, dark: palette.orangeDark, contrastText: '#FFFFFF' },
    secondary: { main: palette.charcoal },
    success: { main: palette.green, dark: palette.greenDark },
    error: { main: palette.red },
    warning: { main: palette.amber },
    info: { main: palette.blue },
    background: { default: palette.background, paper: palette.surface },
    text: { primary: palette.text, secondary: palette.textSecondary },
    divider: palette.border,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.1rem', fontWeight: 700 },
    h4: { fontSize: '1rem', fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: palette.background },
        '@media print': {
          body: { backgroundColor: '#FFFFFF' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: palette.border },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, paddingInline: 16 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: palette.border, paddingTop: 12, paddingBottom: 12 },
        head: {
          backgroundColor: tableColors.headerBackground,
          color: tableColors.headerText,
          fontWeight: 600,
          fontSize: '0.8125rem',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20 } },
    },
  },
})
