import mongoose from 'mongoose'

const EmailInteractionSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    tenantName: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    sentiment: { type: String, enum: ['Positive', 'Neutral', 'Negative'], required: true },
    urgency: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    timestamp: { type: Date, required: true },
  },
  { timestamps: true },
)

export const EmailInteraction = mongoose.model('EmailInteraction', EmailInteractionSchema)
