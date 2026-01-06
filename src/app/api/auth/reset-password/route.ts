// Password Reset API
// POST /api/auth/reset-password - Reset user password with admin verification

import { NextRequest, NextResponse } from 'next/server'
import { resetUserPassword, findUserByEmployeeId } from '@/server/db/user'

const ADMIN_SUPER_PASSWORD = process.env.ADMIN_SUPER_PASSWORD

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { employeeId, adminPassword, newPassword } = body

        // Validate required fields
        if (!employeeId || !adminPassword || !newPassword) {
            return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 })
        }

        // Validate server configuration
        if (!ADMIN_SUPER_PASSWORD) {
            console.error('SERVER CONFIG ERROR: ADMIN_SUPER_PASSWORD not set in env')
            return NextResponse.json({ error: '服务器配置错误：未设置超级管理员密码' }, { status: 500 })
        }

        // Verify admin password
        if (adminPassword !== ADMIN_SUPER_PASSWORD) {
            return NextResponse.json({ error: '管理员密码错误' }, { status: 401 })
        }

        // Validate new password format
        if (!/^\d{6}$/.test(newPassword)) {
            return NextResponse.json({ error: '新密码必须是6位数字' }, { status: 400 })
        }

        // Check if user exists
        const user = await findUserByEmployeeId(employeeId)
        if (!user) {
            return NextResponse.json({ error: '该工号不存在' }, { status: 404 })
        }

        // Reset password to new password
        await resetUserPassword(employeeId, newPassword)

        return NextResponse.json({
            success: true,
            message: `密码重置成功，请使用新密码登录`,
        })
    } catch (error) {
        console.error('Error resetting password:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '重置密码失败' },
            { status: 500 }
        )
    }
}
