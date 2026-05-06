import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'

type LoginPageProps = Readonly<{
  onLogin: () => void
}>

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at 20% 20%, rgba(15,118,110,0.18), transparent 48%), radial-gradient(circle at 80% 0%, rgba(217,119,6,0.17), transparent 38%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 430, p: 1 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Churn Guard AI
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }} color="text.secondary">
            Agentic Tenant Churn and Experience Risk Guard
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Work email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              size="large"
              onClick={onLogin}
              disabled={!email || !password}
            >
              Enter Dashboard
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
