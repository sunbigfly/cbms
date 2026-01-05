// Sample CRUD API
// POST /api/samples - Create a new sample (check-in) or batch check-in
// GET /api/samples - Search samples

import { NextRequest, NextResponse } from 'next/server'
import { checkInSample, searchSamples, batchCheckInSamples, getSamplesByIds } from '@/server/db/sample'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        // 支持通过 ids 查询多个样本
        const ids = searchParams.get('ids')
        if (ids) {
            const sampleIds = ids.split(',').filter(id => id.trim())
            if (sampleIds.length === 0) {
                return NextResponse.json([])
            }
            const samples = await getSamplesByIds(sampleIds)
            return NextResponse.json(samples)
        }

        // 普通搜索
        const query = searchParams.get('q') || ''
        const limit = parseInt(searchParams.get('limit') || '50')

        const samples = await searchSamples(query, limit)
        return NextResponse.json(samples)
    } catch (error) {
        console.error('Error searching samples:', error)
        return NextResponse.json(
            { error: '搜索样本失败' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        // 获取当前登录用户的 ID
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '未登录' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { slotId, slotIds, ...sampleData } = body

        // Validate required fields
        if (!slotId && (!slotIds || slotIds.length === 0)) {
            return NextResponse.json(
                { error: '请选择存储位置' },
                { status: 400 }
            )
        }

        if (!sampleData.name || !sampleData.type) {
            return NextResponse.json(
                { error: '请填写样本名称和类型' },
                { status: 400 }
            )
        }

        // 使用实际的 user ID（而非用户名）
        const userId = session.user.id

        // Batch check-in if slotIds array provided
        if (slotIds && slotIds.length > 0) {
            const samples = await batchCheckInSamples(sampleData, slotIds, userId)
            return NextResponse.json({
                success: true,
                samples,
                count: samples.length,
                message: `成功入库 ${samples.length} 个样本`,
            })
        }

        // Single check-in
        const sample = await checkInSample(sampleData, slotId, userId)

        return NextResponse.json({
            success: true,
            sample,
            message: `样本 "${sampleData.name}" 入库成功`,
        })
    } catch (error) {
        console.error('Error creating sample:', error)
        return NextResponse.json(
            { error: '入库失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
