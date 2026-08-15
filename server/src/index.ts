import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import categoriesRouter from './routes/categories.js'
import productsRouter from './routes/products.js'
import { errorHandler, notFound } from './lib/errors.js'

const app = express()

app.set('trust proxy', 1)

const allowedOrigin = process.env.CLIENT_ORIGIN?.split(',').map((o) => o.trim()) ?? ['http://localhost:5173']
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))

const apiLimiter = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true })
app.use('/api', apiLimiter)

// GET /health — healthcheck для мониторинга
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

const apiRouter = express.Router()
apiRouter.use('/categories', categoriesRouter)
apiRouter.use('/products', productsRouter)

app.use('/api/v1', apiRouter)

app.use(notFound)
app.use(errorHandler)

const PORT = Number(process.env.PORT ?? 4000)

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
  })
}

export default app