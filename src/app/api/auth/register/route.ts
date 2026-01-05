// User Registration API
// POST /api/auth/register - Register a new user with employee ID

import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/server/db/user'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { employeeId, name, password } = body

        // Validate required fields
        if (!employeeId || !name || !password) {
            return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 })
        }

        // Validate password format (6 digits)
        if (!/^\d{6}$/.test(password)) {
            return NextResponse.json({ error: '密码必须是6位数字' }, { status: 400 })
        }

        const user = await registerUser({ employeeId, name, password })

        return NextResponse.json({
            success: true,
            message: '注册成功',
            user: {
                id: user.id,
                employeeId: user.employeeId,
                name: user.name,
            },
        })
    } catch (error) {
        console.error('Error registering user:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '注册失败' },
            { status: 500 }
        )
    }
}
