'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Beaker, Calendar, User, FlaskConical, Hash } from 'lucide-react'

export interface SampleDetail {
    id: string
    name: string
    type: string
    batchNo?: string
    quantity?: number
    unit?: string
    concentration?: string
    viability?: number
    passage?: string
    media?: string
    owner?: string
    notes?: string
    slotId?: string
    slotPosition?: string
}

export interface SlotDetailPanelProps {
    sample: SampleDetail | null
    slotPosition?: string
    batchGroupCount?: number
    onViewBatchGroup?: () => void
}

export function SlotDetailPanel({
    sample,
    slotPosition,
    batchGroupCount = 0,
}: SlotDetailPanelProps) {
    if (!sample) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        样本详情
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <Beaker className="h-12 w-12 mb-3 opacity-20" />
                        <p className="text-sm">选择单个已占用槽位</p>
                        <p className="text-xs mt-1">查看样本详细信息</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const viabilityPercent = sample.viability ? Math.round(sample.viability * 100) : null

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">样本详情</CardTitle>
                    {slotPosition && (
                        <Badge variant="outline" className="text-xs">
                            位置 {slotPosition}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Sample Name & Type */}
                <div>
                    <h3 className="font-semibold text-lg">{sample.name}</h3>
                    <p className="text-sm text-muted-foreground">{sample.type}</p>
                </div>

                {/* Batch Group Warning */}
                {batchGroupCount > 0 && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md text-sm">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-red-700 dark:text-red-300">
                                同批次样本 ({batchGroupCount})
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                格子中红色边框为同批次入库的细胞
                            </p>
                        </div>
                    </div>
                )}

                <Separator />

                {/* Key Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {sample.batchNo && (
                        <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">批次号</p>
                                <p className="font-medium">{sample.batchNo}</p>
                            </div>
                        </div>
                    )}
                    {sample.passage && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">代次</p>
                                <p className="font-medium">{sample.passage}</p>
                            </div>
                        </div>
                    )}
                    {sample.owner && (
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">负责人</p>
                                <p className="font-medium">{sample.owner}</p>
                            </div>
                        </div>
                    )}
                    {viabilityPercent !== null && (
                        <div className="flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">活力</p>
                                <p className="font-medium">{viabilityPercent}%</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Additional Info */}
                <div className="space-y-2 text-sm">
                    {sample.quantity !== undefined && sample.unit && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">体积</span>
                            <span>{sample.quantity} {sample.unit}</span>
                        </div>
                    )}
                    {sample.concentration && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">浓度</span>
                            <span>{sample.concentration}</span>
                        </div>
                    )}
                    {sample.media && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">培养基</span>
                            <span className="truncate max-w-[120px]">{sample.media}</span>
                        </div>
                    )}
                </div>

                {/* Notes */}
                {sample.notes && (
                    <>
                        <Separator />
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">备注</p>
                            <p className="text-sm whitespace-pre-wrap">{sample.notes}</p>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
