export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_SERVER_ERROR'

  console.error(`[${new Date().toISOString()}] ${statusCode} ${code}: ${err.message}`, {
    url: req.url,
    method: req.method,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  })

  if (statusCode === 500) {
    return res.status(500).json({ error: 'Internal server error', code })
  }

  res.status(statusCode).json({ error: err.message, code })
}
