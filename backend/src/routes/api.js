import { Router } from 'express'
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
