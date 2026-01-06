// Inventory API - Get facilities with full hierarchy for inventory page
// GET /api/inventory - Get all facilities with racks, shelves, boxes
// Supports ?private=true for private libraries

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessFacility } from '@/server/db/facility'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const facilityId = searchParams.get('facilityId')
        const rackId = searchParams.get('rackId')
        const shelfId = searchParams.get('shelfId')
        const boxId = searchParams.get('boxId')
        const privateMode = searchParams.get('private') === 'true'

        const userId = session.user.id
        const isAdmin = session.user.role === 'ADMIN'

        // Get single box with slots
        if (boxId) {
            const box = await prisma.box.findUnique({
                where: { id: boxId },
                include: {
                    shelf: {
                        include: {
                            rack: {
                                include: { facility: true },
                            },
                        },
                    },
                    slots: {
                        include: { sample: true },
                        orderBy: { position: 'asc' },
                    },
                },
            })

            // 检查权限
            if (box?.shelf.rack.facility) {
                const hasAccess = await canAccessFacility(box.shelf.rack.facility.id, userId, isAdmin)
                if (!hasAccess) {
                    return NextResponse.json({ error: '无权访问该盒子' }, { status: 403 })
                }
            }

            return NextResponse.json({ box })
        }

        // Get boxes for a shelf
        if (shelfId) {
            const shelf = await prisma.shelf.findUnique({
                where: { id: shelfId },
                include: { rack: { include: { facility: true } } }
            })

            if (shelf?.rack.facility) {
                const hasAccess = await canAccessFacility(shelf.rack.facility.id, userId, isAdmin)
                if (!hasAccess) {
                    return NextResponse.json({ error: '无权访问该层架' }, { status: 403 })
                }
            }

            const boxes = await prisma.box.findMany({
                where: { shelfId },
                include: {
                    _count: { select: { slots: true } },
                    slots: { select: { status: true } },
                },
            })
            const boxesWithStats = boxes.map(box => {
                const occupied = box.slots.filter(s => s.status === 'OCCUPIED').length
                return {
                    id: box.id,
                    name: box.name,
                    rows: box.rows,
                    columns: box.columns,
                    total: box._count.slots,
                    occupied,
                }
            })
            return NextResponse.json({ boxes: boxesWithStats })
        }

        // Get racks for a facility (权限检查)
        if (facilityId) {
            const hasAccess = await canAccessFacility(facilityId, userId, isAdmin)
            if (!hasAccess) {
                return NextResponse.json({ error: '无权访问该细胞库' }, { status: 403 })
            }

            const racks = await prisma.rack.findMany({
                where: { facilityId },
                include: {
                    shelves: {
                        include: {
                            boxes: {
                                include: {
                                    slots: { select: { status: true } },
                                },
                            },
                        },
                        orderBy: { order: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
            })

            const racksWithStats = racks.map(rack => {
                let total = 0
                let occupied = 0

                // Calculate per-shelf stats with boxes
                const shelvesDetail = rack.shelves.map(shelf => {
                    let shelfTotal = 0
                    let shelfUsed = 0
                    const boxesDetail = shelf.boxes.map(box => {
                        for (const slot of box.slots) {
                            shelfTotal++
                            total++
                            if (slot.status === 'OCCUPIED') {
                                shelfUsed++
                                occupied++
                            }
                        }
                        return {
                            id: box.id,
                            name: box.name,
                            rows: box.rows,
                            columns: box.columns,
                        }
                    })
                    return {
                        id: shelf.id,
                        name: shelf.name,
                        order: shelf.order,
                        occupancy: shelfTotal > 0 ? Math.round((shelfUsed / shelfTotal) * 100) : 0,
                        total: shelfTotal,
                        used: shelfUsed,
                        boxes: boxesDetail,
                    }
                })

                return {
                    id: rack.id,
                    name: rack.name,
                    code: rack.code,
                    totalShelves: rack.totalShelves,
                    shelves: shelvesDetail,
                    occupancy: total > 0 ? Math.round((occupied / total) * 100) : 0,
                    total,
                    used: occupied,
                }
            })
            return NextResponse.json({ racks: racksWithStats })
        }

        // Get rack details with shelves
        if (rackId) {
            const rack = await prisma.rack.findUnique({
                where: { id: rackId },
                include: {
                    facility: true,
                    shelves: {
                        include: {
                            boxes: {
                                include: {
                                    slots: { select: { status: true } },
                                },
                            },
                        },
                        orderBy: { order: 'asc' },
                    },
                },
            })

            if (rack?.facility) {
                const hasAccess = await canAccessFacility(rack.facility.id, userId, isAdmin)
                if (!hasAccess) {
                    return NextResponse.json({ error: '无权访问该扇/提' }, { status: 403 })
                }
            }

            return NextResponse.json({ rack })
        }

        // Default: Get all facilities (根据 privateMode 过滤)
        const whereClause = privateMode
            ? { isPrivate: true, ...(isAdmin ? {} : { ownerId: userId }) }
            : { isPrivate: false }

        const facilities = await prisma.storageFacility.findMany({
            where: whereClause,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                racks: {
                    include: {
                        shelves: {
                            include: {
                                boxes: {
                                    include: {
                                        slots: { select: { status: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        })

        const facilitiesWithStats = facilities.map(facility => {
            let total = 0
            let used = 0

            // Calculate per-rack stats
            const racksDetail = facility.racks.map(rack => {
                let rackTotal = 0
                let rackUsed = 0
                for (const shelf of rack.shelves) {
                    for (const box of shelf.boxes) {
                        for (const slot of box.slots) {
                            rackTotal++
                            total++
                            if (slot.status === 'OCCUPIED') {
                                rackUsed++
                                used++
                            }
                        }
                    }
                }
                return {
                    id: rack.id,
                    name: rack.name,
                    code: rack.code,
                    occupancy: rackTotal > 0 ? Math.round((rackUsed / rackTotal) * 100) : 0,
                    total: rackTotal,
                    used: rackUsed,
                }
            })

            return {
                id: facility.id,
                name: facility.name,
                type: facility.type,
                capacity: total > 0 ? Math.round((used / total) * 100) : 0,
                totalSlots: total,
                usedSlots: used,
                racks: facility.totalRacks,
                racksDetail,
                isPrivate: facility.isPrivate,
                owner: facility.owner,
            }
        })

        return NextResponse.json({ facilities: facilitiesWithStats })
    } catch (error) {
        console.error('Error fetching inventory:', error)
        return NextResponse.json(
            { error: '获取库存数据失败' },
            { status: 500 }
        )
    }
}
