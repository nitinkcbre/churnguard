import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { Bar as ChartBar, Line as ChartLine } from 'react-chartjs-2'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchTenantPortfolioData } from '../api'
import { StatusChip } from '../components/StatusChip'
import type { TenantPortfolioData } from '../types'
import { formatLeaseCountdown } from '../utils'

type TenantPortfolioPageProps = Readonly<{
  onLogout: () => void
}>

export function TenantPortfolioPage({ onLogout }: TenantPortfolioPageProps) {
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

  const marginAwareOffer = useMemo(
    () => portfolio?.targetedOffers || portfolio?.tenant?.targetedOffers || [],
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

      <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
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
              <Typography variant="h6">{portfolio.tenant.leaseRenewalDate} days</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.2 }}>
              <Typography variant="body2" color="text.secondary">Lease Amount</Typography>
              <Typography variant="h6">${portfolio.tenant.leaseValue ?? 'N/A'}</Typography>
            </Paper>
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>Sentiment Trend</Typography>
                    <Box sx={{ position: 'relative', height: { xs: 220, md: 280 }, width: '100%', overflow: 'hidden' }}>
                      <ChartLine
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
                      <ChartBar
                        data={issueData}
                        options={{ responsive: true, maintainAspectRatio: false, resizeDelay: 150 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>Targeted Margin-Aware Offer</Typography>
                    <List dense>
                      {marginAwareOffer.map((offer) => (
                        <ListItem key={offer} sx={{ px: 0 }}>
                          <ListItemText primary={offer} />
                        </ListItem>
                      ))}
                      {marginAwareOffer.length === 0 && (
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText primary="No targeted offers available." />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                 
                <Typography variant="body2" color="text.secondary">Recommended Action</Typography>
                <Typography sx={{ fontWeight: 700 }}>{portfolio.recommendedAction}</Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="h6" sx={{ mb: 1.2 }}>AI Overview</Typography>
                <Typography sx={{ mb: 1.5 }}>{portfolio.aiOverview}</Typography>
                <List dense>
                  {portfolio.riskFactors.map((factor) => (
                    <ListItem key={factor} sx={{ px: 0 }}>
                      <ListItemText primary={factor} />
                    </ListItem>
                  ))}
                </List>
               
              </CardContent>
            </Card>
          </Grid>
        </Grid>

       
      </Box>
    </Box>
  )
}
