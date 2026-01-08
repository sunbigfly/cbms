/**
 * Vercel Build Script for CBMS
 * 
 * This script handles the build process for Vercel deployment:
 * 1. Generates Prisma client
 * 2. Pushes database schema to Neon
 * 3. Checks if database needs seeding (only seeds if no admin user exists)
 * 4. Builds the Next.js application
 */

import { execSync } from 'child_process'

function run(command: string, description: string) {
    console.log(`\n🚀 ${description}...`)
    console.log(`   Running: ${command}`)
    try {
        execSync(command, { stdio: 'inherit' })
        console.log(`   ✅ ${description} completed`)
    } catch (error) {
        console.error(`   ❌ ${description} failed`)
        throw error
    }
}

async function checkNeedsSeed(): Promise<boolean> {
    console.log('\n🔍 Checking if database needs seeding...')
    
    try {
        // Dynamic import to avoid issues before prisma generate
        const { PrismaClient } = await import('@prisma/client')
        const prisma = new PrismaClient()
        
        try {
            // Check if admin user exists
            const adminCount = await prisma.user.count({
                where: { role: 'ADMIN' }
            })
            
            await prisma.$disconnect()
            
            if (adminCount > 0) {
                console.log(`   ✅ Found ${adminCount} admin user(s), skipping seed`)
                return false
            } else {
                console.log('   ⚠️ No admin users found, will run seed')
                return true
            }
        } catch (e) {
            await prisma.$disconnect()
            // If tables don't exist, we need to seed
            console.log('   ⚠️ Database tables may not exist yet, will run seed after db push')
            return true
        }
    } catch (e) {
        // Prisma client not available yet, will need seed after generate
        console.log('   ⚠️ Cannot check database yet, will run seed')
        return true
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════╗')
    console.log('║     CBMS Vercel Build Script               ║')
    console.log('╚════════════════════════════════════════════╝')

    // Step 1: Generate Prisma Client
    run('npx prisma generate', 'Generating Prisma Client')

    // Step 2: Push database schema (creates tables if they don't exist)
    run('npx prisma db push --skip-generate', 'Pushing database schema')

    // Step 3: Check if we need to seed
    const needsSeed = await checkNeedsSeed()
    
    if (needsSeed) {
        run('npx tsx prisma/seed.ts', 'Seeding database')
    }

    // Step 4: Build Next.js
    run('npx next build', 'Building Next.js application')

    console.log('\n╔════════════════════════════════════════════╗')
    console.log('║     ✅ Build completed successfully!       ║')
    console.log('╚════════════════════════════════════════════╝\n')
}

main().catch((error) => {
    console.error('\n❌ Build failed:', error.message)
    process.exit(1)
})
