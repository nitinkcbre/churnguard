import dayjs from 'dayjs'
import { TenantStatus } from './types'

export function getStatusFromScore(score: number): TenantStatus {
  if (score >= 80) return TenantStatus.GREEN
  if (score >= 50) return TenantStatus.YELLOW
  return TenantStatus.RED
}

export function getStatusColor(status: TenantStatus): string {
  if (status === TenantStatus.GREEN) return '#15803d'
  if (status === TenantStatus.YELLOW) return '#a16207'
  return '#b91c1c'
}

export function formatLeaseCountdown(renewalDate: string): string {
  const days = dayjs(renewalDate).diff(dayjs(), 'day')
  if (days < 0) return `${Math.abs(days)} days overdue`
  return `${days} days`
}

export function humanDateTime(timestamp: string): string {
  return dayjs(timestamp).format('DD MMM YYYY, HH:mm')
}
