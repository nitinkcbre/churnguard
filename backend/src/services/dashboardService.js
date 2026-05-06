import dayjs from 'dayjs'
import { AiPromptProcessorResult } from '../models/AiPromptProcessorResult.js'
import { TenantHealthScoreHistory } from '../models/TenantHealthScoreHistory.js'
import { EmailInteraction } from '../models/EmailInteraction.js'
import { Incident } from '../models/Incident.js'
import { Lease } from '../models/Lease.js'

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num))
}

function tenantOffset(tenantId) {
  if (!tenantId) return 0
  const total = [...tenantId].reduce((sum, char) => sum + (char.codePointAt(0) || 0), 0)
  return (total % 11) - 5
}

function sentimentScore(sentiment) {
  if (sentiment === 'Positive') return 90
  if (sentiment === 'Neutral') return 65
  return 40
}

function toTitleCaseTrend(value) {
  if (!value || typeof value !== 'string') return null
  const normalized = value.toLowerCase()
  if (normalized === 'improving') return 'Improving'
  if (normalized === 'declining') return 'Declining'
  if (normalized === 'stable') return 'Stable'
  return null
}

function toTitleCaseRisk(value) {
  if (!value || typeof value !== 'string') return null
  const normalized = value.toLowerCase()
  if (normalized === 'high') return 'High'
  if (normalized === 'medium') return 'Medium'
  if (normalized === 'low') return 'Low'
  return null
}

function toTitleCaseSentiment(value) {
  if (!value || typeof value !== 'string') return null
  const normalized = value.toLowerCase()
  if (normalized === 'positive') return 'Positive'
  if (normalized === 'neutral') return 'Neutral'
  if (normalized === 'negative') return 'Negative'
  return null
}

function toPercentScore(value) {
  if (!Number.isFinite(value)) return null
  return clamp(Math.round((Number(value) + 1) * 50), 0, 100)
}

function normalizeTenantId(tenantId) {
  if (tenantId === null || tenantId === undefined) return ''
  return String(tenantId).trim().toUpperCase()
}

function escapeRegex(value) {
  const specialChars = new Set(['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'])
  let escaped = ''
  for (const char of value) {
    escaped += specialChars.has(char) ? `\\${char}` : char
  }
  return escaped
}

function getTenantIdFromDoc(doc) {
  if (!doc || typeof doc !== 'object') return null

  if (typeof doc.tenant_id === 'string' && doc.tenant_id.trim()) {
    return normalizeTenantId(doc.tenant_id)
  }

  if (typeof doc._id === 'string' && doc._id.includes('::')) {
    const [, suffix] = doc._id.split('::')
    if (suffix) {
      return normalizeTenantId(suffix)
    }
  }

  return null
}

function mapPromptDocsByTenant(promptDocs) {
  return new Map(
    promptDocs
      .map((doc) => ({ key: getTenantIdFromDoc(doc), doc }))
      .filter((entry) => entry.key)
      .map((entry) => [entry.key, entry.doc]),
  )
}

async function findTenantHealthHistoryDoc(tenantId) {
  const normalizedTenantId = normalizeTenantId(tenantId)
  if (!normalizedTenantId) {
    return null
  }

  const strictMatch = await TenantHealthScoreHistory.findOne({
    doc_type: 'tenant_health_score_history',
    tenant_id: normalizedTenantId,
  }).lean()
  if (strictMatch) {
    return strictMatch
  }

  const byId = await TenantHealthScoreHistory.findOne({
    _id: `tenant_health_history::${normalizedTenantId}`,
  }).lean()
  if (byId) {
    return byId
  }

  const looseMatch = await TenantHealthScoreHistory.findOne({
    doc_type: { $regex: '^tenant_health', $options: 'i' },
    tenant_id: { $regex: `^${escapeRegex(normalizedTenantId)}$`, $options: 'i' },
  }).lean()
  if (looseMatch) {
    return looseMatch
  }

  return TenantHealthScoreHistory.findOne({
    _id: { $regex: `(^tenant_health[^:]*::${escapeRegex(normalizedTenantId)}$)`, $options: 'i' },
  }).lean()
}

function buildSentimentTrendFromPrompt1(prompt1Output, tenantId = '') {
  const entries = Array.isArray(prompt1Output) ? prompt1Output : []
  const lastEntries = entries.slice(-10)

  if (lastEntries.length === 0) {
    return buildSentimentTrend([], tenantId)
  }

  return lastEntries.map((entry, index) => {
    const fallbackDay = dayjs().subtract(lastEntries.length - 1 - index, 'day')
    const createdAt = entry?.created_at ? dayjs(entry.created_at) : fallbackDay
    const converted = toPercentScore(Number(entry?.sentiment_score))
    const score = Number.isFinite(converted) ? converted : 50
    return {
      day: createdAt.format('DD MMM'),
      score,
    }
  })
}

function parseHistoryDate(value, fallback) {
  if (value instanceof Date) return dayjs(value)
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = dayjs(value)
    if (parsed.isValid()) return parsed
  }

  const nestedDate = value && typeof value === 'object' ? value.$date : null
  if (typeof nestedDate === 'string' || typeof nestedDate === 'number') {
    const parsed = dayjs(nestedDate)
    if (parsed.isValid()) return parsed
  }

  return fallback
}

function buildSentimentTrendFromHealthHistory(healthScoreHistory, tenantId = '') {
  const entries = Array.isArray(healthScoreHistory) ? healthScoreHistory : []
  const normalized = entries
    .map((entry, index) => {
      const fallbackDay = dayjs().subtract(entries.length - 1 - index, 'day')
      const date = parseHistoryDate(entry?.date, fallbackDay)
      const score = Number(entry?.health_score)

      return {
        date,
        score: Number.isFinite(score) ? clamp(Math.round(score), 0, 100) : null,
      }
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => a.date.valueOf() - b.date.valueOf())
    .slice(-10)

  if (normalized.length === 0) {
    return []
  }

  return normalized.map((entry) => ({
    day: entry.date.format('DD MMM'),
    score: entry.score,
  }))
}

function buildGlobalSentimentTrendFromPromptDocs(promptDocs) {
  const tenantTrends = promptDocs
    .map((doc) => buildSentimentTrendFromPrompt1(doc?.prompt1_output, doc?.tenant_id || ''))
    .filter((trend) => trend.length > 0)

  if (tenantTrends.length === 0) {
    return []
  }

  return tenantTrends[0].map((point, index) => {
    const scores = tenantTrends
      .map((trend) => trend[index]?.score)
      .filter((value) => Number.isFinite(value))

    const avg = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 50
    return {
      day: point.day,
      score: Math.round(avg),
    }
  })
}

function buildGlobalSentimentTrendFromHistoryDocs(historyDocs) {
  const tenantTrends = historyDocs
    .map((doc) => buildSentimentTrendFromHealthHistory(doc?.health_score_history, doc?.tenant_id || ''))
    .filter((trend) => trend.length > 0)

  if (tenantTrends.length === 0) {
    return []
  }

  return tenantTrends[0].map((point, index) => {
    const scores = tenantTrends
      .map((trend) => trend[index]?.score)
      .filter((value) => Number.isFinite(value))

    const avg = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 50
    return {
      day: point.day,
      score: Math.round(avg),
    }
  })
}

function dominantIncidentCategory(incidents) {
  if (incidents.length === 0) return null

  const counts = new Map()
  for (const incident of incidents) {
    const current = counts.get(incident.category) || 0
    counts.set(incident.category, current + 1)
  }

  let dominant = null
  let max = -1
  for (const [category, count] of counts.entries()) {
    if (count > max) {
      max = count
      dominant = category
    }
  }
  return dominant
}

function getStatus(score) {
  if (score >= 80) return 'GREEN'
  if (score >= 50) return 'YELLOW'
  return 'RED'
}

function getStatusFromRiskLevel(riskLevel) {
  if (riskLevel === 'High') return 'RED'
  if (riskLevel === 'Medium') return 'YELLOW'
  if (riskLevel === 'Low') return 'GREEN'
  return null
}

function computeHealthScore({ negativeEmails, openIncidents, urgentIncidents, renewalDays, tier }) {
  let score = 100
  score -= negativeEmails * 10
  score -= openIncidents * 8
  score -= urgentIncidents * 6
  if (renewalDays <= 120) score -= 8
  if (tier === 'Premium' && negativeEmails > 0) score -= 5
  return clamp(score, 20, 95)
}

async function mapTenant(lease, emails, incidents, promptDoc) {
  const tenantEmails = emails.filter((item) => item.tenantId === lease.tenantId)
  const tenantIncidents = incidents.filter((item) => item.tenantId === lease.tenantId)

  const negativeEmails = tenantEmails.filter((item) => item.sentiment === 'Negative').length
  const openIncidents = tenantIncidents.filter((item) => item.status === 'Open').length
  const urgentIncidents = tenantIncidents.filter((item) => item.severity === 'High').length
  const renewalDays = dayjs(lease.leaseRenewalDate).diff(dayjs(), 'day')

  const baseHealthScore = computeHealthScore({
    negativeEmails,
    openIncidents,
    urgentIncidents,
    renewalDays,
    tier: lease.tier,
  })

  const prompt1 = Array.isArray(promptDoc?.prompt1_output) ? promptDoc.prompt1_output : []
  const prompt2 = promptDoc?.prompt2_output || {}
  const prompt3 = promptDoc?.prompt3_output || {}
  const prompt5Recommendation = promptDoc?.prompt5_output?.recommendation || {}

  const promptAvgSentiment = prompt1
    .map((item) => Number(item?.sentiment_score))
    .filter((value) => Number.isFinite(value))
  const avgPromptScore = promptAvgSentiment.length
    ? Math.round(promptAvgSentiment.reduce((sum, value) => sum + value, 0) / promptAvgSentiment.length * 100) / 100
    : null

  const promptSentimentPercent = toPercentScore(avgPromptScore)
  const contextHealth = Number(promptDoc?.tenant_context?.health_score)
  const riskLevel =
    toTitleCaseRisk(prompt3?.risk_level) ||
    toTitleCaseRisk(prompt5Recommendation?.risk_level)

  let healthScore = baseHealthScore
  if (Number.isFinite(contextHealth) && contextHealth > 0) {
    healthScore = clamp(Math.round(contextHealth), 0, 100)
  } else if (riskLevel === 'High') {
    healthScore = Math.min(healthScore, 40)
  } else if (riskLevel === 'Medium') {
    healthScore = Math.min(healthScore, 65)
  }

  const status = getStatusFromRiskLevel(riskLevel) || getStatus(healthScore)
  const dominantCategory = dominantIncidentCategory(tenantIncidents)

  let nextBestAction = 'Maintain monthly engagement cadence'
  if (status === 'RED') {
    nextBestAction = dominantCategory
      ? `Immediate intervention on ${dominantCategory} incidents with Account Manager call in 24 hours`
      : 'Immediate proactive call by Account Manager within 24 hours'
  }
  if (status === 'YELLOW') {
    nextBestAction = dominantCategory
      ? `Assign dedicated owner for ${dominantCategory} and send progress update in 48 hours`
      : 'Assign owner and send progress update within 48 hours'
  }

  return {
    tenantId: lease.tenantId,
    name: lease.name,
    tier: lease.tier,
    lease_value: lease.lease_value,
    healthScore,
    status,
    aiTrend: toTitleCaseTrend(prompt2?.trend_direction),
    aiSentiment: toTitleCaseSentiment(prompt1[0]?.sentiment_label),
    aiRiskLevel: riskLevel,
    dailySentimentScore: Number.isFinite(promptSentimentPercent) ? promptSentimentPercent : 50,
    leaseRenewalDate: lease.days_to_renewal,
    nextBestAction: prompt5Recommendation?.next_action || nextBestAction,
    whoShouldAct: prompt5Recommendation?.who_should_act || null,
  }
}

function buildSentimentTrend(emails, tenantId = '') {
  const offset = tenantOffset(tenantId)
  const baseFallback = clamp(68 + offset * 2, 45, 85)

  const buckets = []
  for (let index = 9; index >= 0; index -= 1) {
    const date = dayjs().subtract(index, 'day')
    const dayEmails = emails.filter((email) => dayjs(email.timestamp).isSame(date, 'day'))

    if (dayEmails.length === 0) {
      let dayShape = 0
      if (index % 3 === 0) {
        dayShape = -2
      } else if (index % 2 === 0) {
        dayShape = 1
      }
      buckets.push({ day: date.format('DD MMM'), score: clamp(baseFallback + dayShape, 35, 95) })
      continue
    }

    const sentimentValue = dayEmails.reduce((sum, email) => sum + sentimentScore(email.sentiment), 0)
    const weighted = Math.round(sentimentValue / dayEmails.length)

    buckets.push({ day: date.format('DD MMM'), score: clamp(weighted + offset, 25, 95) })
  }
  return buckets
}

function buildIssueTrend(incidents, tenantId = '') {
  const offset = Math.max(0, tenantOffset(tenantId) + 3)
  const points = []
  for (let index = 9; index >= 0; index -= 1) {
    const date = dayjs().subtract(index, 'day')
    const dayIncidents = incidents.filter((incident) => dayjs(incident.openedAt).isSame(date, 'day'))
    const syntheticBase = index % 4 === 0 ? 1 : 0
    const total = dayIncidents.length + syntheticBase + Math.floor(offset / 3)
    const urgentFromData = dayIncidents.filter((incident) => incident.severity === 'High').length

    points.push({
      day: date.format('DD MMM'),
      total,
      urgent: Math.min(total, urgentFromData + (offset > 4 ? 1 : 0)),
    })
  }
  return points
}

function buildRecentInteractions(emails) {
  return [...emails]
    .sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf())
    .slice(0, 5)
    .map((email, index) => ({
      id: `E-${index + 1}`,
      tenantName: email.tenantName,
      channel: 'Email',
      subject: email.subject,
      timestamp: email.timestamp,
      sentiment: email.sentiment,
    }))
}

function buildTenantSignalTrend(emails, incidents, tenantId) {
  const offset = tenantOffset(tenantId)
  const points = []

  for (let index = 9; index >= 0; index -= 1) {
    const date = dayjs().subtract(index, 'day')
    const dayEmails = emails.filter(
      (email) => email.tenantId === tenantId && dayjs(email.timestamp).isSame(date, 'day'),
    )
    const dayIncidents = incidents.filter(
      (incident) => incident.tenantId === tenantId && dayjs(incident.openedAt).isSame(date, 'day'),
    )

    let sentimentAvg = 65
    if (dayEmails.length > 0) {
      const total = dayEmails.reduce((sum, email) => sum + sentimentScore(email.sentiment), 0)
      sentimentAvg = Math.round(total / dayEmails.length)
    }

    const pressure = dayIncidents.length * 6 + dayIncidents.filter((item) => item.severity === 'High').length * 8
    const shaped = clamp(sentimentAvg - pressure + offset, 20, 95)
    points.push(shaped)
  }

  return points
}

function buildRiskExplanation(tenant) {
  if (!tenant) {
    return {
      riskFactors: ['No tenant data available'],
      recommendedAction: 'Ingest tenant interactions and lease records',
      priority: 'Low',
    }
  }

  const daysToRenewal = dayjs(tenant.leaseRenewalDate).diff(dayjs(), 'day')
  let priority = 'Low'
  if (tenant.status === 'RED') {
    priority = 'High'
  } else if (tenant.status === 'YELLOW') {
    priority = 'Medium'
  }

  return {
    riskFactors: [
      `Health score at ${tenant.healthScore}`,
      `Tenant tier ${tenant.tier}`,
      `Lease renewal in ${daysToRenewal} days`,
      tenant.status === 'RED' ? 'Repeated high urgency incidents' : 'Monitor for repeated incidents',
    ],
    recommendedAction: tenant.nextBestAction,
    priority,
  }
}

function buildAgentDecisions(tenants) {
  return tenants
    .filter((tenant) => tenant.status !== 'GREEN')
    .slice(0, 3)
    .map((tenant, index) => ({
      id: `D-${index + 1}`,
      tenantName: tenant.name,
      action: tenant.status === 'RED' ? 'Escalate to Account Manager' : 'Monitor with weekly review',
      decision: tenant.status === 'RED' ? 'Immediate intervention' : 'Intervene this week',
      reasoning: `Score ${tenant.healthScore} with lease proximity and recurring service friction`,
    }))
}

export async function getDashboardPayload() {
  const [leases, emails, incidents, promptDocs, healthHistoryDocs] = await Promise.all([
    Lease.find().lean(),
    EmailInteraction.find().lean(),
    Incident.find().lean(),
    AiPromptProcessorResult.find({ doc_type: 'tenant_prompt_pipeline' }).lean(),
    TenantHealthScoreHistory.find({
      doc_type: { $regex: '^tenant_health', $options: 'i' },
      health_score_history: { $exists: true },
    }).lean(),
  ])

  const promptByTenant = mapPromptDocsByTenant(promptDocs)
  const healthHistoryByTenant = mapPromptDocsByTenant(healthHistoryDocs)

  const tenants = await Promise.all(
    leases.map((lease) => mapTenant(lease, emails, incidents, promptByTenant.get(normalizeTenantId(lease.tenantId)))),
  )
  const sortedTenants = [...tenants]
  sortedTenants.sort((a, b) => a.healthScore - b.healthScore)
  const primaryTenant = sortedTenants[0] || null

  const globalHealthHistoryTrend = buildGlobalSentimentTrendFromHistoryDocs(healthHistoryDocs)
  const globalPromptTrend = buildGlobalSentimentTrendFromPromptDocs(promptDocs)
  let sentimentTrend = buildSentimentTrend(emails, 'ALL')
  if (globalPromptTrend.length > 0) {
    sentimentTrend = globalPromptTrend
  }
  if (globalHealthHistoryTrend.length > 0) {
    sentimentTrend = globalHealthHistoryTrend
  }

  return {
    tenants: sortedTenants,
    sentimentTrend,
    issueTrend: buildIssueTrend(incidents, 'ALL'),
    riskExplanation: buildRiskExplanation(primaryTenant),
    agentDecisions: buildAgentDecisions(sortedTenants),
    recentInteractions: buildRecentInteractions(emails),
    tenantTrends: sortedTenants.map((tenant) => ({
      tenantId: tenant.tenantId,
      values: (() => {
        const historyTrend = buildSentimentTrendFromHealthHistory(
          healthHistoryByTenant.get(normalizeTenantId(tenant.tenantId))?.health_score_history,
          tenant.tenantId,
        )
        if (historyTrend.length > 0) {
          return historyTrend.map((point) => point.score)
        }

        const promptTrend = buildSentimentTrendFromPrompt1(
          promptByTenant.get(normalizeTenantId(tenant.tenantId))?.prompt1_output,
          tenant.tenantId,
        )
        if (promptTrend.length > 0) {
          return promptTrend.map((point) => point.score)
        }

        return buildSentimentTrend([], tenant.tenantId).map((point) => point.score)
      })(),
    })),
  }
}

export async function getTenantPortfolioPayload(tenantId) {
  const normalizedTenantId = normalizeTenantId(tenantId)
  const [lease, emails, incidents, promptDoc, healthHistoryDoc] = await Promise.all([
    Lease.findOne({ tenantId: normalizedTenantId }).lean(),
    EmailInteraction.find({ tenantId: normalizedTenantId }).lean(),
    Incident.find({ tenantId: normalizedTenantId }).lean(),
    AiPromptProcessorResult.findOne({ doc_type: 'tenant_prompt_pipeline', tenant_id: normalizedTenantId }).lean(),
    findTenantHealthHistoryDoc(normalizedTenantId),
  ])

  if (!lease) {
    return null
  }

  const tenant = await mapTenant(lease, emails, incidents, promptDoc)
  const dominantCategory = dominantIncidentCategory(incidents)
  const negativeCount = emails.filter((email) => email.sentiment === 'Negative').length
  const neutralCount = emails.filter((email) => email.sentiment === 'Neutral').length
  const positiveCount = emails.filter((email) => email.sentiment === 'Positive').length
  const dominantCategorySuffix = dominantCategory ? `, especially in ${dominantCategory}` : ''
  const moderateCategorySuffix = dominantCategory ? ` around ${dominantCategory}` : ''

  let aiOverview = `${tenant.name} is healthy with stable interaction patterns and low operational risk.`
  if (typeof promptDoc?.prompt6_output?.executive_summary === 'string' && promptDoc.prompt6_output.executive_summary.trim()) {
    aiOverview = promptDoc.prompt6_output.executive_summary
  }
  if (tenant.status === 'RED') {
    aiOverview = `${tenant.name} is high risk with clustered negative signals and unresolved incidents near renewal${dominantCategorySuffix}.`
  } else if (tenant.status === 'YELLOW') {
    aiOverview = `${tenant.name} has moderate churn signals that need proactive intervention and monitoring${moderateCategorySuffix}.`
  }

  if (typeof promptDoc?.prompt6_output?.executive_summary === 'string' && promptDoc.prompt6_output.executive_summary.trim()) {
    aiOverview = promptDoc.prompt6_output.executive_summary
  }

  const defaultRiskFactors = [
    `${negativeCount} negative email interactions`,
    `${neutralCount} neutral and ${positiveCount} positive interactions`,
    `${incidents.filter((incident) => incident.status === 'Open').length} open incidents`,
    `${incidents.filter((incident) => incident.severity === 'High').length} high severity incidents`,
    dominantCategory ? `Dominant recurring category: ${dominantCategory}` : 'No dominant recurring category',
    `Renewal in ${dayjs(lease.leaseRenewalDate).diff(dayjs(), 'day')} days`,
  ]

  const promptRiskFactors = Array.isArray(promptDoc?.prompt3_output?.key_risk_drivers)
    ? promptDoc.prompt3_output.key_risk_drivers
    : []
  const riskFactors = promptRiskFactors.length > 0 ? promptRiskFactors : defaultRiskFactors
  const healthHistoryTrend = buildSentimentTrendFromHealthHistory(healthHistoryDoc?.health_score_history, normalizedTenantId)
  const promptTrend = buildSentimentTrendFromPrompt1(promptDoc?.prompt1_output, normalizedTenantId)
  let sentimentTrend = buildSentimentTrend(emails, tenantId)
  if (promptTrend.length > 0) {
    sentimentTrend = promptTrend
  }
  if (healthHistoryTrend.length > 0) {
    sentimentTrend = healthHistoryTrend
  }
  const issueTrend = buildIssueTrend(incidents, tenantId)

  const recommendedAction =
    promptDoc?.prompt5_output?.recommendation?.next_action ||
    tenant.nextBestAction

  return {
    tenant,
    aiOverview,
    riskFactors,
    recommendedAction,
    sentimentTrend,
    issueTrend,
  }
}
