import mongoose from 'mongoose'

const LeaseSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, unique: true },
    tenantName: { type: String, required: true },
    tier: { type: String, enum: ['Standard', 'Premium'], required: true },
    propertyId: { type: String, required: true },
    leaseStartDate: { type: Date, required: true },
    leaseRenewalDate: { type: Date, required: true },
    leaseCriticality: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    accountOwner: { type: String, required: true },
  },
  { timestamps: true },
)

export const Lease = mongoose.model('Lease', LeaseSchema)
