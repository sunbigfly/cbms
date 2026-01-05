// Seed script for CBMS database
// Usage: npx prisma db seed

import { PrismaClient, SlotStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting CBMS database seed...')

    // 1. Create demo user
    const hashedPassword = await hash('admin123', 12)
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@cbms.local' },
        update: {},
        create: {
            email: 'admin@cbms.local',
            name: 'System Admin',
            password: hashedPassword,
            role: 'ADMIN',
        },
    })
    console.log('✅ Created admin user:', adminUser.email)

    // 2. Create demo facility: -80C Freezer
    const facility = await prisma.storageFacility.create({
        data: {
            name: 'Master Cell Bank',
            type: '-80°C Freezer',
            description: 'Primary storage facility for master cell bank',
            totalRacks: 4,
            racks: {
                create: Array.from({ length: 4 }, (_, rackIndex) => ({
                    name: `Rack ${String(rackIndex + 1).padStart(2, '0')}`,
                    code: `R${String(rackIndex + 1).padStart(2, '0')}`,
                    totalShelves: 5,
                    shelves: {
                        create: Array.from({ length: 5 }, (_, shelfIndex) => ({
                            name: `Drawer ${shelfIndex + 1}`,
                            order: shelfIndex + 1,
                            boxes: {
                                create: [
                                    {
                                        name: `Box-${rackIndex + 1}${String.fromCharCode(65 + shelfIndex)}`,
                                        rows: 9,
                                        columns: 9,
                                        gridType: 'ALPHANUMERIC',
                                        slots: {
                                            create: generateSlots(9, 9),
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
    console.log('✅ Created facility:', facility.name)

    // 3. Create some sample data in the first box
    const firstBox = await prisma.box.findFirst({
        include: { slots: true },
        orderBy: { name: 'asc' },
    })

    if (firstBox) {
        const emptySlots = firstBox.slots.filter((s) => s.status === 'EMPTY').slice(0, 5)

        for (let i = 0; i < emptySlots.length; i++) {
            const slot = emptySlots[i]
            await prisma.sample.create({
                data: {
                    name: 'CHO-K1',
                    type: 'Chinese Hamster Ovary',
                    batchNo: `2026-01-${String(i + 1).padStart(2, '0')}`,
                    quantity: 1.0,
                    unit: 'ml',
                    concentration: '2.5x10^6',
                    viability: 0.95 + Math.random() * 0.04,
                    passage: `P${i + 1}`,
                    media: 'CryoStor CS10',
                    owner: 'Lab Tech',
                    slotId: slot.id,
                },
            })

            await prisma.slot.update({
                where: { id: slot.id },
                data: { status: 'OCCUPIED' },
            })

            // Create audit log
            await prisma.auditLog.create({
                data: {
                    action: 'CREATE',
                    userId: adminUser.id,
                    sampleId: (await prisma.sample.findFirst({ where: { slotId: slot.id } }))?.id,
                    description: `Created sample CHO-K1 in ${firstBox.name} at ${slot.rowLabel}${slot.colLabel}`,
                    newData: { name: 'CHO-K1', position: `${slot.rowLabel}${slot.colLabel}` },
                },
            })
        }
        console.log('✅ Created 5 demo samples in', firstBox.name)
    }

    console.log('🎉 Seed completed successfully!')
}

function generateSlots(rows: number, cols: number) {
    const slots = []
    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            slots.push({
                rowLabel: rowLabels[row],
                colLabel: String(col + 1),
                position: row * cols + col + 1,
                status: SlotStatus.EMPTY,
            })
        }
    }

    return slots
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
