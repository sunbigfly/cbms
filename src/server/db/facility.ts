// Data Access Layer: Facility Operations
// Server-side functions for managing storage facilities

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// ============================================
// Facility CRUD
// ============================================

export async function getFacilities() {
    return prisma.storageFacility.findMany({
        include: {
            _count: {
                select: { racks: true },
            },
        },
        orderBy: { name: 'asc' },
    })
}

export async function getFacilityById(id: string) {
    return prisma.storageFacility.findUnique({
        where: { id },
        include: {
            racks: {
                include: {
                    shelves: {
                        include: {
                            boxes: {
                                include: {
                                    _count: {
                                        select: { slots: true },
                                    },
                                },
                            },
                        },
                        orderBy: { order: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
            },
        },
    })
}

export async function getFacilityStats(facilityId: string) {
    const facility = await prisma.storageFacility.findUnique({
        where: { id: facilityId },
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

    if (!facility) return null

    let totalSlots = 0
    let occupiedSlots = 0
    let emptySlots = 0
    let reservedSlots = 0

    for (const rack of facility.racks) {
        for (const shelf of rack.shelves) {
            for (const box of shelf.boxes) {
                for (const slot of box.slots) {
                    totalSlots++
                    if (slot.status === 'OCCUPIED') occupiedSlots++
                    else if (slot.status === 'EMPTY') emptySlots++
                    else if (slot.status === 'RESERVED') reservedSlots++
                }
            }
        }
    }

    return {
        facilityId,
        facilityName: facility.name,
        totalSlots,
        occupiedSlots,
        emptySlots,
        reservedSlots,
        occupancyRate: totalSlots > 0 ? occupiedSlots / totalSlots : 0,
    }
}

export async function createFacility(data: {
    name: string
    type: string
    description?: string
    totalRacks: number
    shelvesPerRack: number
    defaultBoxRows: number
    defaultBoxColumns: number
    gridType: string
}) {
    const { name, type, description, totalRacks, shelvesPerRack, defaultBoxRows, defaultBoxColumns, gridType } = data

    // Generate slots for a box
    const generateSlots = (rows: number, cols: number): Prisma.SlotCreateWithoutBoxInput[] => {
        const slots: Prisma.SlotCreateWithoutBoxInput[] = []
        const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                slots.push({
                    rowLabel: rowLabels[row],
                    colLabel: String(col + 1),
                    position: row * cols + col + 1,
                    status: 'EMPTY',
                })
            }
        }
        return slots
    }

    return prisma.storageFacility.create({
        data: {
            name,
            type,
            description,
            totalRacks,
            racks: {
                create: Array.from({ length: totalRacks }, (_, rackIndex) => ({
                    name: `Rack ${String(rackIndex + 1).padStart(2, '0')}`,
                    code: `R${String(rackIndex + 1).padStart(2, '0')}`,
                    totalShelves: shelvesPerRack,
                    shelves: {
                        create: Array.from({ length: shelvesPerRack }, (_, shelfIndex) => ({
                            name: `Drawer ${shelfIndex + 1}`,
                            order: shelfIndex + 1,
                            boxes: {
                                create: [
                                    {
                                        name: `Box-${rackIndex + 1}${String.fromCharCode(65 + shelfIndex)}`,
                                        rows: defaultBoxRows,
                                        columns: defaultBoxColumns,
                                        gridType,
                                        slots: {
                                            create: generateSlots(defaultBoxRows, defaultBoxColumns),
                                        },
                                    },
                                ],
                            },
                        })),
                    },
                })),
            },
        },
    })
}

// ============================================
// Rack & Shelf Operations
// ============================================

export async function getRackById(id: string) {
    return prisma.rack.findUnique({
        where: { id },
        include: {
            facility: true,
            shelves: {
                include: {
                    boxes: {
                        include: {
                            slots: {
                                include: { sample: true },
                            },
                        },
                    },
                },
                orderBy: { order: 'asc' },
            },
        },
    })
}

export async function getShelfById(id: string) {
    return prisma.shelf.findUnique({
        where: { id },
        include: {
            rack: {
                include: { facility: true },
            },
            boxes: {
                include: {
                    slots: {
                        include: { sample: true },
                        orderBy: { position: 'asc' },
                    },
                },
            },
        },
    })
}

// ============================================
// Box Operations
// ============================================

export async function getBoxById(id: string) {
    return prisma.box.findUnique({
        where: { id },
        include: {
            shelf: {
                include: {
                    rack: {
                        include: { facility: true },
                    },
                },
            },
            slots: {
                include: {
                    sample: true,
                },
                orderBy: { position: 'asc' },
            },
        },
    })
}

export async function getBoxStats(boxId: string) {
    const box = await prisma.box.findUnique({
        where: { id: boxId },
        include: {
            slots: { select: { status: true } },
        },
    })

    if (!box) return null

    const total = box.slots.length
    const occupied = box.slots.filter((s) => s.status === 'OCCUPIED').length
    const empty = box.slots.filter((s) => s.status === 'EMPTY').length
    const reserved = box.slots.filter((s) => s.status === 'RESERVED').length

    return {
        boxId,
        boxName: box.name,
        rows: box.rows,
        columns: box.columns,
        total,
        occupied,
        empty,
        reserved,
        occupancyRate: total > 0 ? occupied / total : 0,
    }
}
