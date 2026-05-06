import { Router } from 'express'
import { AiPromptProcessorResult } from '../models/AiPromptProcessorResult.js'
import { getDashboardPayload, getTenantPortfolioPayload } from '../services/dashboardService.js'
import { generateAiTrendUpdate, getLatestAiTrendUpdate } from '../services/aiUpdateService.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/dashboard', async (_req, res, next) => {
  try {
    const payload = await getDashboardPayload()
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.get('/tenants/:tenantId/portfolio', async (req, res, next) => {
  try {
    const payload = await getTenantPortfolioPayload(req.params.tenantId)
    if (!payload) {
      res.status(404).json({ message: 'Tenant not found' })
      return
    }
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.get('/prompt-processor/:tenantId', async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId
    const doc = await AiPromptProcessorResult.findOne({
      doc_type: 'tenant_prompt_pipeline',
      tenant_id: tenantId,
    }).lean()

    if (!doc) {
      res.status(404).json({ message: `No prompt-processor result found for tenant ${tenantId}` })
      return
    }

    const prompt1 = Array.isArray(doc.prompt1_output) ? doc.prompt1_output : []
    const prompt3 = doc.prompt3_output || {}
    const prompt5 = doc.prompt5_output?.recommendation || {}
    const prompt6 = doc.prompt6_output || {}

    res.json({
      tenantId: doc.tenant_id,
      sourceMessageCount: Number(doc.source_message_count || 0),
      executiveSummary: prompt6.executive_summary || '',
      riskLevel: prompt3.risk_level || null,
      keyRiskDrivers: Array.isArray(prompt3.key_risk_drivers) ? prompt3.key_risk_drivers : [],
      recommendation: {
        nextAction: prompt5.next_action || '',
        whoShouldAct: prompt5.who_should_act || '',
        whyItMatters: prompt5.why_it_matters || '',
        suggestedTimeframe: prompt5.suggested_timeframe || '',
        additionalSteps: Array.isArray(prompt5.additional_steps) ? prompt5.additional_steps : [],
        tenantContext: prompt5.tenant_context || '',
      },
      sentimentSeries: prompt1
        .slice(-20)
        .map((entry) => ({
          sourceDocId: entry.source_doc_id || null,
          sentimentScore: Number(entry.sentiment_score),
          sentimentLabel: entry.sentiment_label || null,
          frustrationSignal: Boolean(entry.frustration_signal),
          issueCategory: entry.issue_category || null,
          createdAt: entry.created_at || null,
          text: entry.text || '',
        }))
        .filter((entry) => Number.isFinite(entry.sentimentScore)),
      raw: doc,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/ai/updates/latest', async (_req, res, next) => {
  try {
    const payload = await getLatestAiTrendUpdate()
    if (!payload) {
      res.status(404).json({ message: 'No AI updates generated yet' })
      return
    }
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.post('/ai/updates/generate', async (_req, res, next) => {
  try {
    const payload = await generateAiTrendUpdate()
    res.status(201).json(payload)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Missing AZURE_OPENAI_')) {
        res.status(400).json({ message: error.message })
        return
      }

      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number(error.status)
        : null
      if (status && Number.isInteger(status) && status >= 400) {
        res.status(status).json({ message: error.message })
        return
      }
    }
    next(error)
  }
})

export default router
