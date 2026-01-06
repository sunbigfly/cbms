// Data Access Layer: CSV Import/Export Operations
// Server-side functions for bulk sample data operations

import { prisma } from '@/lib/prisma'

// Slot status constants (matches Prisma enum)
const SLOT_STATUS = {
    EMPTY: 'EMPTY',
    OCCUPIED: 'OCCUPIED',
    RESERVED: 'RESERVED',
} as const

// CSV Column Headers (Chinese labels for user-friendly export)
const CSV_HEADERS = [
    '样本名称',
    '细胞类型',
    '批次号',
    '数量',
    '单位',
    '浓度',
    '活性',
    '代次',
    '冻存液',
    '无菌验证',
    '负责人',
    '备注',
    '库类型',
    '库所有者',
    '细胞库名称',
    '扇/提代码',
    '层名称',
    '盒子名称',
    '行',
    '列',
]

// English field mapping for internal use
const FIELD_MAP = {
    '样本名称': 'name',
    '细胞类型': 'type',
    '批次号': 'batchNo',
    '数量': 'quantity',
    '单位': 'unit',
    '浓度': 'concentration',
    '活性': 'viability',
    '代次': 'passage',
    '冻存液': 'media',
    '无菌验证': 'sterileCheck',
    '负责人': 'owner',
    '备注': 'notes',
    '库类型': 'libraryType',
    '库所有者': 'libraryOwner',
    '细胞库名称': 'facilityName',
    '扇/提代码': 'rackCode',
    '层名称': 'shelfName',
    '盒子名称': 'boxName',
    '行': 'row',
    '列': 'col',
} as const

export interface ExportedSample {
    name: string
    type: string
    batchNo: string | null
    quantity: number
    unit: string
    concentration: string
    viability: number
    passage: string
    media: string | null
    sterileCheck: string | null
    owner: string
    notes: string | null
    libraryType: string
    libraryOwner: string | null
    facilityName: string
    rackCode: string
    shelfName: string
    boxName: string
    row: string
    col: string
}

export interface ImportRow {
    name: string
    type: string
    batchNo?: string
    quantity: number
    unit: string
    concentration: string
    viability: number
    passage: string
    media?: string
    sterileCheck?: string
    owner: string
    notes?: string
    libraryType: string
    libraryOwner?: string
    facilityName: string
    rackCode: string
    shelfName: string
    boxName: string
    row: string
    col: string
}

export interface ValidationError {
    row: number
    field: string
    message: string
}

export interface ImportResult {
    success: boolean
    imported: number
    errors: ValidationError[]
    skipped: number
    overwritten: number
}

export type ImportMode = 'skip' | 'overwrite'

// ============================================
// Export Functions
// ============================================

/**
 * Get all samples with full location hierarchy for export
 */
export async function getAllSamplesForExport(): Promise<ExportedSample[]> {
    const samples = await prisma.sample.findMany({
        include: {
            slot: {
                include: {
                    box: {
                        include: {
                            shelf: {
                                include: {
                                    rack: {
                                        include: {
                                            facility: {
                                                include: {
                                                    owner: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: [
            { createdAt: 'asc' },
        ],
    })

    return samples.map((sample) => {
        const facility = sample.slot.box.shelf.rack.facility
        return {
            name: sample.name,
            type: sample.type,
            batchNo: sample.batchNo,
            quantity: sample.quantity,
            unit: sample.unit,
            concentration: sample.concentration,
            viability: sample.viability,
            passage: sample.passage,
            media: sample.media,
            sterileCheck: sample.sterileCheck,
            owner: sample.owner,
            notes: sample.notes,
            libraryType: facility.isPrivate ? '私有库' : '公共库',
            libraryOwner: facility.owner?.name ?? null,
            facilityName: facility.name,
            rackCode: sample.slot.box.shelf.rack.code,
            shelfName: sample.slot.box.shelf.name,
            boxName: sample.slot.box.name,
            row: sample.slot.rowLabel,
            col: sample.slot.colLabel,
        }
    })
}

/**
 * Generate CSV content from samples
 */
export function generateCSVContent(samples: ExportedSample[]): string {
    const rows: string[] = []

    // Add BOM for Excel compatibility with Chinese characters
    const BOM = '\uFEFF'

    // Header row
    rows.push(CSV_HEADERS.join(','))

    // Data rows
    for (const sample of samples) {
        const row = [
            escapeCSVField(sample.name),
            escapeCSVField(sample.type),
            escapeCSVField(sample.batchNo ?? ''),
            sample.quantity.toString(),
            escapeCSVField(sample.unit),
            escapeCSVField(sample.concentration),
            sample.viability.toString(),
            escapeCSVField(sample.passage),
            escapeCSVField(sample.media ?? ''),
            escapeCSVField(sample.sterileCheck ?? ''),
            escapeCSVField(sample.owner),
            escapeCSVField(sample.notes ?? ''),
            escapeCSVField(sample.libraryType),
            escapeCSVField(sample.libraryOwner ?? ''),
            escapeCSVField(sample.facilityName),
            escapeCSVField(sample.rackCode),
            escapeCSVField(sample.shelfName),
            escapeCSVField(sample.boxName),
            escapeCSVField(sample.row),
            escapeCSVField(sample.col),
        ]
        rows.push(row.join(','))
    }

    return BOM + rows.join('\n')
}

/**
 * Generate empty template CSV
 */
export function generateCSVTemplate(): string {
    const BOM = '\uFEFF'
    return BOM + CSV_HEADERS.join(',') + '\n'
}

/**
 * Escape a field for CSV format
 */
function escapeCSVField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

// ============================================
// Import Functions
// ============================================

/**
 * Parse CSV content into rows
 */
export function parseCSV(content: string): string[][] {
    const lines = content.split(/\r?\n/).filter((line) => line.trim())
    return lines.map((line) => parseCSVLine(line))
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"'
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                current += char
            }
        } else {
            if (char === '"') {
                inQuotes = true
            } else if (char === ',') {
                result.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
    }

    result.push(current.trim())
    return result
}

/**
 * Validate and parse CSV data for import
 */
export async function validateCSVData(
    rows: string[][]
): Promise<{ data: ImportRow[]; errors: ValidationError[] }> {
    const errors: ValidationError[] = []
    const data: ImportRow[] = []

    if (rows.length < 2) {
        errors.push({ row: 0, field: '', message: 'CSV 文件为空或只有表头' })
        return { data, errors }
    }

    // Validate header
    const headers = rows[0]
    const expectedHeaders = CSV_HEADERS
    const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h))

    if (missingHeaders.length > 0) {
        errors.push({
            row: 0,
            field: '',
            message: `缺少必要列: ${missingHeaders.join(', ')}`,
        })
        return { data, errors }
    }

    // Create header index map
    const headerIndex: Record<string, number> = {}
    headers.forEach((h, i) => {
        headerIndex[h] = i
    })

    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 1

        // Skip empty rows
        if (row.every((cell) => !cell.trim())) continue

        const getValue = (header: string): string => {
            const idx = headerIndex[header]
            return idx !== undefined ? (row[idx] ?? '').trim() : ''
        }

        // Required field validation
        const requiredFields = ['样本名称', '细胞类型', '数量', '单位', '浓度', '活性', '代次', '负责人', '库类型', '细胞库名称', '扇/提代码', '层名称', '盒子名称', '行', '列']

        for (const field of requiredFields) {
            if (!getValue(field)) {
                errors.push({ row: rowNum, field, message: `${field} 不能为空` })
            }
        }

        // Numeric validation
        const quantity = parseFloat(getValue('数量'))
        if (isNaN(quantity) || quantity <= 0) {
            errors.push({ row: rowNum, field: '数量', message: '数量必须是正数' })
        }

        const viability = parseFloat(getValue('活性'))
        if (isNaN(viability) || viability < 0 || viability > 1) {
            errors.push({ row: rowNum, field: '活性', message: '活性必须在 0-1 之间' })
        }

        // Library type validation
        const libraryType = getValue('库类型')
        if (libraryType && !['公共库', '私有库'].includes(libraryType)) {
            errors.push({ row: rowNum, field: '库类型', message: '库类型必须是 "公共库" 或 "私有库"' })
        }

        // Only add data if no errors for this row
        if (!errors.some((e) => e.row === rowNum)) {
            data.push({
                name: getValue('样本名称'),
                type: getValue('细胞类型'),
                batchNo: getValue('批次号') || undefined,
                quantity,
                unit: getValue('单位'),
                concentration: getValue('浓度'),
                viability,
                passage: getValue('代次'),
                media: getValue('冻存液') || undefined,
                sterileCheck: getValue('无菌验证') || undefined,
                owner: getValue('负责人'),
                notes: getValue('备注') || undefined,
                libraryType: getValue('库类型'),
                libraryOwner: getValue('库所有者') || undefined,
                facilityName: getValue('细胞库名称'),
                rackCode: getValue('扇/提代码'),
                shelfName: getValue('层名称'),
                boxName: getValue('盒子名称'),
                row: getValue('行'),
                col: getValue('列'),
            })
        }
    }

    return { data, errors }
}

/**
 * Check for slot collisions before import
 */
export async function checkSlotCollisions(
    data: ImportRow[]
): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    for (let i = 0; i < data.length; i++) {
        const item = data[i]
        const rowNum = i + 2 // Account for header row
        const isPrivate = item.libraryType === '私有库'

        // Find the slot
        const slot = await prisma.slot.findFirst({
            where: {
                rowLabel: item.row,
                colLabel: item.col,
                box: {
                    name: item.boxName,
                    shelf: {
                        name: item.shelfName,
                        rack: {
                            code: item.rackCode,
                            facility: {
                                name: item.facilityName,
                                isPrivate: isPrivate,
                            },
                        },
                    },
                },
            },
            include: {
                sample: true,
            },
        })

        if (!slot) {
            errors.push({
                row: rowNum,
                field: '位置',
                message: `未找到位置: ${item.libraryType} > ${item.facilityName} > ${item.rackCode} > ${item.shelfName} > ${item.boxName} > ${item.row}${item.col}`,
            })
        } else if (slot.status === SLOT_STATUS.OCCUPIED || slot.sample) {
            errors.push({
                row: rowNum,
                field: '位置',
                message: `位置已被占用: ${item.row}${item.col} (${slot.sample?.name ?? '未知'})`,
            })
        }
    }

    return errors
}

/**
 * Batch import samples with conflict handling
 * @param mode - 'skip' to skip conflicting slots, 'overwrite' to replace existing samples
 */
export async function batchImportSamples(
    data: ImportRow[],
    userId: string,
    mode: ImportMode = 'skip'
): Promise<ImportResult> {
    const errors: ValidationError[] = []
    let imported = 0
    let skipped = 0
    let overwritten = 0

    for (let i = 0; i < data.length; i++) {
        const item = data[i]
        const rowNum = i + 2
        const isPrivate = item.libraryType === '私有库'

        try {
            // Find the slot (regardless of status)
            const slot = await prisma.slot.findFirst({
                where: {
                    rowLabel: item.row,
                    colLabel: item.col,
                    box: {
                        name: item.boxName,
                        shelf: {
                            name: item.shelfName,
                            rack: {
                                code: item.rackCode,
                                facility: {
                                    name: item.facilityName,
                                    isPrivate: isPrivate,
                                },
                            },
                        },
                    },
                },
                include: {
                    sample: true,
                },
            })

            if (!slot) {
                errors.push({
                    row: rowNum,
                    field: '位置',
                    message: `未找到位置: ${item.libraryType} > ${item.facilityName} > ${item.rackCode} > ${item.shelfName} > ${item.boxName} > ${item.row}${item.col}`,
                })
                skipped++
                continue
            }

            // Check if slot is occupied
            const isOccupied = slot.status === SLOT_STATUS.OCCUPIED || slot.sample

            if (isOccupied) {
                if (mode === 'skip') {
                    // In skip mode, just skip this slot
                    skipped++
                    continue
                }
                // In overwrite mode, we'll delete existing sample first
            }

            // Create sample in transaction
            await prisma.$transaction(async (tx) => {
                // If overwriting, delete existing sample first
                if (isOccupied && mode === 'overwrite' && slot.sample) {
                    const oldSampleName = slot.sample.name

                    // Create audit log for deletion
                    await tx.auditLog.create({
                        data: {
                            action: 'DELETE',
                            userId,
                            sampleId: slot.sample.id,
                            description: `通过 CSV 导入覆盖删除样本 ${oldSampleName} 在 ${item.facilityName} > ${item.rackCode} > ${item.shelfName} > ${item.boxName} > ${item.row}${item.col}`,
                            previousData: {
                                name: slot.sample.name,
                                type: slot.sample.type,
                                location: `${item.facilityName} > ${item.rackCode} > ${item.shelfName} > ${item.boxName} > ${item.row}${item.col}`,
                            },
                        },
                    })

                    // Delete the existing sample
                    await tx.sample.delete({
                        where: { id: slot.sample.id },
                    })

                    overwritten++
                }

                // Create new sample
                const sample = await tx.sample.create({
                    data: {
                        name: item.name,
                        type: item.type,
                        batchNo: item.batchNo,
                        quantity: item.quantity,
                        unit: item.unit,
                        concentration: item.concentration,
                        viability: item.viability,
                        passage: item.passage,
                        media: item.media,
                        sterileCheck: item.sterileCheck,
                        owner: item.owner,
                        notes: item.notes,
                        slotId: slot.id,
                    },
                })

                // Update slot status
                await tx.slot.update({
                    where: { id: slot.id },
                    data: { status: SLOT_STATUS.OCCUPIED },
                })

                // Create audit log for creation
                await tx.auditLog.create({
                    data: {
                        action: 'CREATE',
                        userId,
                        sampleId: sample.id,
                        description: `通过 CSV 导入${isOccupied && mode === 'overwrite' ? '覆盖' : '创建'}样本 ${sample.name} 在 ${item.facilityName} > ${item.rackCode} > ${item.shelfName} > ${item.boxName} > ${item.row}${item.col}`,
                        newData: {
                            name: sample.name,
                            type: sample.type,
                            location: `${item.facilityName} > ${item.rackCode} > ${item.shelfName} > ${item.boxName} > ${item.row}${item.col}`,
                        },
                    },
                })
            })

            imported++
        } catch (error) {
            errors.push({
                row: rowNum,
                field: '',
                message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
            })
            skipped++
        }
    }

    return {
        success: errors.length === 0,
        imported,
        errors,
        skipped,
        overwritten,
    }
}

