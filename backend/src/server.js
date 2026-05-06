import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import apiRouter from './routes/api.js'
import { seedIfEmpty } from './services/seedService.js'

dotenv.config({ path: './backend/.env' })
dotenv.config({ path: './.env' })

const PORT = Number(process.env.PORT || 4000)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/churnguard'
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

const app = express()
app.use(cors({ origin: FRONTEND_ORIGIN }))
app.use(express.json())

app.use('/api', apiRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

try {
  await mongoose.connect(MONGODB_URI)
  if (String(process.env.ENABLE_MOCK_SEED || '').toLowerCase() === 'true') {
    await seedIfEmpty()
  }

  if (!process.env.AZURE_OPENAI_API_KEY) {
    console.warn('AZURE_OPENAI_API_KEY is not set. POST /api/ai/updates/generate will return 400 until configured.')
  }

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`)
  })
} catch (error) {
  console.error('Failed to start backend', error)
  process.exit(1)
}
