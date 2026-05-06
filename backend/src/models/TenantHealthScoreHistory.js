import mongoose from 'mongoose'

const TenantHealthScoreHistorySchema = new mongoose.Schema(
  {
    _id: { type: String },
    doc_type: { type: String, index: true },
    tenant_id: { type: String, index: true },
  },
  {
    collection: 'tenant_health_score_history',
    strict: false,
    timestamps: false,
  },
)

export const TenantHealthScoreHistory = mongoose.model(
  'TenantHealthScoreHistory',
  TenantHealthScoreHistorySchema,
)
