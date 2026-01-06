// Box CRUD API
// POST /api/boxes - Add a box to a shelf
// DELETE /api/boxes - Delete an empty box

import { NextRequest, NextResponse } from 'next/server'
import { addBoxToShelf, deleteBox, canDeleteBox } from '@/server/db/facility'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { shelfId, name, rows, columns, gridType } = body

        if (!shelfId || !rows || !columns) {
            return NextResponse.json(
                { error: '缺少必填字段' },
                { status: 400 }
            )
        }

        const box = await addBoxToShelf(shelfId, {
            name,
            rows,
            columns,
            gridType,
        })

        return NextResponse.json({
            success: true,
            box,
            message: '盒子添加成功',
        })
    } catch (error) {
        console.error('Error creating box:', error)
        return NextResponse.json(
            { error: '添加盒子失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: '缺少盒子 ID' }, { status: 400 })
        }

        const check = await canDeleteBox(id)
        if (!check.canDelete) {
            return NextResponse.json({
                error: check.reason,
                canDelete: false,
                sampleCount: check.sampleCount
            }, { status: 400 })
        }

        await deleteBox(id)
        return NextResponse.json({ success: true, message: '盒子删除成功' })
    } catch (error) {
        console.error('Error deleting box:', error)
        return NextResponse.json(
            { error: '删除盒子失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, name, rows, columns } = body

        if (!id) {
            return NextResponse.json({ error: '缺少盒子 ID' }, { status: 400 })
        }

        const { updateBox } = await import('@/server/db/facility')
        await updateBox(id, { name, rows, columns })

        return NextResponse.json({ success: true, message: '盒子更新成功' })
    } catch (error) {
        console.error('Error updating box:', error)
        return NextResponse.json(
            { error: '更新盒子失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
