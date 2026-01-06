// Audit Logs API
// GET /api/audit - Get audit logs with optional filters
// DELETE /api/audit - Delete audit logs (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: '未授权' }, { status: 401 })
        }

        const userId = session.user.id
        const isAdmin = session.user.role === 'ADMIN'

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const action = searchParams.get('action') || ''
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const libraryMode = searchParams.get('libraryMode') || 'public' // 'public' | 'private' | 'all'

        // 首先获取所有日志，然后根据权限过滤
        // 因为需要检查样本所属的库是公共还是私有
        const baseWhere: {
            OR?: Array<{ description?: { contains: string; mode: 'insensitive' }; sample?: { name?: { contains: string; mode: 'insensitive' } }; user?: { name?: { contains: string; mode: 'insensitive' } } }>
            action?: string
        } = {}

        if (search) {
            baseWhere.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { sample: { name: { contains: search, mode: 'insensitive' } } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
            ]
        }

        if (action) {
            baseWhere.action = action
        }

        // 获取所有日志并包含样本的库信息
        const allLogs = await prisma.auditLog.findMany({
            where: baseWhere,
            include: {
                user: { select: { name: true } },
                sample: {
                    select: {
                        name: true,
                        slot: {
                            select: {
                                box: {
                                    select: {
                                        shelf: {
                                            select: {
                                                rack: {
                                                    select: {
                                                        facility: {
                                                            select: {
                                                                id: true,
                                                                isPrivate: true,
                                                                ownerId: true,
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
                },
            },
            orderBy: { timestamp: 'desc' },
        })

        // 根据权限过滤日志
        const filteredLogs = allLogs.filter(log => {
            // 获取样本所属的库信息
            const facility = log.sample?.slot?.box?.shelf?.rack?.facility

            // 如果样本已删除，检查 previousData 中的库信息
            let facilityInfo = facility
            if (!facility && log.previousData) {
                const prevData = log.previousData as Record<string, unknown>
                // 从 previousData 中获取库信息（如果有）
                if (prevData.facilityId && prevData.isPrivate !== undefined && prevData.ownerId !== undefined) {
                    facilityInfo = {
                        id: prevData.facilityId as string,
                        isPrivate: prevData.isPrivate as boolean,
                        ownerId: prevData.ownerId as string | null,
                    }
                }
            }

            // 如果没有库信息，默认为公共记录（允许所有人查看）
            if (!facilityInfo) {
                return libraryMode === 'public' || libraryMode === 'all'
            }

            // 公共库记录
            if (!facilityInfo.isPrivate) {
                return libraryMode === 'public' || libraryMode === 'all'
            }

            // 私有库记录
            if (facilityInfo.isPrivate) {
                // 管理员可以在 private 或 all 模式下查看所有私有库
                if (isAdmin) {
                    return libraryMode === 'private' || libraryMode === 'all'
                }
                // 非管理员只能查看自己的私有库
                if (facilityInfo.ownerId === userId) {
                    return libraryMode === 'private' || libraryMode === 'all'
                }
                // 其他人不能看到私有库记录
                return false
            }

            return true
        })

        // 分页
        const total = filteredLogs.length
        const paginatedLogs = limit > 0
            ? filteredLogs.slice(offset, offset + limit)
            : filteredLogs

        return NextResponse.json({
            logs: paginatedLogs.map(log => {
                // 当样本已被删除时（如出库操作），从 previousData 中获取样本名称
                let sampleName = log.sample?.name
                if (!sampleName && log.previousData) {
                    const prevData = log.previousData as Record<string, unknown>
                    if (prevData.name && typeof prevData.name === 'string') {
                        sampleName = prevData.name
                    }
                }
                return {
                    id: log.id,
                    action: log.action,
                    sample: sampleName || 'Unknown',
                    user: log.user?.name || 'System',
                    description: log.description,
                    timestamp: log.timestamp,
                    previousData: log.previousData,
                    newData: log.newData,
                }
            }),
            total,
            limit,
            offset,
            isAdmin,
        })
    } catch (error) {
        console.error('Error fetching audit logs:', error)
        return NextResponse.json(
            { error: '获取审计日志失败' },
            { status: 500 }
        )
    }
}

// DELETE /api/audit - 批量删除审计日志（仅管理员）
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: '未授权' }, { status: 401 })
        }

        const isAdmin = session.user.role === 'ADMIN'
        if (!isAdmin) {
            return NextResponse.json({ error: '权限不足，仅管理员可删除' }, { status: 403 })
        }

        const body = await request.json()
        const { ids } = body as { ids: string[] }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: '请提供要删除的日志 ID' }, { status: 400 })
        }

        const result = await prisma.auditLog.deleteMany({
            where: {
                id: { in: ids }
            }
        })

        return NextResponse.json({
            success: true,
            deletedCount: result.count,
            message: `成功删除 ${result.count} 条记录`
        })
    } catch (error) {
        console.error('Error deleting audit logs:', error)
        return NextResponse.json(
            { error: '删除审计日志失败' },
            { status: 500 }
        )
    }
}
