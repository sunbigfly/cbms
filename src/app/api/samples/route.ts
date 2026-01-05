// Sample CRUD API
// POST /api/samples - Create a new sample (check-in)
// GET /api/samples - Search samples

import { NextRequest, NextResponse } from 'next/server'
import { checkInSample, searchSamples } from '@/server/db/sample'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
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
        const body = await request.json()

        const { slotId, userId = 'system', ...sampleData } = body

        // Validate required fields
        if (!slotId) {
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
