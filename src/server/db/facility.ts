// Data Access Layer: Facility Operations
// Server-side functions for managing storage facilities

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// ============================================
// Facility CRUD
// ============================================

// 获取设施列表
// options.privateMode = true: 获取私有库（用户只能看自己的，管理员能看所有）
// options.privateMode = false: 获取公共库
export async function getFacilities(options?: {
    privateMode?: boolean
    userId?: string
    isAdmin?: boolean
}) {
    const where: Prisma.StorageFacilityWhereInput = {}

    if (options?.privateMode) {
        // 私有库模式
        where.isPrivate = true
        if (!options.isAdmin) {
            // 普通用户只能看自己的
            where.ownerId = options.userId
        }
        // 管理员可以看所有私有库
    } else {
        // 公共库模式
        where.isPrivate = false
    }

    return prisma.storageFacility.findMany({
        where,
        include: {
            _count: {
                select: { racks: true },
            },
            owner: {
                select: { id: true, name: true, email: true }
            }
        },
        orderBy: { name: 'asc' },
    })
}

// 检查用户是否有权访问指定设施
// 公共库：所有人可访问
// 私有库：所有者或管理员可访问
export async function canAccessFacility(
    facilityId: string,
    userId: string,
    isAdmin: boolean
): Promise<boolean> {
    const facility = await prisma.storageFacility.findUnique({
        where: { id: facilityId },
        select: { isPrivate: true, ownerId: true }
    })

    if (!facility) return false
    if (!facility.isPrivate) return true  // 公共库所有人可访问
    if (isAdmin) return true              // 管理员可访问所有私有库
    return facility.ownerId === userId    // 私有库只有所有者可访问
}

// 获取设施所有权信息
export async function getFacilityOwnership(facilityId: string) {
    return prisma.storageFacility.findUnique({
        where: { id: facilityId },
        select: { isPrivate: true, ownerId: true }
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
    // 私有库支持
    ownerId?: string
    isPrivate?: boolean
}) {
    const { name, type, description, totalRacks, shelvesPerRack, defaultBoxRows, defaultBoxColumns, gridType, ownerId, isPrivate = false } = data

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
            ownerId,
            isPrivate,
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

// ============================================
// Facility Update & Delete
// ============================================

export async function updateFacility(id: string, data: {
    name?: string
    type?: string
    description?: string
}) {
    return prisma.storageFacility.update({
        where: { id },
        data,
    })
}

export async function canDeleteFacility(id: string): Promise<{ canDelete: boolean; reason?: string; sampleCount: number }> {
    const sampleCount = await prisma.sample.count({
        where: {
            slot: {
                box: {
                    shelf: {
                        rack: { facilityId: id }
                    }
                }
            }
        }
    })

    if (sampleCount > 0) {
        return { canDelete: false, reason: `设施内还有 ${sampleCount} 个细胞样本`, sampleCount }
    }
    return { canDelete: true, sampleCount: 0 }
}

export async function deleteFacility(id: string) {
    const check = await canDeleteFacility(id)
    if (!check.canDelete) {
        throw new Error(check.reason)
    }
    return prisma.storageFacility.delete({ where: { id } })
}

// ============================================
// Rack Add & Delete
// ============================================

export async function addRackToFacility(facilityId: string, data: {
    name: string
    shelvesPerRack: number
    boxRows: number
    boxCols: number
    gridType?: string
}) {
    const { name, shelvesPerRack, boxRows, boxCols, gridType = 'ALPHANUMERIC' } = data

    // Get current rack count for naming
    const existingRacks = await prisma.rack.count({ where: { facilityId } })
    const rackIndex = existingRacks + 1

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

    const rack = await prisma.rack.create({
        data: {
            name: name || `Rack ${String(rackIndex).padStart(2, '0')}`,
            code: `R${String(rackIndex).padStart(2, '0')}`,
            totalShelves: shelvesPerRack,
            facilityId,
            shelves: {
                create: Array.from({ length: shelvesPerRack }, (_, shelfIndex) => ({
                    name: `Drawer ${shelfIndex + 1}`,
                    order: shelfIndex + 1,
                    boxes: {
                        create: [{
                            name: `Box-${rackIndex}${String.fromCharCode(65 + shelfIndex)}`,
                            rows: boxRows,
                            columns: boxCols,
                            gridType,
                            slots: {
                                create: generateSlots(boxRows, boxCols),
                            },
                        }],
                    },
                })),
            },
        },
    })

    // Update facility totalRacks count
    await prisma.storageFacility.update({
        where: { id: facilityId },
        data: { totalRacks: { increment: 1 } },
    })

    return rack
}

export async function canDeleteRack(rackId: string): Promise<{ canDelete: boolean; reason?: string; sampleCount: number }> {
    const sampleCount = await prisma.sample.count({
        where: {
            slot: {
                box: {
                    shelf: { rackId }
                }
            }
        }
    })

    if (sampleCount > 0) {
        return { canDelete: false, reason: `架子内还有 ${sampleCount} 个细胞样本`, sampleCount }
    }
    return { canDelete: true, sampleCount: 0 }
}

export async function deleteRack(rackId: string) {
    const rack = await prisma.rack.findUnique({ where: { id: rackId }, select: { facilityId: true } })
    if (!rack) throw new Error('架子不存在')

    const check = await canDeleteRack(rackId)
    if (!check.canDelete) {
        throw new Error(check.reason)
    }

    await prisma.rack.delete({ where: { id: rackId } })

    // Update facility totalRacks count
    await prisma.storageFacility.update({
        where: { id: rack.facilityId },
        data: { totalRacks: { decrement: 1 } },
    })

    return { success: true }
}

// ============================================
// Box Add & Delete
// ============================================

export async function addBoxToShelf(shelfId: string, data: {
    name?: string
    rows: number
    columns: number
    gridType?: string
}) {
    const { name, rows, columns, gridType = 'ALPHANUMERIC' } = data

    // Get shelf info for naming
    const shelf = await prisma.shelf.findUnique({
        where: { id: shelfId },
        include: { boxes: true, rack: true }
    })
    if (!shelf) throw new Error('层架不存在')

    const boxCount = shelf.boxes.length + 1
    const boxName = name || `Box-${shelf.rack.code}-${shelf.order}-${boxCount}`

    const generateSlots = (r: number, c: number): Prisma.SlotCreateWithoutBoxInput[] => {
        const slots: Prisma.SlotCreateWithoutBoxInput[] = []
        const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        for (let row = 0; row < r; row++) {
            for (let col = 0; col < c; col++) {
                slots.push({
                    rowLabel: rowLabels[row],
                    colLabel: String(col + 1),
                    position: row * c + col + 1,
                    status: 'EMPTY',
                })
            }
        }
        return slots
    }

    return prisma.box.create({
        data: {
            name: boxName,
            rows,
            columns,
            gridType,
            shelfId,
            slots: {
                create: generateSlots(rows, columns),
            },
        },
    })
}

export async function canDeleteBox(boxId: string): Promise<{ canDelete: boolean; reason?: string; sampleCount: number }> {
    const sampleCount = await prisma.sample.count({
        where: {
            slot: { boxId }
        }
    })

    if (sampleCount > 0) {
        return { canDelete: false, reason: `盒子内还有 ${sampleCount} 个细胞样本`, sampleCount }
    }
    return { canDelete: true, sampleCount: 0 }
}

export async function deleteBox(boxId: string) {
    const check = await canDeleteBox(boxId)
    if (!check.canDelete) {
        throw new Error(check.reason)
    }
    return prisma.box.delete({ where: { id: boxId } })
}
