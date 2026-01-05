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
        select: { id: true, name: true },
    })
    return { exists: !!user, userName: user?.name }
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
    if (existing) {
        throw new Error('该工号已被注册')
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

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

export async function resetUserPassword(employeeId: string, newPassword: string) {
    const hashedPassword = await hash(newPassword, 12)

    return prisma.user.update({
        where: { employeeId },
        data: { password: hashedPassword },
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
