import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
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
  Toolbar,
  Tooltip as MuiTooltip,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { useNavigate } from 'react-router-dom'
import { fetchDashboardData } from '../api'
import { MiniSparkline } from '../components/MiniSparkline'
import { StatusChip } from '../components/StatusChip'
import { TenantStatus, type DashboardData } from '../types'
import { useDashboardData } from '../useDashboardData'
import {  humanDateTime } from '../utils'

type DashboardPageProps = Readonly<{
  onLogout: () => void
}>

function kpiCards(data: DashboardData) {
  const redCount = data.tenants.filter((tenant) => tenant.status === TenantStatus.RED).length
  const avgScore =
    data.tenants.reduce((sum, tenant) => sum + tenant.healthScore, 0) /
    Math.max(data.tenants.length, 1)
  const renewalSoon = data.tenants.filter((tenant) => {
    const days = tenant.leaseRenewalDate
    if (days === null) return false
    return days >= 0 && days <= 120
  }).length

  return [
    { label: 'Total Tenants', value: data.tenants.length.toString() },
    { label: 'Red Risk Tenants', value: redCount.toString() },
    { label: 'Avg Health Score', value: Math.round(avgScore).toString() },
    { label: 'Renewals in 120 Days', value: renewalSoon.toString() },
  ]
}

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const navigate = useNavigate()
  const {
    data,
    lastRefresh,
    loading,
    error,
  } = useDashboardData(fetchDashboardData)

  const [team, setTeam] = useState('Account Manager')
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [snackOpen, setSnackOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<{ name: string; whoShouldAct?: string | null } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | TenantStatus>('ALL')
  const selectedTenantSuffix = selectedTenant ? ` for ${selectedTenant.name}` : ''
  const escalateOwner = selectedTenant?.whoShouldAct?.trim() || team
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

  const filteredTenants = useMemo(() => {
    if (statusFilter === 'ALL') {
      return data.tenants
    }
    return data.tenants.filter((tenant) => tenant.status === statusFilter)
  }, [data.tenants, statusFilter])

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
          <Button disabled sx={{ mr: 1 }}>
            Auto refresh: Daily
          </Button>
          <Button onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
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
          <Grid size={{ xs: 12, lg: 9 }}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="h6">Tenant Health List</Typography>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      label="Status"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TenantStatus)}
                    >
                      <MenuItem value="ALL">All</MenuItem>
                      <MenuItem value={TenantStatus.GREEN}>Green</MenuItem>
                      <MenuItem value={TenantStatus.YELLOW}>Yellow</MenuItem>
                      <MenuItem value={TenantStatus.RED}>Red</MenuItem>
                    </Select>
                  </FormControl>
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
                      {filteredTenants.map((tenant) => (
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
                            <StatusChip score={tenant.healthScore} status={tenant.status} />
                          </TableCell>
                          <TableCell align="center">{tenant.healthScore}</TableCell>
                          <TableCell align="center">{tenant.leaseRenewalDate} days</TableCell>
                          <TableCell align="center">
                            <MiniSparkline values={tenantTrendById.get(tenant.tenantId) ?? []} />
                          </TableCell>
                          <TableCell>
                            <MuiTooltip title={tenant.nextBestAction || 'N/A'} arrow>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: { xs: 180, md: 340 },
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  cursor: 'help',
                                }}
                              >
                                {tenant.nextBestAction || 'N/A'}
                              </Typography>
                            </MuiTooltip>
                          </TableCell>
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
                                  setSelectedTenant({ name: tenant.name, whoShouldAct: tenant.whoShouldAct })
                                  setEscalateOpen(true)
                                }}
                              >
                                Escalate
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredTenants.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No tenants found for selected status.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
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

          <Grid size={{ xs: 12, lg: 3 }}>
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
          Escalate to Team{selectedTenant ? ` - ${selectedTenant.name}` : ''}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This sends an automated communication for threshold-breached tenants.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Suggested Owner: {escalateOwner}
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
    </Box>
  )
}
