// CSV Export API Endpoint
// GET /api/csv/export - Download samples as CSV
// GET /api/csv/export?template=true - Download empty template

import { NextRequest, NextResponse } from 'next/server'
import {
    getAllSamplesForExport,
    generateCSVContent,
    generateCSVTemplate,
} from '@/server/db/csv'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const isTemplate = searchParams.get('template') === 'true'

        const now = new Date()
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

        if (isTemplate) {
            // Return empty template
            const content = generateCSVTemplate()
            const filename = `cbms_import_template.csv`

            return new NextResponse(content, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            })
        }

        // Export all samples
        const samples = await getAllSamplesForExport()
        const content = generateCSVContent(samples)
        const filename = `cbms_samples_export_${timestamp}.csv`

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error) {
        console.error('CSV export error:', error)
        return NextResponse.json(
            { error: '导出失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        )
    }
}
