import { Box, CssBaseline, IconButton, ThemeProvider, createTheme } from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js'
import { BrowserRouter } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { AppRoutes } from './AppRoutes'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTooltip,
  Legend,
  Filler,
)

const THEME_KEY = 'churnguard-theme'
const AUTH_KEY = 'churnguard-auth'

function buildTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#0f766e' : '#2dd4bf',
      },
      secondary: {
        main: mode === 'light' ? '#d97706' : '#f59e0b',
      },
      background: {
        default: mode === 'light' ? '#f4f7f8' : '#0f1720',
        paper: mode === 'light' ? '#ffffff' : '#111827',
      },
      success: { main: '#16a34a' },
      warning: { main: '#ca8a04' },
      error: { main: '#dc2626' },
    },
    typography: {
      fontFamily: 'Sora, Space Grotesk, sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
    },
    shape: { borderRadius: 14 },
  })
}

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'dark' ? 'dark' : 'light'
  })

  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem(AUTH_KEY) === 'yes')

  const theme = useMemo(() => buildTheme(mode), [mode])

  const handleThemeToggle = () => {
    const next = mode === 'light' ? 'dark' : 'light'
    setMode(next)
    localStorage.setItem(THEME_KEY, next)
  }

  const handleLogin = () => {
    localStorage.setItem(AUTH_KEY, 'yes')
    setAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY)
    setAuthenticated(false)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1000 }}>
        <IconButton
          color="primary"
          onClick={handleThemeToggle}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 3,
          }}
        >
          {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Box>
      <BrowserRouter>
        <AppRoutes authenticated={authenticated} onLogin={handleLogin} onLogout={handleLogout} />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
