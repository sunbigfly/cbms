// Password Reset API
// POST /api/auth/reset-password - Reset user password with admin verification

import { NextRequest, NextResponse } from 'next/server'
import { resetUserPassword, findUserByEmployeeId } from '@/server/db/user'

const ADMIN_SUPER_PASSWORD = 'ssyf2026'
const DEFAULT_RESET_PASSWORD = '123456'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { employeeId, adminPassword } = body

        // Validate required fields
        if (!employeeId || !adminPassword) {
            return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 })
        }

        // Verify admin password
        if (adminPassword !== ADMIN_SUPER_PASSWORD) {
            return NextResponse.json({ error: '管理员密码错误' }, { status: 401 })
        }

        // Check if user exists
        const user = await findUserByEmployeeId(employeeId)
        if (!user) {
            return NextResponse.json({ error: '该工号不存在' }, { status: 404 })
        }

        // Reset password to default
        await resetUserPassword(employeeId, DEFAULT_RESET_PASSWORD)

        return NextResponse.json({
            success: true,
            message: `密码已重置为 ${DEFAULT_RESET_PASSWORD}，请尽快修改密码`,
        })
    } catch (error) {
        console.error('Error resetting password:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '重置密码失败' },
            { status: 500 }
        )
    }
}
