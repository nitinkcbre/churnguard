import type { DashboardData, TenantPortfolioData } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    let message = `API request failed: ${response.status}`
    try {
      const errorPayload = (await response.json()) as { message?: string }
      if (errorPayload?.message) {
        message = errorPayload.message
      }
    } catch {
      // Ignore JSON parsing failures for non-JSON error bodies.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export function fetchDashboardData(): Promise<DashboardData> {
  return request<DashboardData>('/dashboard')
}

export function fetchTenantPortfolioData(tenantId: string): Promise<TenantPortfolioData> {
  return request<TenantPortfolioData>(`/tenants/${tenantId}/portfolio`)
}

export interface AiTenantUpdate {
  tenantId: string
  tenantName: string
  trend: 'Improving' | 'Stable' | 'Declining'
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  riskLevel: 'Low' | 'Medium' | 'High'
  incidentPriority: 'Low' | 'Medium' | 'High'
  incidentSummary: string
  latestAiUpdate: string
  recommendedAction: string
}

export interface AiTrendUpdate {
  generatedAt: string
  modelUsed: string
  overallSummary: string
  tenantUpdates: AiTenantUpdate[]
}

export interface PromptProcessorSentimentPoint {
  sourceDocId: string | null
  sentimentScore: number
  sentimentLabel: string | null
  frustrationSignal: boolean
  issueCategory: string | null
  createdAt: string | null
  text: string
}

export interface PromptProcessorResult {
  tenantId: string
  sourceMessageCount: number
  executiveSummary: string
  riskLevel: string | null
  keyRiskDrivers: string[]
  recommendation: {
    nextAction: string
    whoShouldAct: string
    whyItMatters: string
    suggestedTimeframe: string
    additionalSteps: string[]
  }
  sentimentSeries: PromptProcessorSentimentPoint[]
}

export function fetchPromptProcessorResult(tenantId: string): Promise<PromptProcessorResult> {
  return request<PromptProcessorResult>(`/prompt-processor/${tenantId}`)
}

export function fetchLatestAiUpdates(): Promise<AiTrendUpdate> {
  return request<AiTrendUpdate>('/ai/updates/latest')
}

export async function generateAiUpdates(): Promise<AiTrendUpdate> {
  const response = await fetch(`${API_BASE_URL}/ai/updates/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    let message = `AI update generation failed: ${response.status}`
    try {
      const errorPayload = (await response.json()) as { message?: string }
      if (errorPayload?.message) {
        message = errorPayload.message
      }
    } catch {
      // Ignore JSON parsing failures for non-JSON error bodies.
    }
    throw new Error(message)
  }

  return response.json() as Promise<AiTrendUpdate>
}
