// Sample Filter API - Advanced filtering for samples
// POST /api/samples/filter - Filter samples with various conditions

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================
// Types
// ============================================

interface FilterCondition {
    field: string
    type: 'text' | 'number' | 'date' | 'boolean' | 'passage'
    mode: 'exact' | 'advanced' | 'range' | 'compare'

    // 精确匹配
    values?: string[]

    // 高级匹配
    pattern?: string
    isRegex?: boolean

    // 数值/日期范围
    min?: number | string
    max?: number | string
    operator?: '>=' | '<=' | '=' | 'range'

    // 空值筛选
    includeEmpty?: boolean
    onlyEmpty?: boolean
}

interface FilterRequest {
    scope: 'all' | 'facility' | 'rack'
    scopeId?: string
    conditions: FilterCondition[]
    libraryMode?: 'public' | 'private'
}

// ============================================
// Utility Functions
// ============================================

// 通配符转正则表达式
function wildcardToRegex(pattern: string): string {
    return pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
        .replace(/\*/g, '.*')                  // * -> .*
        .replace(/\?/g, '.')                   // ? -> .
}

// 解析科学计数法为数值
function parseScientificNotation(value: string): number | null {
    if (!value) return null

    // 处理各种格式: 2e7, 2E7, 2×10^7, 2x10^7, 2*10^7
    const normalized = value
        .replace(/×/g, 'x')
        .replace(/\^/g, '')
        .replace(/x10/gi, 'e')
        .replace(/\*10/gi, 'e')

    const num = parseFloat(normalized)
    return isNaN(num) ? null : num
}

// 解析代次为数值 (P0 -> 0, P10 -> 10)
function parsePassage(value: string): number | null {
    if (!value) return null
    const match = value.match(/^[Pp]?(\d+)$/)
    return match ? parseInt(match[1], 10) : null
}

// 检查值是否匹配条件
function matchesCondition(
    sampleValue: unknown,
    condition: FilterCondition
): boolean {
    const { field, type, mode, values, pattern, isRegex, min, max, operator, onlyEmpty, includeEmpty } = condition

    // 空值筛选
    const isEmpty = sampleValue === null || sampleValue === undefined || sampleValue === ''
    if (onlyEmpty) return isEmpty
    if (isEmpty && !includeEmpty) return false

    const strValue = String(sampleValue ?? '')

    switch (type) {
        case 'text': {
            if (mode === 'exact' && values?.length) {
                return values.includes(strValue)
            }
            if (mode === 'advanced' && pattern) {
                try {
                    const regex = isRegex
                        ? new RegExp(pattern, 'i')
                        : new RegExp(`^${wildcardToRegex(pattern)}$`, 'i')
                    return regex.test(strValue)
                } catch {
                    return false
                }
            }
            return true
        }

        case 'number': {
            let numValue: number | null = null

            // 浓度字段需要解析科学计数法
            if (field === 'concentration') {
                numValue = parseScientificNotation(strValue)
            } else if (field === 'viability') {
                // 活性是0-1的小数，UI显示为百分比
                numValue = typeof sampleValue === 'number' ? sampleValue * 100 : null
            } else if (field === 'quantity') {
                numValue = typeof sampleValue === 'number' ? sampleValue : parseFloat(strValue)
            } else {
                numValue = typeof sampleValue === 'number' ? sampleValue : parseFloat(strValue)
            }

            if (numValue === null || isNaN(numValue)) return false

            const minNum = min !== undefined ? (typeof min === 'number' ? min : parseFloat(String(min))) : null
            const maxNum = max !== undefined ? (typeof max === 'number' ? max : parseFloat(String(max))) : null

            // 如果 min/max 是科学计数法格式
            const parsedMin = minNum !== null && !isNaN(minNum) ? minNum : (min ? parseScientificNotation(String(min)) : null)
            const parsedMax = maxNum !== null && !isNaN(maxNum) ? maxNum : (max ? parseScientificNotation(String(max)) : null)

            switch (operator) {
                case '>=':
                    return parsedMin !== null ? numValue >= parsedMin : true
                case '<=':
                    return parsedMax !== null ? numValue <= parsedMax : true
                case '=':
                    return parsedMin !== null ? numValue === parsedMin : true
                case 'range':
                    return (parsedMin === null || numValue >= parsedMin) &&
                        (parsedMax === null || numValue <= parsedMax)
                default:
                    return true
            }
        }

        case 'passage': {
            const passageNum = parsePassage(strValue)
            if (passageNum === null) return false

            const minNum = min !== undefined ? parsePassage(String(min)) ?? parseInt(String(min), 10) : null
            const maxNum = max !== undefined ? parsePassage(String(max)) ?? parseInt(String(max), 10) : null

            switch (operator) {
                case '>=':
                    return minNum !== null ? passageNum >= minNum : true
                case '<=':
                    return maxNum !== null ? passageNum <= maxNum : true
                case '=':
                    return minNum !== null ? passageNum === minNum : true
                case 'range':
                    return (minNum === null || passageNum >= minNum) &&
                        (maxNum === null || passageNum <= maxNum)
                default:
                    if (mode === 'exact' && values?.length) {
                        return values.some(v => parsePassage(v) === passageNum)
                    }
                    return true
            }
        }

        case 'date': {
            const dateValue = sampleValue instanceof Date
                ? sampleValue
                : new Date(strValue)

            if (isNaN(dateValue.getTime())) return false

            // 只比较年月日
            const dateOnly = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate())

            const minDate = min ? new Date(String(min)) : null
            const maxDate = max ? new Date(String(max)) : null

            const minDateOnly = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null
            const maxDateOnly = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()) : null

            switch (operator) {
                case '>=':
                    return minDateOnly !== null ? dateOnly >= minDateOnly : true
                case '<=':
                    return maxDateOnly !== null ? dateOnly <= maxDateOnly : true
                case '=':
                    return minDateOnly !== null ? dateOnly.getTime() === minDateOnly.getTime() : true
                case 'range':
                    return (minDateOnly === null || dateOnly >= minDateOnly) &&
                        (maxDateOnly === null || dateOnly <= maxDateOnly)
                default:
                    return true
            }
        }

        case 'boolean': {
            if (mode === 'exact' && values?.length) {
                // values可能是 ['是'], ['否'], ['是', '否']
                return values.includes(strValue)
            }
            return true
        }

        default:
            return true
    }
}

// ============================================
// API Handler
// ============================================

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body: FilterRequest = await request.json()
        const { scope, scopeId, conditions, libraryMode } = body

        // 构建基础查询条件
        const whereClause: Record<string, unknown> = {}

        // 获取用户信息
        const isAdmin = session.user.role === 'ADMIN'
        const userId = session.user.id

        // 根据 libraryMode 过滤设施 (与 inventory API 保持一致)
        const isPrivate = libraryMode === 'private'
        const facilityWhere = isPrivate
            ? { isPrivate: true, ...(isAdmin ? {} : { ownerId: userId }) }
            : { isPrivate: false }

        // 根据 scope 限制查询范围
        if (scope === 'facility' && scopeId) {
            whereClause.slot = {
                box: {
                    shelf: {
                        rack: {
                            facilityId: scopeId,
                            facility: facilityWhere
                        }
                    }
                }
            }
        } else if (scope === 'rack' && scopeId) {
            whereClause.slot = {
                box: {
                    shelf: {
                        rackId: scopeId,
                        rack: {
                            facility: facilityWhere
                        }
                    }
                }
            }
        } else {
            // 全库
            whereClause.slot = {
                box: {
                    shelf: {
                        rack: {
                            facility: facilityWhere
                        }
                    }
                }
            }
        }

        // 获取所有符合范围的样本
        const samples = await prisma.sample.findMany({
            where: whereClause,
            include: {
                slot: {
                    include: {
                        box: {
                            include: {
                                shelf: {
                                    include: {
                                        rack: {
                                            include: {
                                                facility: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        // 应用筛选条件
        const matchedSamples = samples.filter(sample => {
            return conditions.every(condition => {
                const fieldValue = getFieldValue(sample, condition.field)
                return matchesCondition(fieldValue, condition)
            })
        })

        // 按层级聚合结果
        const facilitiesMap = new Map<string, {
            id: string
            name: string
            matchCount: number
            racks: Map<string, {
                id: string
                name: string
                matchCount: number
                boxes: Map<string, {
                    id: string
                    name: string
                    matchCount: number
                    matchedSlotIds: string[]
                }>
            }>
        }>()

        for (const sample of matchedSamples) {
            const slot = sample.slot
            const box = slot.box
            const shelf = box.shelf
            const rack = shelf.rack
            const facility = rack.facility

            // 设施层
            if (!facilitiesMap.has(facility.id)) {
                facilitiesMap.set(facility.id, {
                    id: facility.id,
                    name: facility.name,
                    matchCount: 0,
                    racks: new Map()
                })
            }
            const facilityData = facilitiesMap.get(facility.id)!
            facilityData.matchCount++

            // 架子层
            if (!facilityData.racks.has(rack.id)) {
                facilityData.racks.set(rack.id, {
                    id: rack.id,
                    name: rack.name,
                    matchCount: 0,
                    boxes: new Map()
                })
            }
            const rackData = facilityData.racks.get(rack.id)!
            rackData.matchCount++

            // 盒子层
            if (!rackData.boxes.has(box.id)) {
                rackData.boxes.set(box.id, {
                    id: box.id,
                    name: box.name,
                    matchCount: 0,
                    matchedSlotIds: []
                })
            }
            const boxData = rackData.boxes.get(box.id)!
            boxData.matchCount++
            boxData.matchedSlotIds.push(slot.id)
        }

        // 转换为数组格式
        const facilities = Array.from(facilitiesMap.values()).map(f => ({
            id: f.id,
            name: f.name,
            matchCount: f.matchCount,
            racks: Array.from(f.racks.values()).map(r => ({
                id: r.id,
                name: r.name,
                matchCount: r.matchCount,
                boxes: Array.from(r.boxes.values())
            }))
        }))

        return NextResponse.json({
            success: true,
            totalMatched: matchedSamples.length,
            matchedSampleIds: matchedSamples.map(s => s.id),
            facilities
        })

    } catch (error) {
        console.error('Filter API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// 获取样本字段值
function getFieldValue(sample: Record<string, unknown>, field: string): unknown {
    switch (field) {
        case 'name': return sample.name
        case 'type': return sample.type
        case 'batchNo': return sample.batchNo
        case 'passage': return sample.passage
        case 'viability': return sample.viability
        case 'quantity': return sample.quantity
        case 'concentration': return sample.concentration
        case 'media': return sample.media
        case 'sterileCheck': return sample.sterileCheck
        case 'owner': return sample.owner
        case 'updatedAt': return sample.updatedAt
        default: return sample[field]
    }
}

// GET: 获取所有字段的唯一值（用于下拉选项）
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const libraryMode = searchParams.get('libraryMode') || 'public'
        const scopeType = searchParams.get('scope') || 'all'
        const scopeId = searchParams.get('scopeId')

        // 构建查询条件
        const isPrivate = libraryMode === 'private'
        const isAdmin = session.user.role === 'ADMIN'
        const userId = session.user.id

        // 由于样本在嵌套关系中，我们需要使用 findMany 直接查询所有样本
        // 然后在客户端过滤（因为嵌套筛选在某些情况下可能不工作）
        // 改用更简单的方式: 直接查询所有样本
        const samples = await prisma.sample.findMany({
            select: {
                name: true,
                type: true,
                batchNo: true,
                passage: true,
                viability: true,
                quantity: true,
                concentration: true,
                media: true,
                sterileCheck: true,
                owner: true,
                slot: {
                    select: {
                        box: {
                            select: {
                                shelf: {
                                    select: {
                                        rack: {
                                            select: {
                                                id: true,
                                                facility: {
                                                    select: {
                                                        id: true,
                                                        isPrivate: true,
                                                        ownerId: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        // 先输出调试信息
        console.log(`Filter API GET: Total samples in DB: ${samples.length}`)
        if (samples.length > 0) {
            const sampleFacilities = samples.slice(0, 3).map(s => ({
                facility: s.slot?.box?.shelf?.rack?.facility,
                sampleName: s.name
            }))
            console.log('Sample facilities:', JSON.stringify(sampleFacilities, null, 2))
        }

        // 根据 libraryMode 和 scope 过滤样本
        const filteredSamples = samples.filter(sample => {
            const facility = sample.slot?.box?.shelf?.rack?.facility
            if (!facility) {
                console.log(`Sample ${sample.name} has no facility`)
                return false
            }

            // 检查 library mode (与 inventory API 保持一致)
            if (isPrivate) {
                // 私有库：设施必须是私有的
                if (!facility.isPrivate) {
                    return false
                }
                // 非管理员只能看自己的私有库
                if (!isAdmin && facility.ownerId !== userId) {
                    return false
                }
            } else {
                // 公共库：设施必须不是私有的
                if (facility.isPrivate) {
                    return false
                }
            }

            // 检查 scope
            if (scopeType === 'facility' && scopeId) {
                if (sample.slot?.box?.shelf?.rack?.facility?.id !== scopeId) return false
            } else if (scopeType === 'rack' && scopeId) {
                if (sample.slot?.box?.shelf?.rack?.id !== scopeId) return false
            }

            return true
        })

        // 提取每个字段的唯一值
        const uniqueValues = {
            name: [...new Set(filteredSamples.map(s => s.name).filter(Boolean))].sort(),
            type: [...new Set(filteredSamples.map(s => s.type).filter(Boolean))].sort(),
            batchNo: [...new Set(filteredSamples.map(s => s.batchNo).filter(Boolean))].sort() as string[],
            passage: [...new Set(filteredSamples.map(s => s.passage).filter(Boolean))].sort((a, b) => {
                const numA = parsePassage(a!) ?? 0
                const numB = parsePassage(b!) ?? 0
                return numA - numB
            }) as string[],
            concentration: [...new Set(filteredSamples.map(s => s.concentration).filter(Boolean))].sort(),
            media: [...new Set(filteredSamples.map(s => s.media).filter(Boolean))].sort() as string[],
            sterileCheck: [...new Set(filteredSamples.map(s => s.sterileCheck).filter(Boolean))].sort() as string[],
            owner: [...new Set(filteredSamples.map(s => s.owner).filter(Boolean))].sort(),
        }

        console.log(`Filter API GET: found ${filteredSamples.length} samples out of ${samples.length}, libraryMode=${libraryMode}, isPrivate=${isPrivate}, scope=${scopeType}, userId=${session.user.id}`)

        return NextResponse.json({
            success: true,
            uniqueValues,
            sampleCount: filteredSamples.length
        })

    } catch (error) {
        console.error('Get unique values error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
