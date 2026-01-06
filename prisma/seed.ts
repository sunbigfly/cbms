// Seed script for CBMS database
// Usage: npx prisma db seed

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting CBMS database seed...')

    // 1. Clean up existing data (Optional if using migrate reset, but good for safety)
    // Note: If you use `npx prisma migrate reset`, it truncates tables automatically.
    // If you run `npx prisma db seed` manually, these deleteMany calls ensure a clean state.
    // We deleting in reverse order of dependency to avoid foreign key constraints if not cascading.
    await prisma.auditLog.deleteMany()
    await prisma.sample.deleteMany()
    await prisma.slot.deleteMany()
    await prisma.box.deleteMany()
    await prisma.shelf.deleteMany()
    await prisma.rack.deleteMany()
    await prisma.storageFacility.deleteMany()
    await prisma.systemPreset.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()

    console.log('🧹 Cleared all existing data')

    // 2. Create the single Admin user
    const adminId = process.env.ADMIN_EMPLOYEE_ID || 'admin'
    const adminPwdPlain = process.env.ADMIN_PASSWORD || 'changeme'
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cbms.local'

    // Warn if using defaults
    if (!process.env.ADMIN_PASSWORD) {
        console.warn('Using default admin password. Please set ADMIN_EMPLOYEE_ID/ADMIN_PASSWORD in .env')
    }

    const hashedPassword = await hash(adminPwdPlain, 12)

    const adminUser = await prisma.user.create({
        data: {
            employeeId: adminId,
            email: adminEmail,
            name: '系统管理员',
            password: hashedPassword,
            role: 'ADMIN',
        },
    })

    console.log(`✅ Created admin user: 工号 ${adminId}, 密码 ${adminPwdPlain}`)

    // 3. Seed system presets
    // Read from presets.json
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const presetData = require('./presets.json') as { category: string, values: string[] }[]

    for (const { category, values } of presetData) {
        for (let i = 0; i < values.length; i++) {
            await prisma.systemPreset.upsert({
                where: { category_value: { category, value: values[i] } },
                update: { order: i },
                create: { category, value: values[i], order: i },
            })
        }
    }
    console.log(`✅ Created system presets from presets.json (${presetData.length} categories)`)

    console.log('🎉 Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
