// Cache Utility Module
// Provides caching abstraction with Redis backend

import redis from './redis'

// ============================================
// Cache Key Prefixes
// ============================================

export const CACHE_KEYS = {
    STATS_DASHBOARD: 'cbms:stats:dashboard',
    INVENTORY_FACILITIES: 'cbms:inventory:facilities',
    FACILITY_STATS: 'cbms:facility:stats:',
    BOX_STATS: 'cbms:box:stats:',
    PRESETS: 'cbms:presets:',
    SEARCH: 'cbms:search:',
} as const

// ============================================
// TTL Configuration (seconds)
// ============================================

export const CACHE_TTL = {
    STATS: 300,         // 5 分钟
    INVENTORY: 600,     // 10 分钟
    FACILITY: 600,      // 10 分钟
    PRESETS: 3600,      // 1 小时
    SEARCH: 60,         // 1 分钟
} as const

// ============================================
// Cache Operations
// ============================================

/**
 * 获取缓存值
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const data = await redis.get(key)
        if (!data) return null
        return JSON.parse(data) as T
    } catch (error) {
        console.error(`Cache get error for key ${key}:`, error)
        return null
    }
}

/**
 * 设置缓存值
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
        console.error(`Cache set error for key ${key}:`, error)
    }
}

/**
 * 删除缓存
 */
export async function cacheDel(key: string): Promise<void> {
    try {
        await redis.del(key)
    } catch (error) {
        console.error(`Cache delete error for key ${key}:`, error)
    }
}

/**
 * 按模式删除缓存 (使用 SCAN 避免阻塞)
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
    try {
        let cursor = '0'
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
            cursor = nextCursor
            if (keys.length > 0) {
                await redis.del(...keys)
            }
        } while (cursor !== '0')
    } catch (error) {
        console.error(`Cache invalidate pattern error for ${pattern}:`, error)
    }
}

/**
 * 获取或设置缓存 (缓存穿透保护)
 * 如果缓存不存在，执行 fn 获取数据并缓存
 */
export async function cacheGetOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number
): Promise<T> {
    // 先尝试从缓存获取
    const cached = await cacheGet<T>(key)
    if (cached !== null) {
        return cached
    }

    // 缓存未命中，执行查询
    const data = await fn()

    // 写入缓存
    await cacheSet(key, data, ttlSeconds)

    return data
}

/**
 * 失效统计相关的所有缓存
 */
export async function invalidateStatsCache(): Promise<void> {
    await cacheDel(CACHE_KEYS.STATS_DASHBOARD)
}

/**
 * 失效库存相关的所有缓存
 */
export async function invalidateInventoryCache(): Promise<void> {
    await cacheInvalidatePattern('cbms:inventory:*')
    await cacheInvalidatePattern('cbms:facility:*')
    await cacheInvalidatePattern('cbms:box:*')
}

/**
 * 失效预设缓存
 */
export async function invalidatePresetsCache(): Promise<void> {
    await cacheInvalidatePattern('cbms:presets:*')
}

/**
 * 失效所有样本相关缓存 (入库/出库/移动时调用)
 */
export async function invalidateSampleRelatedCache(): Promise<void> {
    await invalidateStatsCache()
    await invalidateInventoryCache()
}

/**
 * 生成搜索缓存键
 */
export function getSearchCacheKey(query: string): string {
    // 简单的字符串哈希
    const hash = query.toLowerCase().replace(/\s+/g, '_')
    return `${CACHE_KEYS.SEARCH}${hash}`
}
