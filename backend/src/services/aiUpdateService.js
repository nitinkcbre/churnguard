import { AzureOpenAI } from 'openai'
import dayjs from 'dayjs'
import { AiTrendUpdate } from '../models/AiTrendUpdate.js'
import { EmailInteraction } from '../models/EmailInteraction.js'
import { Incident } from '../models/Incident.js'
import { Lease } from '../models/Lease.js'

function getAiConfig() {
  return {
    endpoint: (process.env.AZURE_OPENAI_ENDPOINT || '').trim(),
    apiKey: (process.env.AZURE_OPENAI_API_KEY || '').trim(),
    apiVersion: (process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview').trim(),
    primaryDeployment: (process.env.AZURE_OPENAI_DEPLOYMENT_PRIMARY || 'gpt-5.4-mini').trim(),
    fallbackDeployment: (process.env.AZURE_OPENAI_DEPLOYMENT_FALLBACK || 'gpt-5.4').trim(),
  }
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function extractJsonPayload(text) {
  const direct = safeJsonParse(text)
  if (direct) return direct

  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    const parsed = safeJsonParse(fenced[1])
    if (parsed) return parsed
  }

  const braces = text.match(/\{[\s\S]*\}/)
  if (braces?.[0]) {
    const parsed = safeJsonParse(braces[0])
    if (parsed) return parsed
  }

  return null
}

function buildPrompt(payload) {
  return [
    'You are a tenant churn risk analyst.',
    'Return STRICT JSON only with this schema:',
    '{"overallSummary": string, "tenantUpdates": [{"tenantId": string, "trend": "Improving|Stable|Declining", "sentiment": "Positive|Neutral|Negative", "riskLevel": "Low|Medium|High", "incidentPriority": "Low|Medium|High", "incidentSummary": string, "latestAiUpdate": string, "recommendedAction": string}]}',
    'Derive trend, sentiment, risk level, and recommended actions from ONLY these tenant signals: email interactions, incidents, and leases.',
    'Explicitly include incidentPriority and incidentSummary for each tenant based on incident severity, open count, and recurrence.',
    'Do not rely on any precomputed trend field. Do not include markdown.',
    `Input data: ${JSON.stringify(payload)}`,
  ].join('\n')
}

async function callAzureDeployment(client, deployment, prompt) {
  const response = await client.chat.completions.create({
    model: deployment,
    messages: [
      {
        role: 'system',
        content: 'You are a precise JSON API. Output JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_completion_tokens: 4096,
  })

  const content = response?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Azure OpenAI response did not contain message content')
  }

  return { content, model: deployment }
}

function scoreSentiment(emails) {
  return emails.reduce((sum, email) => {
    if (email.sentiment === 'Positive') return sum + 1
    if (email.sentiment === 'Negative') return sum - 1
    return sum
  }, 0)
}

function deriveFallback(trendDelta, sentimentScoreValue, openIncidents, highSeverityIncidents, renewalDays) {
  let trend = 'Stable'
  if (trendDelta > 0.2) trend = 'Improving'
  if (trendDelta < -0.2) trend = 'Declining'

  let sentiment = 'Neutral'
  if (sentimentScoreValue > 0) sentiment = 'Positive'
  if (sentimentScoreValue < 0) sentiment = 'Negative'

  let riskLevel = 'Low'
  if (openIncidents >= 2 || highSeverityIncidents >= 1 || renewalDays <= 120) riskLevel = 'Medium'
  if (openIncidents >= 3 || highSeverityIncidents >= 2 || (renewalDays <= 90 && sentiment === 'Negative')) {
    riskLevel = 'High'
  }

  let incidentPriority = 'Low'
  if (openIncidents >= 2 || highSeverityIncidents >= 1) incidentPriority = 'Medium'
  if (openIncidents >= 3 || highSeverityIncidents >= 2) incidentPriority = 'High'

  let recommendedAction = 'Maintain monthly engagement check-in and monitor incoming incidents.'
  if (riskLevel === 'Medium') {
    recommendedAction = 'Assign an owner, acknowledge issues proactively, and send a progress update in 48 hours.'
  }
  if (riskLevel === 'High') {
    recommendedAction = 'Escalate to Account Manager and Property Manager for proactive intervention within 24 hours.'
  }

  return { trend, sentiment, riskLevel, incidentPriority, recommendedAction }
}

function normalizeTenantUpdates(parsed, tenantSignals) {
  const updates = Array.isArray(parsed?.tenantUpdates) ? parsed.tenantUpdates : []
  const byId = new Map(updates.map((item) => [item.tenantId, item]))

  return tenantSignals.map((signal) => {
    const modelItem = byId.get(signal.tenantId)
    const fallback = deriveFallback(
      signal.trendDelta,
      signal.sentimentScore,
      signal.openIncidents,
      signal.highSeverityIncidents,
      signal.renewalDays,
    )

    return {
      tenantId: signal.tenantId,
      tenantName: signal.tenantName,
      trend: modelItem?.trend || fallback.trend,
      sentiment: modelItem?.sentiment || fallback.sentiment,
      riskLevel: modelItem?.riskLevel || fallback.riskLevel,
      incidentPriority: modelItem?.incidentPriority || fallback.incidentPriority,
      incidentSummary:
        modelItem?.incidentSummary ||
        `${signal.incidentSummary.open} open incidents, ${signal.incidentSummary.highSeverity} high-severity, dominant category: ${signal.incidentSummary.dominantCategory}.`,
      latestAiUpdate:
        modelItem?.latestAiUpdate ||
        `${signal.tenantName} shows ${fallback.trend.toLowerCase()} momentum with ${fallback.sentiment.toLowerCase()} sentiment and ${fallback.riskLevel.toLowerCase()} risk level.`,
      recommendedAction: modelItem?.recommendedAction || fallback.recommendedAction,
    }
  })
}

function buildTenantSignals(leases, emails, incidents) {
  return leases.map((lease) => {
    const tenantEmails = emails.filter((item) => item.tenantId === lease.tenantId)
    const tenantIncidents = incidents.filter((item) => item.tenantId === lease.tenantId)

    const recentCutoff = dayjs().subtract(7, 'day')
    const previousCutoff = dayjs().subtract(14, 'day')

    const recentEmails = tenantEmails.filter((item) => dayjs(item.timestamp).isAfter(recentCutoff))
    const previousEmails = tenantEmails.filter(
      (item) => dayjs(item.timestamp).isAfter(previousCutoff) && dayjs(item.timestamp).isBefore(recentCutoff),
    )

    const recentSentimentScore = scoreSentiment(recentEmails)
    const previousSentimentScore = scoreSentiment(previousEmails)

    const incidentCategoryCount = tenantIncidents.reduce((acc, item) => {
      const key = item.category || 'General'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const dominantCategory = Object.entries(incidentCategoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'

    return {
      tenantId: lease.tenantId,
      tenantName: lease.tenantName,
      tier: lease.tier,
      propertyId: lease.propertyId,
      leaseRenewalDate: dayjs(lease.leaseRenewalDate).format('YYYY-MM-DD'),
      renewalDays: dayjs(lease.leaseRenewalDate).diff(dayjs(), 'day'),
      emailSummary: {
        total: tenantEmails.length,
        positive: tenantEmails.filter((item) => item.sentiment === 'Positive').length,
        neutral: tenantEmails.filter((item) => item.sentiment === 'Neutral').length,
        negative: tenantEmails.filter((item) => item.sentiment === 'Negative').length,
      },
      incidentSummary: {
        total: tenantIncidents.length,
        open: tenantIncidents.filter((item) => item.status === 'Open').length,
        highSeverity: tenantIncidents.filter((item) => item.severity === 'High').length,
        dominantCategory,
      },
      sentimentScore: scoreSentiment(tenantEmails),
      trendDelta: recentSentimentScore - previousSentimentScore,
      openIncidents: tenantIncidents.filter((item) => item.status === 'Open').length,
      highSeverityIncidents: tenantIncidents.filter((item) => item.severity === 'High').length,
    }
  })
}

export async function generateAiTrendUpdate() {
  const config = getAiConfig()

  if (!config.endpoint) {
    throw new Error('Missing AZURE_OPENAI_ENDPOINT. Add it to backend/.env and restart backend.')
  }

  if (!config.apiKey) {
    throw new Error('Missing AZURE_OPENAI_API_KEY. Add it to backend/.env and restart backend.')
  }

  const client = new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    apiVersion: config.apiVersion,
  })

  const [leases, emails, incidents] = await Promise.all([
    Lease.find().lean(),
    EmailInteraction.find().lean(),
    Incident.find().lean(),
  ])

  const tenantSignals = buildTenantSignals(leases, emails, incidents)
  const prompt = buildPrompt({ tenantSignals })

  let completion
  try {
    completion = await callAzureDeployment(client, config.primaryDeployment, prompt)
  } catch {
    completion = await callAzureDeployment(client, config.fallbackDeployment, prompt)
  }

  const parsed = extractJsonPayload(completion.content)

  const doc = await AiTrendUpdate.create({
    modelUsed: completion.model,
    overallSummary: parsed?.overallSummary || 'Generated AI update with fallback normalization.',
    tenantUpdates: normalizeTenantUpdates(parsed, tenantSignals),
    rawResponse: completion.content,
  })

  return doc.toObject()
}

export async function getLatestAiTrendUpdate() {
  const latest = await AiTrendUpdate.findOne().sort({ generatedAt: -1 }).lean()
  return latest
}
