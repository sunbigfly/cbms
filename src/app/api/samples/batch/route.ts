// Batch Update API
// PATCH /api/samples/batch - Update multiple samples with same data

import { NextRequest, NextResponse } from 'next/server'
import { batchUpdateSamples, findBatchGroup } from '@/server/db/sample'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
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
        const { sampleIds, updates } = body

        if (!sampleIds || sampleIds.length === 0) {
            return NextResponse.json(
                { error: '请选择要编辑的样本' },
                { status: 400 }
            )
        }

        if (!updates || Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: '请提供要更新的字段' },
                { status: 400 }
            )
        }

        // 使用实际的 user ID（而非用户名）
        const results = await batchUpdateSamples(sampleIds, updates, session.user.id)

        return NextResponse.json({
            success: true,
            samples: results,
            count: results.length,
            message: `成功更新 ${results.length} 个样本`,
        })
    } catch (error) {
        console.error('Error updating samples:', error)
        return NextResponse.json(
            { error: '更新失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

// GET /api/samples/batch?sampleId=xxx - Find batch group for a sample
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const sampleId = searchParams.get('sampleId')

        if (!sampleId) {
            return NextResponse.json(
                { error: '请提供样本ID' },
                { status: 400 }
            )
        }

        const batchGroup = await findBatchGroup(sampleId)

        return NextResponse.json({
            sampleId,
            batchGroup,
            count: batchGroup.length,
        })
    } catch (error) {
        console.error('Error finding batch group:', error)
        return NextResponse.json(
            { error: '查询失败' },
            { status: 500 }
        )
    }
}
