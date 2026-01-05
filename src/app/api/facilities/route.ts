// Facility CRUD API
// POST /api/facilities - Create a new facility
// GET /api/facilities - Get all facilities

import { NextRequest, NextResponse } from 'next/server'
import { createFacility, getFacilities } from '@/server/db/facility'

export async function GET() {
    try {
        const facilities = await getFacilities()
        return NextResponse.json(facilities)
    } catch (error) {
        console.error('Error fetching facilities:', error)
        return NextResponse.json(
            { error: '获取设施列表失败' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Support both form field names (rackCount) and API field names (totalRacks)
        const name = body.name
        const type = body.type
        const description = body.description
        const totalRacks = body.totalRacks ?? body.rackCount
        const shelvesPerRack = body.shelvesPerRack
        const boxRows = body.boxRows
        const boxCols = body.boxCols

        // Validate required fields
        if (!name || !type || !totalRacks || !shelvesPerRack || !boxRows || !boxCols) {
            return NextResponse.json(
                { error: '缺少必填字段', received: { name, type, totalRacks, shelvesPerRack, boxRows, boxCols } },
                { status: 400 }
            )
        }

        const facility = await createFacility({
            name,
            type,
            description,
            totalRacks,
            shelvesPerRack,
            defaultBoxRows: boxRows,
            defaultBoxColumns: boxCols,
            gridType: 'ALPHANUMERIC',
        })

        return NextResponse.json({
            success: true,
            facility,
            message: `设施 "${name}" 创建成功`,
        })
    } catch (error) {
        console.error('Error creating facility:', error)
        return NextResponse.json(
            { error: '创建设施失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
