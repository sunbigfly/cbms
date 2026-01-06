// CSV Import API Endpoint
// POST /api/csv/import - Upload and import CSV file
// POST /api/csv/import?validate=true - Validate only, don't import
// POST /api/csv/import?mode=skip|overwrite - Import with conflict handling

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
    parseCSV,
    validateCSVData,
    checkSlotCollisions,
    batchImportSamples,
    type ImportMode,
} from '@/server/db/csv'

export async function POST(request: NextRequest) {
    try {
        // 获取当前登录用户
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '未登录' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const validateOnly = searchParams.get('validate') === 'true'
        const mode = (searchParams.get('mode') || 'skip') as ImportMode

        // Parse form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { error: '请选择要上传的 CSV 文件' },
                { status: 400 }
            )
        }

        // Read file content
        const content = await file.text()

        // Remove BOM if present
        const cleanContent = content.replace(/^\uFEFF/, '')

        // Parse CSV
        const rows = parseCSV(cleanContent)

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'CSV 文件为空' },
                { status: 400 }
            )
        }

        // Validate data format
        const { data, errors: formatErrors } = await validateCSVData(rows)

        if (formatErrors.length > 0) {
            return NextResponse.json({
                success: false,
                validationErrors: formatErrors,
                message: `发现 ${formatErrors.length} 个格式错误`,
            })
        }

        // Check for slot collisions
        const collisionErrors = await checkSlotCollisions(data)

        // Filter collision errors (position conflicts vs location not found)
        const positionConflicts = collisionErrors.filter(e => e.message.includes('已被占用'))
        const locationNotFound = collisionErrors.filter(e => e.message.includes('未找到位置'))

        // If there are location errors, always return them
        if (locationNotFound.length > 0) {
            return NextResponse.json({
                success: false,
                validationErrors: locationNotFound,
                message: `发现 ${locationNotFound.length} 个位置不存在`,
            })
        }

        // If validate only, return collision info and let user choose
        if (validateOnly) {
            if (positionConflicts.length > 0) {
                return NextResponse.json({
                    success: false,
                    hasConflicts: true,
                    conflictCount: positionConflicts.length,
                    totalCount: data.length,
                    validationErrors: positionConflicts,
                    message: `发现 ${positionConflicts.length} 个位置冲突`,
                })
            }

            return NextResponse.json({
                success: true,
                message: `验证通过：${data.length} 条记录准备导入`,
                count: data.length,
                hasConflicts: false,
            })
        }

        // Perform import with specified mode, using actual user ID
        const userId = session.user.id

        const result = await batchImportSamples(data, userId, mode)

        // Build success message
        let message = `成功导入 ${result.imported} 条记录`
        if (result.overwritten > 0) {
            message += `，覆盖 ${result.overwritten} 条`
        }
        if (result.skipped > 0) {
            message += `，略过 ${result.skipped} 条`
        }

        return NextResponse.json({
            success: result.success,
            imported: result.imported,
            skipped: result.skipped,
            overwritten: result.overwritten,
            errors: result.errors,
            message,
        })
    } catch (error) {
        console.error('CSV import error:', error)
        return NextResponse.json(
            { error: '导入失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}

