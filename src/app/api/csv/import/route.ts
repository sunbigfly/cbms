// CSV Import API Endpoint
// POST /api/csv/import - Upload and import CSV file
// POST /api/csv/import?validate=true - Validate only, don't import

import { NextRequest, NextResponse } from 'next/server'
import {
    parseCSV,
    validateCSVData,
    checkSlotCollisions,
    batchImportSamples,
} from '@/server/db/csv'

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const validateOnly = searchParams.get('validate') === 'true'

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

        if (collisionErrors.length > 0) {
            return NextResponse.json({
                success: false,
                validationErrors: collisionErrors,
                message: `发现 ${collisionErrors.length} 个位置冲突`,
            })
        }

        // If validate only, return success
        if (validateOnly) {
            return NextResponse.json({
                success: true,
                message: `验证通过：${data.length} 条记录准备导入`,
                count: data.length,
            })
        }

        // Perform import
        // TODO: Get actual userId from session
        const userId = 'system-import'

        const result = await batchImportSamples(data, userId)

        return NextResponse.json({
            success: result.success,
            imported: result.imported,
            skipped: result.skipped,
            errors: result.errors,
            message: result.success
                ? `成功导入 ${result.imported} 条记录`
                : `导入完成，成功 ${result.imported} 条，失败 ${result.skipped} 条`,
        })
    } catch (error) {
        console.error('CSV import error:', error)
        return NextResponse.json(
            { error: '导入失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
