import mongoose from 'mongoose'

const AiTenantUpdateSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    tenantName: { type: String, required: true },
    trend: { type: String, enum: ['Improving', 'Stable', 'Declining'], required: true },
    sentiment: { type: String, enum: ['Positive', 'Neutral', 'Negative'], required: true },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    incidentPriority: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    incidentSummary: { type: String, required: true },
    latestAiUpdate: { type: String, required: true },
    recommendedAction: { type: String, required: true },
  },
  { _id: false },
)

const AiTrendUpdateSchema = new mongoose.Schema(
  {
    generatedAt: { type: Date, default: Date.now, index: true },
    modelUsed: { type: String, required: true },
    overallSummary: { type: String, required: true },
    tenantUpdates: { type: [AiTenantUpdateSchema], default: [] },
    rawResponse: { type: String, required: true },
  },
  { timestamps: true },
)

export const AiTrendUpdate = mongoose.model('AiTrendUpdate', AiTrendUpdateSchema)
