// Facility CRUD API
// POST /api/facilities - Create a new facility
// GET /api/facilities - Get all facilities (supports ?private=true for private libraries)
// PUT /api/facilities - Update a facility
// DELETE /api/facilities - Delete a facility

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createFacility, getFacilities, updateFacility, deleteFacility, canDeleteFacility, canAccessFacility } from '@/server/db/facility'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const privateMode = searchParams.get('private') === 'true'

        const facilities = await getFacilities({
            privateMode,
            userId: session.user.id,
            isAdmin: session.user.role === 'ADMIN'
        })
        return NextResponse.json(facilities)
    } catch (error) {
        console.error('Error fetching facilities:', error)
        return NextResponse.json(
            { error: '获取细胞库列表失败' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const body = await request.json()

        // Support both form field names (rackCount) and API field names (totalRacks)
        const name = body.name
        const type = body.type
        const description = body.description
        const totalRacks = body.totalRacks ?? body.rackCount
        const shelvesPerRack = body.shelvesPerRack
        const boxRows = body.boxRows
        const boxCols = body.boxCols
        const isPrivate = body.isPrivate === true

        // Validate required fields
        if (!name || !type || !totalRacks || !shelvesPerRack || !boxRows || !boxCols) {
            return NextResponse.json(
                { error: '缺少必填字段', received: { name, type, totalRacks, shelvesPerRack, boxRows, boxCols } },
                { status: 400 }
            )
        }

        // 创建私有库时设置所有者
        const facility = await createFacility({
            name,
            type,
            description,
            totalRacks,
            shelvesPerRack,
            defaultBoxRows: boxRows,
            defaultBoxColumns: boxCols,
            gridType: 'ALPHANUMERIC',
            ownerId: isPrivate ? session.user.id : undefined,
            isPrivate,
        })

        return NextResponse.json({
            success: true,
            facility,
            message: `${isPrivate ? '私有' : ''}细胞库 "${name}" 创建成功`,
        })
    } catch (error) {
        console.error('Error creating facility:', error)
        return NextResponse.json(
            { error: '创建细胞库失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const body = await request.json()
        const { id, name, type, description } = body

        if (!id) {
            return NextResponse.json({ error: '缺少细胞库 ID' }, { status: 400 })
        }

        // 检查权限
        const hasAccess = await canAccessFacility(id, session.user.id, session.user.role === 'ADMIN')
        if (!hasAccess) {
            return NextResponse.json({ error: '无权访问该细胞库' }, { status: 403 })
        }

        const facility = await updateFacility(id, { name, type, description })
        return NextResponse.json({ success: true, facility, message: '细胞库更新成功' })
    } catch (error) {
        console.error('Error updating facility:', error)
        return NextResponse.json(
            { error: '更新细胞库失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: '缺少细胞库 ID' }, { status: 400 })
        }

        // 检查权限
        const hasAccess = await canAccessFacility(id, session.user.id, session.user.role === 'ADMIN')
        if (!hasAccess) {
            return NextResponse.json({ error: '无权删除该细胞库' }, { status: 403 })
        }

        // Check if can delete
        const check = await canDeleteFacility(id)
        if (!check.canDelete) {
            return NextResponse.json({
                error: check.reason,
                canDelete: false,
                sampleCount: check.sampleCount
            }, { status: 400 })
        }

        await deleteFacility(id)
        return NextResponse.json({ success: true, message: '细胞库删除成功' })
    } catch (error) {
        console.error('Error deleting facility:', error)
        return NextResponse.json(
            { error: '删除细胞库失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
