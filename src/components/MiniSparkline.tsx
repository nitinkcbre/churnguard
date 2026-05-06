import { Box, Tooltip as MuiTooltip, Typography } from '@mui/material'

type MiniSparklineProps = Readonly<{ values: number[] }>

export function MiniSparkline({ values }: MiniSparklineProps) {
  if (!values || values.length === 0) {
    return <Typography variant="caption" color="text.secondary">No data</Typography>
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const start = values.at(0) ?? 0
  const end = values.at(-1) ?? start
  const delta = end - start

  let direction = 'stable'
  if (delta > 2) {
    direction = 'improving'
  } else if (delta < -2) {
    direction = 'declining'
  }

  let barColor = '#ca8a04'
  if (direction === 'improving') barColor = '#16a34a'
  if (direction === 'declining') barColor = '#dc2626'

  const tooltipText = `10-day values: ${values.join(', ')} | Trend: ${direction}`

  return (
    <MuiTooltip title={tooltipText} arrow>
      <Box sx={{ display: 'inline-flex', alignItems: 'flex-end', gap: 0.4, height: 28, cursor: 'help' }}>
        {values.map((value, index) => {
          const normalized = ((value - min) / range) * 16 + 8
          return (
            <Box
              key={`${value}-${index}`}
              sx={{
                width: 3,
                height: `${normalized}px`,
                borderRadius: '2px',
                bgcolor: barColor,
                opacity: 0.45 + (index / values.length) * 0.5,
              }}
            />
          )
        })}
      </Box>
    </MuiTooltip>
  )
}
