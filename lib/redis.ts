import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Search: 5 requests per minute
export const searchRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
})

// Content fetching: 10 requests per minute
export const fetchContentRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

// Report generation: 2 requests per minute
export const reportContentRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, '1 m'),
})
