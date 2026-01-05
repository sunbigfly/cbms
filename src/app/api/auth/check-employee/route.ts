// Check Employee ID API
// POST /api/auth/check-employee - Check if employee ID is registered

import { NextRequest, NextResponse } from 'next/server'
import { checkEmployeeIdExists } from '@/server/db/user'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { employeeId } = body

        if (!employeeId) {
            return NextResponse.json({ error: '请输入工号' }, { status: 400 })
        }

        const result = await checkEmployeeIdExists(employeeId)
        return NextResponse.json(result)
    } catch (error) {
        console.error('Error checking employee ID:', error)
        return NextResponse.json(
            { error: '检查工号失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
