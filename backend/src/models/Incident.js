import mongoose from 'mongoose'

const IncidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    openedAt: { type: Date, required: true },
    closedAt: { type: Date },
  },
  { timestamps: true },
)

export const Incident = mongoose.model('Incident', IncidentSchema)
