interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetMs: number
}

// In-memory store of timestamps per key
const rateLimitMap = new Map<string, number[]>()

// Periodic garbage collection every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => now - t < windowMs)
    if (valid.length === 0) {
      rateLimitMap.delete(key)
    } else {
      rateLimitMap.set(key, valid)
    }
  }
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  cleanup(windowMs)

  const timestamps = rateLimitMap.get(key) || []
  const validTimestamps = timestamps.filter(t => now - t < windowMs)

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0]
    const resetMs = windowMs - (now - oldestTimestamp)
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs: Math.max(0, resetMs),
    }
  }

  validTimestamps.push(now)
  rateLimitMap.set(key, validTimestamps)

  return {
    success: true,
    limit,
    remaining: limit - validTimestamps.length,
    resetMs: windowMs,
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}
