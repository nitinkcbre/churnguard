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

export function getDaysUntilRenewal(renewalDate: string): number | null {
  const countdownRegex = /^(-?\d+)\s*days?/i
  const countdownMatch = countdownRegex.exec(String(renewalDate).trim())

  if (countdownMatch) {
    const parsed = Number.parseInt(countdownMatch[1], 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  const parsedDate = dayjs(renewalDate)
  if (!parsedDate.isValid()) {
    return null
  }

  return parsedDate.diff(dayjs(), 'day')
}

export function formatLeaseCountdown(renewalDate: string): string {
  const days = getDaysUntilRenewal(renewalDate)
  if (days === null) return 'N/A'
  if (days < 0) return `${Math.abs(days)} days overdue`
  return `${days} days`
}

export function humanDateTime(timestamp: string): string {
  return dayjs(timestamp).format('DD MMM YYYY, HH:mm')
}
