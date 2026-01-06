// Shelf CRUD API
// POST /api/shelves - Add a shelf to a rack
// DELETE /api/shelves - Delete an empty shelf

import { NextRequest, NextResponse } from 'next/server'
import { addShelfToRack, deleteShelf } from '@/server/db/facility'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { rackId } = body

        if (!rackId) {
            return NextResponse.json(
                { error: '缺少必填字段: rackId' },
                { status: 400 }
            )
        }

        const shelf = await addShelfToRack(rackId)

        return NextResponse.json({
            success: true,
            shelf,
            message: '层架添加成功',
        })
    } catch (error) {
        console.error('Error creating shelf:', error)
        return NextResponse.json(
            { error: '添加层架失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: '缺少层架 ID' }, { status: 400 })
        }

        await deleteShelf(id)
        return NextResponse.json({ success: true, message: '层架删除成功' })
    } catch (error) {
        console.error('Error deleting shelf:', error)
        return NextResponse.json(
            { error: '删除层架失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, name } = body

        if (!id) {
            return NextResponse.json({ error: '缺少层架 ID' }, { status: 400 })
        }

        const { updateShelf } = await import('@/server/db/facility')
        await updateShelf(id, { name })

        return NextResponse.json({ success: true, message: '层架更新成功' })
    } catch (error) {
        console.error('Error updating shelf:', error)
        return NextResponse.json(
            { error: '更新层架失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
