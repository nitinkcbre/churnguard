import { useCallback, useEffect, useMemo, useState } from 'react'
import { TenantStatus, type DashboardData, type Tenant } from './types'

const DAILY_MS = 24 * 60 * 60 * 1000

function findThresholdBreaches(tenants: Tenant[]) {
  return tenants.filter((tenant) => tenant.status === TenantStatus.RED)
}

const EMPTY_DASHBOARD_DATA: DashboardData = {
  tenants: [],
  sentimentTrend: [],
  issueTrend: [],
  riskExplanation: {
    riskFactors: [],
    recommendedAction: '',
    priority: 'Low',
  },
  agentDecisions: [],
  recentInteractions: [],
  tenantTrends: [],
}

export function useDashboardData(load: () => Promise<DashboardData>) {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA)
  const [lastRefresh, setLastRefresh] = useState<string>(() => new Date().toISOString())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await load()
      setData(payload)
      setLastRefresh(new Date().toISOString())
    } catch {
      setError('Failed to load dashboard data from backend API.')
    } finally {
      setLoading(false)
    }
  }, [load])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!autoRefreshEnabled) return

    const timer = setInterval(() => {
      void refresh()
    }, DAILY_MS)

    return () => clearInterval(timer)
  }, [autoRefreshEnabled, refresh])

  const thresholdBreaches = useMemo(() => findThresholdBreaches(data.tenants), [data.tenants])

  return {
    data,
    refresh,
    lastRefresh,
    loading,
    error,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    thresholdBreaches,
  }
}
