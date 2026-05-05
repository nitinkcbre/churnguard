import { EmailInteraction } from '../models/EmailInteraction.js'
import { Incident } from '../models/Incident.js'
import { Lease } from '../models/Lease.js'
import { emailSeed, incidentSeed, leaseSeed } from '../data/mockSeed.js'

export async function seedIfEmpty() {
  const [emailCount, incidentCount, leaseCount] = await Promise.all([
    EmailInteraction.countDocuments(),
    Incident.countDocuments(),
    Lease.countDocuments(),
  ])

  const tasks = []

  if (emailCount === 0) {
    tasks.push(EmailInteraction.insertMany(emailSeed))
  }
  if (incidentCount === 0) {
    tasks.push(Incident.insertMany(incidentSeed))
  }
  if (leaseCount === 0) {
    tasks.push(Lease.insertMany(leaseSeed))
  }

  if (tasks.length > 0) {
    await Promise.all(tasks)
  }
}
