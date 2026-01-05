// Data Access Layer: Sample Operations
// Server-side functions for managing biological samples

import { prisma } from '@/lib/prisma'
// Slot status constants (matches Prisma enum)
const SLOT_STATUS = {
    EMPTY: 'EMPTY',
    OCCUPIED: 'OCCUPIED',
    RESERVED: 'RESERVED',
} as const

// ============================================
// Sample CRUD
// ============================================

export async function getSampleById(id: string) {
    return prisma.sample.findUnique({
        where: { id },
        include: {
            slot: {
                include: {
                    box: {
                        include: {
                            shelf: {
                                include: {
                                    rack: {
                                        include: { facility: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            auditLogs: {
                orderBy: { timestamp: 'desc' },
                take: 10,
            },
        },
    })
}

export async function searchSamples(query: string, limit = 50) {
    return prisma.sample.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { type: { contains: query, mode: 'insensitive' } },
                { batchNo: { contains: query, mode: 'insensitive' } },
                { owner: { contains: query, mode: 'insensitive' } },
            ],
        },
        include: {
            slot: {
                include: {
                    box: {
                        include: {
                            shelf: {
                                include: {
                                    rack: {
                                        include: { facility: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
    })
}

// 根据 IDs 获取多个样本
export async function getSamplesByIds(ids: string[]) {
    return prisma.sample.findMany({
        where: {
            id: { in: ids }
        },
        orderBy: { createdAt: 'desc' },
    })
}

// ============================================
// Check In (Create Sample)
// ============================================

export async function checkInSample(
    data: {
        name: string
        type: string
        batchNo?: string
        quantity: number
        unit: string
        concentration: string
        viability: number
        passage: string
        media?: string
        owner: string
        notes?: string
        sterileCheck?: string
    },
    slotId: string,
    userId: string
) {
    // Use transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
        // 1. Verify slot is empty
        const slot = await tx.slot.findUnique({
            where: { id: slotId },
            include: {
                box: {
                    include: {
                        shelf: {
                            include: {
                                rack: {
                                    include: { facility: true },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!slot) throw new Error('Slot not found')
        if (slot.status !== 'EMPTY') throw new Error('Slot is not empty')

        // 2. Create sample
        const sample = await tx.sample.create({
            data: {
                ...data,
                slotId,
            },
        })

        // 3. Update slot status
        await tx.slot.update({
            where: { id: slotId },
            data: { status: SLOT_STATUS.OCCUPIED },
        })

        // 4. Create audit log
        const locationString = `${slot.box.shelf.rack.facility.name} > ${slot.box.shelf.rack.name} > ${slot.box.shelf.name} > ${slot.box.name} > ${slot.rowLabel}${slot.colLabel}`

        await tx.auditLog.create({
            data: {
                action: 'CREATE',
                userId,
                sampleId: sample.id,
                description: `Checked in sample "${data.name}" to ${locationString}`,
                newData: {
                    name: data.name,
                    type: data.type,
                    location: locationString,
                },
            },
        })

        return sample
    })
}

// ============================================
// Check Out (Remove Sample)
// ============================================

export async function checkOutSample(
    sampleId: string,
    reason: 'EXPERIMENT' | 'DESTROY' | 'TRANSFER',
    userId: string,
    notes?: string
) {
    return prisma.$transaction(async (tx) => {
        // 1. Get sample with location
        const sample = await tx.sample.findUnique({
            where: { id: sampleId },
            include: {
                slot: {
                    include: {
                        box: {
                            include: {
                                shelf: {
                                    include: {
                                        rack: {
                                            include: { facility: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!sample) throw new Error('Sample not found')

        const slot = sample.slot
        const locationString = `${slot.box.shelf.rack.facility.name} > ${slot.box.shelf.rack.name} > ${slot.box.shelf.name} > ${slot.box.name} > ${slot.rowLabel}${slot.colLabel}`

        // 2. Create audit log BEFORE deleting
        await tx.auditLog.create({
            data: {
                action: reason === 'DESTROY' ? 'DESTROY' : 'CONSUME',
                userId,
                sampleId: null, // Sample will be deleted
                description: `Checked out sample "${sample.name}" from ${locationString}. Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`,
                previousData: {
                    name: sample.name,
                    type: sample.type,
                    location: locationString,
                    reason,
                },
            },
        })

        // 3. Delete sample
        await tx.sample.delete({
            where: { id: sampleId },
        })

        // 4. Update slot status
        await tx.slot.update({
            where: { id: slot.id },
            data: { status: SLOT_STATUS.EMPTY },
        })

        return { success: true, location: locationString }
    })
}

// ============================================
// Move Sample
// ============================================

export async function moveSample(
    sampleId: string,
    targetSlotId: string,
    userId: string
) {
    return prisma.$transaction(async (tx) => {
        // 1. Get sample with current location
        const sample = await tx.sample.findUnique({
            where: { id: sampleId },
            include: {
                slot: {
                    include: {
                        box: {
                            include: {
                                shelf: {
                                    include: {
                                        rack: {
                                            include: { facility: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!sample) throw new Error('Sample not found')

        // 2. Verify target slot is empty
        const targetSlot = await tx.slot.findUnique({
            where: { id: targetSlotId },
            include: {
                box: {
                    include: {
                        shelf: {
                            include: {
                                rack: {
                                    include: { facility: true },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!targetSlot) throw new Error('Target slot not found')
        if (targetSlot.status !== 'EMPTY') throw new Error('Target slot is not empty')

        const sourceSlot = sample.slot
        const sourceLocation = `${sourceSlot.box.shelf.rack.facility.name} > ${sourceSlot.box.shelf.rack.name} > ${sourceSlot.box.shelf.name} > ${sourceSlot.box.name} > ${sourceSlot.rowLabel}${sourceSlot.colLabel}`
        const targetLocation = `${targetSlot.box.shelf.rack.facility.name} > ${targetSlot.box.shelf.rack.name} > ${targetSlot.box.shelf.name} > ${targetSlot.box.name} > ${targetSlot.rowLabel}${targetSlot.colLabel}`

        // 3. Update sample location
        await tx.sample.update({
            where: { id: sampleId },
            data: { slotId: targetSlotId },
        })

        // 4. Update slot statuses
        await tx.slot.update({
            where: { id: sourceSlot.id },
            data: { status: SLOT_STATUS.EMPTY },
        })

        await tx.slot.update({
            where: { id: targetSlotId },
            data: { status: SLOT_STATUS.OCCUPIED },
        })

        // 5. Create audit log
        await tx.auditLog.create({
            data: {
                action: 'MOVE',
                userId,
                sampleId,
                description: `Moved sample "${sample.name}" from ${sourceLocation} to ${targetLocation}`,
                previousData: { location: sourceLocation },
                newData: { location: targetLocation },
            },
        })

        return {
            success: true,
            from: sourceLocation,
            to: targetLocation,
        }
    })
}

// ============================================
// Audit Log Operations
// ============================================

export async function getAuditLogs(options?: {
    sampleId?: string
    userId?: string
    action?: string
    from?: Date
    to?: Date
    limit?: number
}) {
    const { sampleId, userId, action, from, to, limit = 100 } = options || {}

    return prisma.auditLog.findMany({
        where: {
            ...(sampleId && { sampleId }),
            ...(userId && { userId }),
            ...(action && { action }),
            ...(from || to
                ? {
                    timestamp: {
                        ...(from && { gte: from }),
                        ...(to && { lte: to }),
                    },
                }
                : {}),
        },
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
            sample: {
                select: { id: true, name: true },
            },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
    })
}

// ============================================
// Batch Operations
// ============================================

/**
 * Batch check-in: Create multiple samples with the same data
 */
export async function batchCheckInSamples(
    data: {
        name: string
        type: string
        batchNo?: string
        quantity: number
        unit: string
        concentration: string
        viability: number
        passage: string
        media?: string
        owner: string
        notes?: string
        sterileCheck?: string
    },
    slotIds: string[],
    userId: string
) {
    return prisma.$transaction(async (tx) => {
        const results = []

        for (const slotId of slotIds) {
            // Verify slot is empty
            const slot = await tx.slot.findUnique({
                where: { id: slotId },
                include: {
                    box: {
                        include: {
                            shelf: {
                                include: {
                                    rack: {
                                        include: { facility: true },
                                    },
                                },
                            },
                        },
                    },
                },
            })

            if (!slot) throw new Error(`Slot ${slotId} not found`)
            if (slot.status !== 'EMPTY') throw new Error(`Slot ${slot.rowLabel}${slot.colLabel} is not empty`)

            // Create sample
            const sample = await tx.sample.create({
                data: {
                    ...data,
                    slotId,
                },
            })

            // Update slot status
            await tx.slot.update({
                where: { id: slotId },
                data: { status: SLOT_STATUS.OCCUPIED },
            })

            // Create audit log
            const locationString = `${slot.box.shelf.rack.facility.name} > ${slot.box.shelf.rack.name} > ${slot.box.shelf.name} > ${slot.box.name} > ${slot.rowLabel}${slot.colLabel}`
            await tx.auditLog.create({
                data: {
                    action: 'CREATE',
                    userId,
                    sampleId: sample.id,
                    description: `Batch checked in sample "${data.name}" to ${locationString}`,
                    newData: {
                        name: data.name,
                        type: data.type,
                        location: locationString,
                        batchOperation: true,
                    },
                },
            })

            results.push(sample)
        }

        return results
    })
}

/**
 * Batch check-out: Remove multiple samples
 */
export async function batchCheckOutSamples(
    sampleIds: string[],
    reason: 'EXPERIMENT' | 'DESTROY' | 'TRANSFER',
    userId: string,
    notes?: string
) {
    return prisma.$transaction(async (tx) => {
        const results = []

        for (const sampleId of sampleIds) {
            // Get sample with location
            const sample = await tx.sample.findUnique({
                where: { id: sampleId },
                include: {
                    slot: {
                        include: {
                            box: {
                                include: {
                                    shelf: {
                                        include: {
                                            rack: {
                                                include: { facility: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            })

            if (!sample) throw new Error(`Sample ${sampleId} not found`)

            const slot = sample.slot
            const locationString = `${slot.box.shelf.rack.facility.name} > ${slot.box.shelf.rack.name} > ${slot.box.shelf.name} > ${slot.box.name} > ${slot.rowLabel}${slot.colLabel}`

            // Create audit log BEFORE deleting
            await tx.auditLog.create({
                data: {
                    action: reason === 'DESTROY' ? 'DESTROY' : 'CONSUME',
                    userId,
                    sampleId: null,
                    description: `Batch checked out sample "${sample.name}" from ${locationString}. Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`,
                    previousData: {
                        name: sample.name,
                        type: sample.type,
                        location: locationString,
                        reason,
                        batchOperation: true,
                    },
                },
            })

            // Delete sample
            await tx.sample.delete({
                where: { id: sampleId },
            })

            // Update slot status
            await tx.slot.update({
                where: { id: slot.id },
                data: { status: SLOT_STATUS.EMPTY },
            })

            results.push({ id: sampleId, location: locationString })
        }

        return results
    })
}

/**
 * Batch update: Update multiple samples with same data
 */
export async function batchUpdateSamples(
    sampleIds: string[],
    updates: {
        name?: string
        type?: string
        batchNo?: string
        quantity?: number
        unit?: string
        concentration?: string
        viability?: number
        passage?: string
        media?: string
        owner?: string
        notes?: string
        sterileCheck?: string
    },
    userId: string
) {
    return prisma.$transaction(async (tx) => {
        const results = []

        for (const sampleId of sampleIds) {
            // Get current sample data
            const sample = await tx.sample.findUnique({
                where: { id: sampleId },
            })

            if (!sample) throw new Error(`Sample ${sampleId} not found`)

            // Update sample
            const updated = await tx.sample.update({
                where: { id: sampleId },
                data: updates,
            })

            // Create audit log
            await tx.auditLog.create({
                data: {
                    action: 'UPDATE',
                    userId,
                    sampleId,
                    description: `Updated sample "${sample.name}"`,
                    previousData: {
                        name: sample.name,
                        type: sample.type,
                        batchNo: sample.batchNo,
                    },
                    newData: updates,
                },
            })

            results.push(updated)
        }

        return results
    })
}

/**
 * Find samples in the same batch (all fields match except timestamps and slotId)
 */
export async function findBatchGroup(sampleId: string) {
    const sample = await prisma.sample.findUnique({
        where: { id: sampleId },
    })

    if (!sample) return []

    return prisma.sample.findMany({
        where: {
            name: sample.name,
            type: sample.type,
            batchNo: sample.batchNo,
            quantity: sample.quantity,
            unit: sample.unit,
            concentration: sample.concentration,
            viability: sample.viability,
            passage: sample.passage,
            media: sample.media,
            owner: sample.owner,
            id: { not: sampleId }, // Exclude the sample itself
        },
        include: {
            slot: true,
        },
    })
}

