import express from 'express'
import cors from 'cors'
import { config } from './config/index.js'
import { connectMongo } from './db/index.js'
import authRoutes from './routes/auth.routes.js'
import dataRoutes from './routes/data.routes.js'
import aiRoutes from './routes/ai.routes.js'
import automationRoutes from './routes/automation.routes.js'
import userRoutes from './routes/user.routes.js'

const app = express()

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'mongodb', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/automations', automationRoutes)
app.use('/api', dataRoutes)


app.use((req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' })
})

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_SERVER_ERROR'
  console.error(`[${new Date().toISOString()}] ${statusCode} ${code}: ${err.message}`)
  res.status(statusCode).json({ error: err.message, code })
})

async function start() {
  await connectMongo()
  app.listen(config.port, () => {
    console.log(`Expense Tracker API listening on http://localhost:${config.port}`)
  })
}

start()

export default app
