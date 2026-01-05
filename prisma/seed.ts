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
    const hashedPassword = await hash('724287349', 12)

    const adminUser = await prisma.user.create({
        data: {
            employeeId: 'admin',
            email: 'admin@cbms.local',
            name: '系统管理员',
            password: hashedPassword,
            role: 'ADMIN',
        },
    })

    console.log('✅ Created admin user: 工号 admin, 密码 724287349')

    // 3. Seed system presets
    const presetData = [
        // 细胞名称
        { category: 'CELL_NAME', values: ['K562', 'NK92', 'MSC', 'Vero', '3T3', 'CHO', 'A549', 'HeLa', 'PBMC', '无'] },
        // 细胞类型
        { category: 'CELL_TYPE', values: ['人类慢性粒细胞白血病细胞系', '人类自然杀伤细胞系', '间充质干细胞', '非洲绿猴肾上皮细胞', '小鼠胚胎成纤维细胞系', '中国仓鼠卵巢细胞', '人类肺腺癌上皮细胞', '人类宫颈癌细胞系', '外周血单核细胞', '无'] },
        // 冻存液
        { category: 'CRYO_MEDIA', values: ['10%DMSO+90%FBS', '亘诺', '亘沅', '元亘珏', '元亘新', '亘益', '亘存', '亘优U', '亘朗', '亘惠', '科源S2', '科源S5', '科为', '科源', 'CS10', '无'] },
        // 冻存密度
        { category: 'CRYO_DENSITY', values: ['2x10^6', '5x10^6', '1x10^7', '2x10^7', '3.24x10^6', '4x10^6', '3.78x10^6', '无'] },
        // 代数
        { category: 'PASSAGE', values: [...Array.from({ length: 30 }, (_, i) => `P${i + 1}`), '无'] },
        // 无菌验证
        { category: 'STERILE_CHECK', values: ['是', '否'] },
    ]

    for (const { category, values } of presetData) {
        for (let i = 0; i < values.length; i++) {
            await prisma.systemPreset.upsert({
                where: { category_value: { category, value: values[i] } },
                update: { order: i },
                create: { category, value: values[i], order: i },
            })
        }
    }
    console.log('✅ Created system presets')

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
