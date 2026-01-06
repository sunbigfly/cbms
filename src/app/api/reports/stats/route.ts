import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface FacilitySample {
    name: string
    count: bigint
}

interface AuditLogEntry {
    action: string
    timestamp: Date
}

export async function GET() {
    try {
        // 1. 获取各细胞库样本分布
        const facilitySamples = await prisma.$queryRaw<FacilitySample[]>`
            SELECT sf.name, COUNT(s.id) as count
            FROM "StorageFacility" sf
            LEFT JOIN "Rack" r ON r."facilityId" = sf.id
            LEFT JOIN "Shelf" sh ON sh."rackId" = r.id
            LEFT JOIN "Box" b ON b."shelfId" = sh.id
            LEFT JOIN "Slot" sl ON sl."boxId" = b.id
            LEFT JOIN "Sample" s ON s."slotId" = sl.id
            GROUP BY sf.id, sf.name
            ORDER BY count DESC
        `

        // 2. 获取样本类型分布
        const typeSamples = await prisma.sample.groupBy({
            by: ['type'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        })

        // 3. 获取代次分布
        const passageSamples = await prisma.sample.groupBy({
            by: ['passage'],
            _count: { id: true },
            orderBy: { passage: 'asc' },
        })

        // 4. 获取样本所有者分布
        const ownerSamples = await prisma.sample.groupBy({
            by: ['owner'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        })

        // 5. 获取最近30天操作趋势
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        const auditLogs = await prisma.auditLog.findMany({
            where: {
                timestamp: { gte: thirtyDaysAgo },
                action: { in: ['CREATE', 'CONSUME', 'UPDATE'] },
            },
            select: {
                action: true,
                timestamp: true,
            },
            orderBy: { timestamp: 'asc' },
        })

        // 按日期分组
        const dailyTrends: Record<string, { date: string; create: number; consume: number; update: number }> = {}

        // 初始化所有日期
        for (let i = 0; i < 30; i++) {
            const date = new Date()
            date.setDate(date.getDate() - 29 + i)
            const dateStr = date.toISOString().split('T')[0]
            dailyTrends[dateStr] = { date: dateStr, create: 0, consume: 0, update: 0 }
        }

        // 填充数据
        auditLogs.forEach((log: AuditLogEntry) => {
            const dateStr = log.timestamp.toISOString().split('T')[0]
            if (dailyTrends[dateStr]) {
                if (log.action === 'CREATE') dailyTrends[dateStr].create++
                else if (log.action === 'CONSUME') dailyTrends[dateStr].consume++
                else if (log.action === 'UPDATE') dailyTrends[dateStr].update++
            }
        })

        const trendData = Object.values(dailyTrends).sort((a, b) => a.date.localeCompare(b.date))

        // 格式化返回数据
        const response = {
            facilityDistribution: facilitySamples.map((f: FacilitySample) => ({
                name: f.name,
                value: Number(f.count),
            })).filter((f: { name: string; value: number }) => f.value > 0),

            typeDistribution: typeSamples.map((t: typeof typeSamples[0]) => ({
                name: t.type || '未知',
                value: t._count.id,
            })),

            passageDistribution: passageSamples.map((p: typeof passageSamples[0]) => ({
                name: p.passage || '未知',
                value: p._count.id,
            })),

            ownerDistribution: ownerSamples.map((o: typeof ownerSamples[0]) => ({
                name: o.owner || '未知',
                value: o._count.id,
            })),

            dailyTrends: trendData.map(d => ({
                date: d.date.slice(5), // MM-DD 格式
                入库: d.create,
                出库: d.consume,
                编辑: d.update,
            })),
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Failed to fetch report stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch report stats' },
            { status: 500 }
        )
    }
}
