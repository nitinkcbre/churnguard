import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip as MuiTooltip,
  Toolbar,
  Typography,
  createTheme,
  ThemeProvider,
} from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import dayjs from 'dayjs'
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
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchDashboardData,
  fetchLatestAiUpdates,
  fetchTenantPortfolioData,
  generateAiUpdates,
  type AiTrendUpdate,
} from './api'
import { useDashboardData } from './useDashboardData'
import { TenantStatus, type DashboardData, type TenantPortfolioData } from './types'
import {
  formatLeaseCountdown,
  getStatusColor,
  getStatusFromScore,
  humanDateTime,
} from './utils'

type LoginPageProps = Readonly<{
  onLogin: () => void
}>

type StatusChipProps = Readonly<{
  score: number
}>

type DashboardPageProps = Readonly<{
  onLogout: () => void
}>

type TenantPortfolioPageProps = Readonly<{
  onLogout: () => void
}>

type AppRoutesProps = Readonly<{
  authenticated: boolean
  onLogin: () => void
  onLogout: () => void
}>

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

function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at 20% 20%, rgba(15,118,110,0.18), transparent 48%), radial-gradient(circle at 80% 0%, rgba(217,119,6,0.17), transparent 38%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 430, p: 1 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Churn Guard AI
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }} color="text.secondary">
            Agentic Tenant Churn and Experience Risk Guard
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Work email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              size="large"
              onClick={onLogin}
              disabled={!email || !password}
            >
              Enter Dashboard
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

function StatusChip({ score }: StatusChipProps) {
  const status = getStatusFromScore(score)
  return (
    <Chip
      label={status}
      sx={{
        bgcolor: getStatusColor(status),
        color: '#fff',
        fontWeight: 700,
        minWidth: 84,
      }}
      size="small"
    />
  )
}

function MiniSparkline({ values }: Readonly<{ values: number[] }>) {
  if (!values || values.length === 0) {
    return <Typography variant="caption" color="text.secondary">No data</Typography>
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const start = values.at(0) ?? 0
  const end = values.at(-1) ?? start
  const delta = end - start

  let direction = 'stable'
  if (delta > 2) {
    direction = 'improving'
  } else if (delta < -2) {
    direction = 'declining'
  }

  let barColor = '#ca8a04'
  if (direction === 'improving') barColor = '#16a34a'
  if (direction === 'declining') barColor = '#dc2626'

  const tooltipText = `10-day values: ${values.join(', ')} | Trend: ${direction}`

  return (
    <MuiTooltip title={tooltipText} arrow>
      <Box sx={{ display: 'inline-flex', alignItems: 'flex-end', gap: 0.4, height: 28, cursor: 'help' }}>
        {values.map((value, index) => {
          const normalized = ((value - min) / range) * 16 + 8
          return (
            <Box
              key={`${value}-${index}`}
              sx={{
                width: 3,
                height: `${normalized}px`,
                borderRadius: '2px',
                bgcolor: barColor,
                opacity: 0.45 + (index / values.length) * 0.5,
              }}
            />
          )
        })}
      </Box>
    </MuiTooltip>
  )
}

function kpiCards(data: DashboardData) {
  const redCount = data.tenants.filter((tenant) => tenant.status === TenantStatus.RED).length
  const avgScore =
    data.tenants.reduce((sum, tenant) => sum + tenant.healthScore, 0) /
    Math.max(data.tenants.length, 1)
  const renewalSoon = data.tenants.filter((tenant) => {
    const days = dayjs(tenant.leaseRenewalDate).diff(dayjs(), 'day')
    return days >= 0 && days <= 120
  }).length

  return [
    { label: 'Total Tenants', value: data.tenants.length.toString() },
    { label: 'Red Risk Tenants', value: redCount.toString() },
    { label: 'Avg Health Score', value: Math.round(avgScore).toString() },
    { label: 'Renewals in 120 Days', value: renewalSoon.toString() },
  ]
}

function DashboardPage({ onLogout }: DashboardPageProps) {
  const navigate = useNavigate()
  const {
    data,
    refresh,
    lastRefresh,
    loading,
    error,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    thresholdBreaches,
  } = useDashboardData(fetchDashboardData)

  const [team, setTeam] = useState('Account Manager')
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [snackOpen, setSnackOpen] = useState(false)
  const [refreshInfo, setRefreshInfo] = useState<string | null>(null)
  const [aiUpdateError, setAiUpdateError] = useState<string | null>(null)
  const [latestAiUpdate, setLatestAiUpdate] = useState<AiTrendUpdate | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const selectedTenantSuffix = selectedTenant ? ` for ${selectedTenant}` : ''
  const escalationMessage = `Escalation sent to ${team}${selectedTenantSuffix}.`

  const healthDistribution = useMemo(() => {
    const green = data.tenants.filter((tenant) => tenant.status === TenantStatus.GREEN).length
    const yellow = data.tenants.filter((tenant) => tenant.status === TenantStatus.YELLOW).length
    const red = data.tenants.filter((tenant) => tenant.status === TenantStatus.RED).length

    return {
      labels: ['Green', 'Yellow', 'Red'],
      datasets: [
        {
          data: [green, yellow, red],
          backgroundColor: ['#16a34a', '#ca8a04', '#dc2626'],
          borderWidth: 0,
        },
      ],
    }
  }, [data.tenants])

  const recentTopFive = useMemo(
    () =>
      [...data.recentInteractions]
        .sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf())
        .slice(0, 5),
    [data.recentInteractions],
  )

  const tenantTrendById = useMemo(
    () => new Map(data.tenantTrends.map((item) => [item.tenantId, item.values])),
    [data.tenantTrends],
  )

  useEffect(() => {
    const loadLatestAiUpdate = async () => {
      try {
        const payload = await fetchLatestAiUpdates()
        setLatestAiUpdate(payload)
        setAiUpdateError(null)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load latest AI update.'
        setAiUpdateError(message)
      }
    }

    void loadLatestAiUpdate()
  }, [])

  const handleRefreshClick = async () => {
    try {
      const aiUpdate = await generateAiUpdates()
      setLatestAiUpdate(aiUpdate)
      setAiUpdateError(null)
      setRefreshInfo(`AI trend refreshed via ${aiUpdate.modelUsed}`)
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : 'AI update generation failed.'
      setAiUpdateError(message)
      setRefreshInfo(`Dashboard refreshed. ${message}`)
    } finally {
      await refresh()
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(160deg, rgba(15,118,110,0.08) 0%, rgba(217,119,6,0.08) 40%, rgba(148,163,184,0.06) 100%)',
      }}
    >
      <AppBar color="transparent" position="sticky" elevation={0}>
        <Toolbar sx={{ backdropFilter: 'blur(8px)', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Churn Guard AI Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            Last refresh: {humanDateTime(lastRefresh)}
          </Typography>
          <Button startIcon={<RefreshIcon />} onClick={() => void handleRefreshClick()} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)} sx={{ mr: 1 }}>
            {autoRefreshEnabled ? 'Auto refresh: Daily' : 'Auto refresh: Off'}
          </Button>
          <Button onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1360, mx: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {thresholdBreaches.length > 0 && (
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setSelectedTenant(null)
                  setEscalateOpen(true)
                }}
              >
                Escalate
              </Button>
            }
            sx={{ mb: 3 }}
          >
            Automated alert triggered: {thresholdBreaches.length} tenant(s) breached threshold.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {kpiCards(data).map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
              <Paper sx={{ p: 2.2 }}>
                <Typography variant="body2" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography variant="h4">{card.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center' }}>
                  <Typography variant="h6">Tenant Health List</Typography>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tenant</TableCell>
                        <TableCell>Tier</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Health Score</TableCell>
                        <TableCell align="center">Lease Countdown</TableCell>
                        <TableCell align="center">Signal Trend</TableCell>
                        <TableCell>Recommended Action</TableCell>
                        <TableCell align="center">Escalate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.tenants.map((tenant) => (
                        <TableRow
                          key={tenant.tenantId}
                          hover
                          onClick={() => navigate(`/tenant/${tenant.tenantId}`)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{tenant.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tenant.tenantId}
                            </Typography>
                          </TableCell>
                          <TableCell>{tenant.tier}</TableCell>
                          <TableCell align="center">
                            <StatusChip score={tenant.healthScore} />
                          </TableCell>
                          <TableCell align="center">{tenant.healthScore}</TableCell>
                          <TableCell align="center">{formatLeaseCountdown(tenant.leaseRenewalDate)}</TableCell>
                          <TableCell align="center">
                            <MiniSparkline values={tenantTrendById.get(tenant.tenantId) ?? []} />
                          </TableCell>
                          <TableCell>{tenant.nextBestAction}</TableCell>
                          <TableCell align="center">
                            {tenant.status === TenantStatus.GREEN ? (
                              <Typography variant="caption" color="text.secondary">
                                N/A
                              </Typography>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                color={tenant.status === TenantStatus.RED ? 'error' : 'warning'}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedTenant(tenant.name)
                                  setEscalateOpen(true)
                                }}
                              >
                                Escalate
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1.5 }}>Recent Tenant Interactions (Top 5)</Typography>
                <Box sx={{ maxHeight: { xs: 240, md: 280 }, overflowY: 'auto', pr: 0.5 }}>
                  <List>
                    {recentTopFive.map((interaction) => (
                      <ListItem key={interaction.id} sx={{ px: 0 }}>
                        <ListItemText
                          primary={`${interaction.tenantName} · ${interaction.channel} · ${interaction.subject}`}
                          secondary={`${humanDateTime(interaction.timestamp)} · Sentiment ${interaction.sentiment}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1.2 }}>Latest AI Update</Typography>
                {latestAiUpdate ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Generated: {humanDateTime(latestAiUpdate.generatedAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Model: {latestAiUpdate.modelUsed}
                    </Typography>
                    <Typography sx={{ mb: 1.5 }}>{latestAiUpdate.overallSummary}</Typography>
                    <List dense>
                      {latestAiUpdate.tenantUpdates.slice(0, 5).map((update) => (
                        <ListItem key={update.tenantId} sx={{ px: 0 }}>
                          <ListItemText
                            primary={`${update.tenantName} • ${update.trend} • ${update.sentiment} • ${update.riskLevel}`}
                            secondary={`Incidents: ${update.incidentSummary} Priority: ${update.incidentPriority}. ${update.latestAiUpdate} Next step: ${update.recommendedAction}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No AI update generated yet.
                  </Typography>
                )}
                {aiUpdateError && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    {aiUpdateError}
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1.5 }}>Health Distribution</Typography>
                <Box sx={{ position: 'relative', height: { xs: 220, md: 260 }, width: '100%', overflow: 'hidden' }}>
                  <Doughnut
                    data={healthDistribution}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      resizeDelay: 150,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>

          </Grid>
        </Grid>
      </Box>

      <Dialog open={escalateOpen} onClose={() => setEscalateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Escalate to Team{selectedTenant ? ` - ${selectedTenant}` : ''}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This sends an automated communication for threshold-breached tenants.
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="team-select-label">Notify</InputLabel>
            <Select
              labelId="team-select-label"
              label="Notify"
              value={team}
              onChange={(event) => setTeam(event.target.value)}
            >
              <MenuItem value="Account Manager">Account Manager</MenuItem>
              <MenuItem value="Operations Team">Operations Team</MenuItem>
              <MenuItem value="Property Manager">Property Manager</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setEscalateOpen(false)
              setSnackOpen(true)
            }}
          >
            Send Escalation
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message={escalationMessage}
      />

      <Snackbar
        open={Boolean(refreshInfo)}
        autoHideDuration={3500}
        onClose={() => setRefreshInfo(null)}
        message={refreshInfo ?? ''}
      />
    </Box>
  )
}

function TenantPortfolioPage({ onLogout }: TenantPortfolioPageProps) {
  const navigate = useNavigate()
  const { tenantId } = useParams()
  const tenantIdMissing = !tenantId
  const [portfolio, setPortfolio] = useState<TenantPortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      return
    }

    const loadPortfolio = async () => {
      setLoading(true)
      setError(null)
      try {
        const payload = await fetchTenantPortfolioData(tenantId)
        setPortfolio(payload)
      } catch {
        setError('Failed to load tenant portfolio from backend API.')
      } finally {
        setLoading(false)
      }
    }

    void loadPortfolio()
  }, [tenantId])

  const sentimentData = useMemo(
    () => ({
      labels: portfolio?.sentimentTrend.map((point) => point.day) ?? [],
      datasets: [
        {
          label: 'Sentiment Score',
          data: portfolio?.sentimentTrend.map((point) => point.score) ?? [],
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15,118,110,0.22)',
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [portfolio],
  )

  const issueData = useMemo(
    () => ({
      labels: portfolio?.issueTrend.map((point) => point.day) ?? [],
      datasets: [
        {
          label: 'Total Issues',
          data: portfolio?.issueTrend.map((point) => point.total) ?? [],
          backgroundColor: 'rgba(217,119,6,0.78)',
        },
        {
          label: 'Urgent Issues',
          data: portfolio?.issueTrend.map((point) => point.urgent) ?? [],
          backgroundColor: 'rgba(220,38,38,0.74)',
        },
      ],
    }),
    [portfolio],
  )

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (tenantIdMissing || error || !portfolio) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>{error ?? (tenantIdMissing ? 'Tenant id is missing.' : 'Tenant not found')}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(160deg, rgba(15,118,110,0.08) 0%, rgba(217,119,6,0.08) 40%, rgba(148,163,184,0.06) 100%)',
      }}
    >
      <AppBar color="transparent" position="sticky" elevation={0}>
        <Toolbar sx={{ backdropFilter: 'blur(8px)', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            Dashboard
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Tenant Portfolio - {portfolio.tenant.name}
          </Typography>
          <Button onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.2 }}>
              <Typography variant="body2" color="text.secondary">Tenant ID</Typography>
              <Typography variant="h6">{portfolio.tenant.tenantId}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.2 }}>
              <Typography variant="body2" color="text.secondary">Health Score</Typography>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">{portfolio.tenant.healthScore}</Typography>
                <StatusChip score={portfolio.tenant.healthScore} />
              </Stack>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.2 }}>
              <Typography variant="body2" color="text.secondary">Lease Countdown</Typography>
              <Typography variant="h6">{formatLeaseCountdown(portfolio.tenant.leaseRenewalDate)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.2 }}>
              <Typography variant="body2" color="text.secondary">Property</Typography>
              <Typography variant="h6">{portfolio.tenant.propertyId}</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.2 }}>AI Overview</Typography>
            <Typography sx={{ mb: 1.5 }}>{portfolio.aiOverview}</Typography>
            <List dense>
              {portfolio.riskFactors.map((factor) => (
                <ListItem key={factor} sx={{ px: 0 }}>
                  <ListItemText primary={factor} />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" color="text.secondary">Recommended Action</Typography>
            <Typography sx={{ fontWeight: 700 }}>{portfolio.recommendedAction}</Typography>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>Sentiment Trend</Typography>
                <Box sx={{ position: 'relative', height: { xs: 220, md: 280 }, width: '100%', overflow: 'hidden' }}>
                  <Line
                    data={sentimentData}
                    options={{ responsive: true, maintainAspectRatio: false, resizeDelay: 150 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>Issue Trend</Typography>
                <Box sx={{ position: 'relative', height: { xs: 220, md: 280 }, width: '100%', overflow: 'hidden' }}>
                  <Bar
                    data={issueData}
                    options={{ responsive: true, maintainAspectRatio: false, resizeDelay: 150 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

function AppRoutes({ authenticated, onLogin, onLogout }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={onLogin} />}
      />
      <Route
        path="/dashboard"
        element={authenticated ? <DashboardPage onLogout={onLogout} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/tenant/:tenantId"
        element={authenticated ? <TenantPortfolioPage onLogout={onLogout} /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
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
