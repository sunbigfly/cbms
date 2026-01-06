// Batch Check-out API
// POST /api/samples/checkout - Check out multiple samples

import { NextRequest, NextResponse } from 'next/server'
import { batchCheckOutSamples } from '@/server/db/sample'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '未登录' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { sampleIds, reason, notes } = body
        const userId = session.user.id

        if (!sampleIds || sampleIds.length === 0) {
            return NextResponse.json(
                { error: '请选择要出库的样本' },
                { status: 400 }
            )
        }

        if (!reason) {
            return NextResponse.json(
                { error: '请选择出库原因' },
                { status: 400 }
            )
        }

        const results = await batchCheckOutSamples(sampleIds, reason, userId, notes)

        return NextResponse.json({
            success: true,
            results,
            count: results.length,
            message: `成功出库 ${results.length} 个样本`,
        })
    } catch (error) {
        console.error('Error checking out samples:', error)
        return NextResponse.json(
            { error: '出库失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
