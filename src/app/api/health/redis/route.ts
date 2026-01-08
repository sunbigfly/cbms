// Redis 健康检查 API
import { NextResponse } from 'next/server'
import redis from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
    const result = {
        timestamp: new Date().toISOString(),
        redis: {
            configured: false,
            type: 'none',
            connected: false,
            testKey: null as string | null,
            error: null as string | null,
        }
    }

    if (!redis) {
        result.redis.error = 'Redis not configured'
        return NextResponse.json(result)
    }

    result.redis.configured = true
    result.redis.type = redis.isUpstash ? 'upstash' : 'ioredis'

    try {
        // 写入测试值
        const testKey = 'cbms:health:check'
        const testValue = `health-${Date.now()}`
        await redis.set(testKey, testValue, { ex: 60 })

        // 读取测试值
        const readValue = await redis.get(testKey)
        result.redis.testKey = readValue as string | null
        result.redis.connected = readValue === testValue

        // 清理
        await redis.del(testKey)
    } catch (error) {
        result.redis.error = error instanceof Error ? error.message : String(error)
    }

    return NextResponse.json(result)
}
