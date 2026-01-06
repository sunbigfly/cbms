import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cacheGetOrSet, invalidatePresetsCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

// GET /api/presets - 获取预设列表
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    try {
        const cacheKey = `${CACHE_KEYS.PRESETS}${category || 'all'}`

        const presets = await cacheGetOrSet(
            cacheKey,
            async () => {
                const where = category ? { category } : {}
                return prisma.systemPreset.findMany({
                    where,
                    orderBy: [{ category: 'asc' }, { order: 'asc' }, { value: 'asc' }],
                })
            },
            CACHE_TTL.PRESETS
        )

        return NextResponse.json(presets)
    } catch (error) {
        console.error('Failed to fetch presets:', error)
        return NextResponse.json({ error: '获取预设失败' }, { status: 500 })
    }
}

// POST /api/presets - 创建新预设
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    try {
        const body = await request.json()
        const { category, value, order = 0 } = body

        if (!category || !value) {
            return NextResponse.json({ error: '分类和值为必填项' }, { status: 400 })
        }

        const preset = await prisma.systemPreset.create({
            data: { category, value, order },
        })

        // 失效预设缓存
        await invalidatePresetsCache()

        return NextResponse.json(preset)
    } catch (error: unknown) {
        console.error('Failed to create preset:', error)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json({ error: '该预设值已存在' }, { status: 400 })
        }
        return NextResponse.json({ error: '创建预设失败' }, { status: 500 })
    }
}

// PUT /api/presets - 更新预设
export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    try {
        const body = await request.json()
        const { id, value, order } = body

        if (!id) {
            return NextResponse.json({ error: 'ID 为必填项' }, { status: 400 })
        }

        const updateData: { value?: string; order?: number } = {}
        if (value !== undefined) updateData.value = value
        if (order !== undefined) updateData.order = order

        const preset = await prisma.systemPreset.update({
            where: { id },
            data: updateData,
        })

        // 失效预设缓存
        await invalidatePresetsCache()

        return NextResponse.json(preset)
    } catch (error) {
        console.error('Failed to update preset:', error)
        return NextResponse.json({ error: '更新预设失败' }, { status: 500 })
    }
}

// DELETE /api/presets - 删除预设
export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'ID 为必填项' }, { status: 400 })
    }

    try {
        await prisma.systemPreset.delete({ where: { id } })

        // 失效预设缓存
        await invalidatePresetsCache()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete preset:', error)
        return NextResponse.json({ error: '删除预设失败' }, { status: 500 })
    }
}
