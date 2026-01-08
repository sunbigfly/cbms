// Redis Client Configuration
// Supports both Upstash (Vercel Serverless) and traditional ioredis

import { Redis as UpstashRedis } from '@upstash/redis'
import IORedis from 'ioredis'

const globalForRedis = globalThis as unknown as {
    redis: UpstashRedis | IORedis | undefined
    redisInitialized: boolean | undefined
}

// Upstash Redis (Vercel Serverless - 推荐)
// 支持两种环境变量名：UPSTASH_REDIS_* (官方) 和 KV_REST_API_* (Vercel 集成)
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

// Traditional Redis (本地开发或自托管)
const redisUrl = process.env.REDIS_URL

type RedisClient = {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown, options?: { ex?: number }) => Promise<unknown>
    del: (key: string | string[]) => Promise<unknown>
    keys: (pattern: string) => Promise<string[]>
    expire: (key: string, seconds: number) => Promise<unknown>
    isUpstash: boolean
}

let redis: RedisClient | null = null

// 优先使用 Upstash (HTTP-based, 适合 Serverless)
if (upstashUrl && upstashToken) {
    const upstash = new UpstashRedis({
        url: upstashUrl,
        token: upstashToken,
    })

    redis = {
        get: (key) => upstash.get(key),
        set: (key, value, options) => options?.ex
            ? upstash.set(key, value, { ex: options.ex })
            : upstash.set(key, value),
        del: (key) => Array.isArray(key) ? upstash.del(...key) : upstash.del(key),
        keys: (pattern) => upstash.keys(pattern),
        expire: (key, seconds) => upstash.expire(key, seconds),
        isUpstash: true,
    }

    if (!globalForRedis.redisInitialized) {
        console.log('[Redis] Using Upstash Redis (Serverless)')
    }
}
// 回退到传统 ioredis
else if (redisUrl) {
    const ioredis = globalForRedis.redis as IORedis | undefined ?? new IORedis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000)
            return delay
        },
        lazyConnect: true,
    })

    redis = {
        get: (key) => ioredis.get(key),
        set: (key, value, options) => options?.ex
            ? ioredis.set(key, value as string, 'EX', options.ex)
            : ioredis.set(key, value as string),
        del: (key) => Array.isArray(key) ? ioredis.del(...key) : ioredis.del(key),
        keys: (pattern) => ioredis.keys(pattern),
        expire: (key, seconds) => ioredis.expire(key, seconds),
        isUpstash: false,
    }

    if (!globalForRedis.redisInitialized) {
        ioredis.on('error', (err) => {
            console.error('Redis connection error:', err.message)
        })
        ioredis.on('connect', () => {
            console.log('[Redis] Connected to ioredis')
        })
        if (process.env.NODE_ENV !== 'production') {
            globalForRedis.redis = ioredis
        }
    }
}
// 无 Redis 配置
else if (!globalForRedis.redisInitialized) {
    console.warn('[Redis] No Redis configured - running without cache')
    console.warn('[Redis] Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for Vercel')
    console.warn('[Redis] Or set REDIS_URL for traditional Redis')
}

globalForRedis.redisInitialized = true

export { redis }
export default redis
