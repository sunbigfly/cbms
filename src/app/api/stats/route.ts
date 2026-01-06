// Dashboard Stats API
// GET /api/stats - Get dashboard statistics

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        // Get facilities count
        const facilitiesCount = await prisma.storageFacility.count()

        // Get total samples
        const samplesCount = await prisma.sample.count()

        // Get slot statistics
        const slotStats = await prisma.slot.groupBy({
            by: ['status'],
            _count: true,
        })

        const emptySlots = slotStats.find(s => s.status === 'EMPTY')?._count || 0
        const occupiedSlots = slotStats.find(s => s.status === 'OCCUPIED')?._count || 0
        const totalSlots = slotStats.reduce((sum, s) => sum + s._count, 0)

        // Get this month's operations count
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthlyOps = await prisma.auditLog.count({
            where: {
                timestamp: { gte: startOfMonth },
            },
        })

        // Get this week's check-ins
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - 7)
        const weeklyCheckIns = await prisma.auditLog.count({
            where: {
                action: 'CREATE',
                timestamp: { gte: startOfWeek },
            },
        })

        // Get recent activities
        const recentActivities = await prisma.auditLog.findMany({
            take: 5,
            orderBy: { timestamp: 'desc' },
            include: {
                user: { select: { name: true } },
                sample: { select: { name: true } },
            },
        })

        // Get facilities with stats
        const facilities = await prisma.storageFacility.findMany({
            include: {
                racks: {
                    include: {
                        shelves: {
                            include: {
                                boxes: {
                                    include: {
                                        slots: {
                                            select: { status: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        const facilitiesWithStats = facilities.map(facility => {
            let total = 0
            let used = 0
            for (const rack of facility.racks) {
                for (const shelf of rack.shelves) {
                    for (const box of shelf.boxes) {
                        for (const slot of box.slots) {
                            total++
                            if (slot.status === 'OCCUPIED') used++
                        }
                    }
                }
            }
            return {
                id: facility.id,
                name: facility.name,
                type: facility.type,
                capacity: total > 0 ? Math.round((used / total) * 100) : 0,
                slots: `${used.toLocaleString()} / ${total.toLocaleString()}`,
                totalSlots: total,
                usedSlots: used,
            }
        })

        return NextResponse.json({
            stats: {
                facilitiesCount,
                samplesCount,
                emptySlots,
                totalSlots,
                monthlyOps,
                weeklyCheckIns,
                capacityPercent: totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
            },
            recentActivities: recentActivities.map(log => {
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
                    description: log.description,
                    user: log.user?.name || 'System',
                    timestamp: log.timestamp,
                }
            }),
            facilities: facilitiesWithStats,
        })
    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json(
            { error: '获取统计数据失败' },
            { status: 500 }
        )
    }
}
