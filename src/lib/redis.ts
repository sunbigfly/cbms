// Redis Client Configuration
// Singleton pattern to prevent multiple connections in development

import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined
}

const redisUrl = process.env.REDIS_URL

// Redis is optional - warn if not configured
if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not configured - running without cache')
}

// Only create Redis client if URL is configured
export const redis = redisUrl
    ? (globalForRedis.redis ?? new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000)
            return delay
        },
        lazyConnect: true, // 延迟连接，只在首次使用时连接
    }))
    : null

// 连接错误处理
if (redis) {
    redis.on('error', (err) => {
        console.error('Redis connection error:', err.message)
    })

    redis.on('connect', () => {
        console.log('Redis connected successfully')
    })

    if (process.env.NODE_ENV !== 'production') {
        globalForRedis.redis = redis
    }
}

export default redis

