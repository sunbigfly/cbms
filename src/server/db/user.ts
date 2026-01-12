// Data Access Layer: User Operations
// Server-side functions for user management

import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

// ============================================
// User CRUD
// ============================================

export async function findUserByEmployeeId(employeeId: string) {
    return prisma.user.findUnique({
        where: { employeeId },
    })
}

export async function checkEmployeeIdExists(employeeId: string) {
    const user = await prisma.user.findUnique({
        where: { employeeId },
        select: { id: true, name: true, password: true },
    })
    // 如果用户不存在，或者用户已被重置（密码为空），返回 exists: false
    // 这样被重置的用户可以重新注册
    const hasValidAccount = !!user && !!user.password
    return { exists: hasValidAccount, userName: user?.name }
}

export async function registerUser(data: {
    employeeId: string
    name: string
    password: string
}) {
    const { employeeId, name, password } = data

    // Check if employeeId already exists
    const existing = await prisma.user.findUnique({
        where: { employeeId },
    })

    // Hash password
    const hashedPassword = await hash(password, 12)

    // 如果用户已存在但密码为空（被重置的用户），则更新用户信息
    if (existing && !existing.password) {
        return prisma.user.update({
            where: { employeeId },
            data: {
                name,
                password: hashedPassword,
            },
        })
    }

    // 如果用户已存在且有密码，则抛出错误
    if (existing) {
        throw new Error('该工号已被注册')
    }

    // Create user with employeeId as email (since email is required and unique)
    return prisma.user.create({
        data: {
            employeeId,
            name,
            email: `${employeeId}@cbms.local`,
            password: hashedPassword,
            role: 'TECHNICIAN',
        },
    })
}

export async function getUsers() {
    return prisma.user.findMany({
        select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    })
}

// 重置用户：清除用户名和密码，但保留工号关联
export async function resetUser(userId: string) {
    return prisma.user.update({
        where: { id: userId },
        data: {
            name: null,
            password: null,
        },
    })
}
