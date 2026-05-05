export const TenantStatus = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
} as const

export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus]

export type TenantTier = 'Standard' | 'Premium'

export interface Tenant {
  tenantId: string
  name: string
  tier: TenantTier
  propertyId: string
  healthScore: number
  status: TenantStatus
  leaseRenewalDate: string
  nextBestAction: string
}

export interface SentimentPoint {
  day: string
  score: number
}

export interface IssuePoint {
  day: string
  total: number
  urgent: number
}

export interface RiskExplanation {
  riskFactors: string[]
  recommendedAction: string
  priority: 'High' | 'Medium' | 'Low'
}

export interface AgentDecision {
  id: string
  tenantName: string
  action: string
  decision: string
  reasoning: string
}

export interface TenantInteraction {
  id: string
  tenantName: string
  channel: 'Email' | 'Ticket' | 'Survey' | 'Call Summary'
  subject: string
  timestamp: string
  sentiment: string
}

export interface DashboardData {
  tenants: Tenant[]
  sentimentTrend: SentimentPoint[]
  issueTrend: IssuePoint[]
  riskExplanation: RiskExplanation
  agentDecisions: AgentDecision[]
  recentInteractions: TenantInteraction[]
  tenantTrends: TenantTrend[]
}

export interface TenantTrend {
  tenantId: string
  values: number[]
}

export interface TenantPortfolioData {
  tenant: Tenant
  aiOverview: string
  riskFactors: string[]
  recommendedAction: string
  sentimentTrend: SentimentPoint[]
  issueTrend: IssuePoint[]
}
