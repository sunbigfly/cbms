// Inventory API - Get facilities with full hierarchy for inventory page
// GET /api/inventory - Get all facilities with racks, shelves, boxes

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const facilityId = searchParams.get('facilityId')
        const rackId = searchParams.get('rackId')
        const shelfId = searchParams.get('shelfId')
        const boxId = searchParams.get('boxId')

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
            return NextResponse.json({ box })
        }

        // Get boxes for a shelf
        if (shelfId) {
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

        // Get racks for a facility
        if (facilityId) {
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
            return NextResponse.json({ rack })
        }

        // Default: Get all facilities
        const facilities = await prisma.storageFacility.findMany({
            include: {
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
