import { Chip } from '@mui/material'
import { TenantStatus } from '../types'
import { getStatusColor, getStatusFromScore } from '../utils'

type StatusChipProps = Readonly<{
  score: number
  status?: TenantStatus
}>

export function StatusChip({ score, status: mappedStatus }: StatusChipProps) {
  const status = mappedStatus ?? getStatusFromScore(score)

  return (
    <Chip
      label={status}
      sx={{
        bgcolor: getStatusColor(status),
        color: '#fff',
        fontWeight: 700,
        minWidth: 84,
      }}
      size="small"
    />
  )
}
