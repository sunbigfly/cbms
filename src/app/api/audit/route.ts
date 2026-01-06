// Audit Logs API
// GET /api/audit - Get audit logs with optional filters

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const action = searchParams.get('action') || ''
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        const where: {
            OR?: Array<{ description?: { contains: string; mode: 'insensitive' }; sample?: { name?: { contains: string; mode: 'insensitive' } }; user?: { name?: { contains: string; mode: 'insensitive' } } }>
            action?: string
        } = {}

        if (search) {
            where.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { sample: { name: { contains: search, mode: 'insensitive' } } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
            ]
        }

        if (action) {
            where.action = action
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: { select: { name: true } },
                    sample: { select: { name: true } },
                },
                orderBy: { timestamp: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.auditLog.count({ where }),
        ])

        return NextResponse.json({
            logs: logs.map(log => {
                // 当样本已被删除时（如出库操作），从 previousData 中获取样本名称
                let sampleName = log.sample?.name
                if (!sampleName && log.previousData) {
                    const prevData = log.previousData as Record<string, unknown>
                    if (prevData.name && typeof prevData.name === 'string') {
                        sampleName = prevData.name
                    }
                }
                return {
                    id: log.id,
                    action: log.action,
                    sample: sampleName || 'Unknown',
                    user: log.user?.name || 'System',
                    description: log.description,
                    timestamp: log.timestamp,
                    previousData: log.previousData,
                    newData: log.newData,
                }
            }),
            total,
            limit,
            offset,
        })
    } catch (error) {
        console.error('Error fetching audit logs:', error)
        return NextResponse.json(
            { error: '获取审计日志失败' },
            { status: 500 }
        )
    }
}
