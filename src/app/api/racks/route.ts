// Rack CRUD API
// POST /api/racks - Add a rack to a facility
// DELETE /api/racks - Delete an empty rack

import { NextRequest, NextResponse } from 'next/server'
import { addRackToFacility, deleteRack, canDeleteRack } from '@/server/db/facility'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { facilityId, name, shelvesPerRack, boxRows, boxCols, gridType } = body

        if (!facilityId || !shelvesPerRack || !boxRows || !boxCols) {
            return NextResponse.json(
                { error: '缺少必填字段' },
                { status: 400 }
            )
        }

        const rack = await addRackToFacility(facilityId, {
            name: name || '',
            shelvesPerRack,
            boxRows,
            boxCols,
            gridType,
        })

        return NextResponse.json({
            success: true,
            rack,
            message: '架子添加成功',
        })
    } catch (error) {
        console.error('Error creating rack:', error)
        return NextResponse.json(
            { error: '添加架子失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: '缺少架子 ID' }, { status: 400 })
        }

        const check = await canDeleteRack(id)
        if (!check.canDelete) {
            return NextResponse.json({
                error: check.reason,
                canDelete: false,
                sampleCount: check.sampleCount
            }, { status: 400 })
        }

        await deleteRack(id)
        return NextResponse.json({ success: true, message: '架子删除成功' })
    } catch (error) {
        console.error('Error deleting rack:', error)
        return NextResponse.json(
            { error: '删除架子失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}


export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, name } = body

        if (!id) {
            return NextResponse.json({ error: '缺少架子 ID' }, { status: 400 })
        }

        const { updateRack } = await import('@/server/db/facility')
        await updateRack(id, { name })

        return NextResponse.json({ success: true, message: '架子更新成功' })
    } catch (error) {
        console.error('Error updating rack:', error)
        return NextResponse.json(
            { error: '更新架子失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
