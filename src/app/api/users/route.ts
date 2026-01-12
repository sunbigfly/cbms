import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resetUser } from '@/server/db/user'

// GET /api/users - 获取所有用户
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: '无权限' }, { status: 403 })
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                employeeId: true,
                name: true,
                email: true,
                role: true,
                isBlocked: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error('Failed to fetch users:', error)
        return NextResponse.json({ error: '获取用户失败' }, { status: 500 })
    }
}

// DELETE /api/users?id=xxx - 删除用户
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: '无权限' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
        }

        // 不能删除自己
        if (id === session.user.id) {
            return NextResponse.json({ error: '不能删除自己' }, { status: 400 })
        }

        await prisma.user.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete user:', error)
        return NextResponse.json({ error: '删除用户失败' }, { status: 500 })
    }
}

// PATCH /api/users - 封禁/解封用户
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: '无权限' }, { status: 403 })
        }

        const body = await request.json()
        const { id, isBlocked } = body

        if (!id || typeof isBlocked !== 'boolean') {
            return NextResponse.json({ error: '参数错误' }, { status: 400 })
        }

        // 不能封禁自己
        if (id === session.user.id) {
            return NextResponse.json({ error: '不能封禁自己' }, { status: 400 })
        }

        const user = await prisma.user.update({
            where: { id },
            data: { isBlocked },
            select: {
                id: true,
                employeeId: true,
                name: true,
                isBlocked: true,
            },
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error('Failed to update user:', error)
        return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
    }
}

// PUT /api/users - 重置用户（清除用户名和密码，保留工号关联）
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: '无权限' }, { status: 403 })
        }

        const body = await request.json()
        const { id, action } = body

        if (!id || action !== 'reset') {
            return NextResponse.json({ error: '参数错误' }, { status: 400 })
        }

        // 不能重置自己
        if (id === session.user.id) {
            return NextResponse.json({ error: '不能重置自己的账户' }, { status: 400 })
        }

        // 检查用户是否是管理员
        const targetUser = await prisma.user.findUnique({ where: { id } })
        if (targetUser?.role === 'ADMIN') {
            return NextResponse.json({ error: '不能重置管理员账户' }, { status: 400 })
        }

        await resetUser(id)

        return NextResponse.json({ success: true, message: '用户已重置，该工号可以重新注册' })
    } catch (error) {
        console.error('Failed to reset user:', error)
        return NextResponse.json({ error: '重置用户失败' }, { status: 500 })
    }
}
