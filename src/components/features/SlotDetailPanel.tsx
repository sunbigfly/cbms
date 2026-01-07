'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Beaker, Calendar, User, FlaskConical, Hash, Droplet, FlaskRound, TestTube2, ShieldCheck, Clock } from 'lucide-react'

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
    sterileCheck?: string
    slotId?: string
    slotPosition?: string
    updatedAt?: string | Date
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
                        <p className="text-sm">选择单个已占用孔位</p>
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
            <CardContent className="space-y-4 text-[80%]">
                {/* Sample Name & Type */}
                <div>
                    <h3 className="font-semibold text-lg">{sample.name}</h3>
                    <p className="text-sm text-muted-foreground">{sample.type}</p>
                </div>

                {/* Batch Group Warning - only show if there are OTHER same-batch samples */}
                {batchGroupCount > 1 && (
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

                {/* 所有字段列表式排列 */}
                <div className="space-y-2 text-sm">
                    {sample.batchNo && (
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Hash className="h-4 w-4" />
                                <span>批次号</span>
                            </div>
                            <span className="font-medium">{sample.batchNo}</span>
                        </div>
                    )}
                    {sample.passage && (
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>代次</span>
                            </div>
                            <span className="font-medium">{sample.passage}</span>
                        </div>
                    )}
                    {viabilityPercent !== null && (
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FlaskConical className="h-4 w-4" />
                                <span>活性</span>
                            </div>
                            <span className="font-medium">{viabilityPercent}%</span>
                        </div>
                    )}
                    {sample.quantity !== undefined && sample.unit && (
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Droplet className="h-4 w-4" />
                                <span>体积</span>
                            </div>
                            <span className="font-medium">{sample.quantity} {sample.unit}</span>
                        </div>
                    )}
                    {sample.concentration && (
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FlaskRound className="h-4 w-4" />
                                <span>浓度</span>
                            </div>
                            <span className="font-medium">{sample.concentration}</span>
                        </div>
                    )}
                    {sample.media && (
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <TestTube2 className="h-4 w-4" />
                                <span>冻存液</span>
                            </div>
                            <span className="font-medium text-right max-w-[120px]">{sample.media}</span>
                        </div>
                    )}
                    {sample.sterileCheck && (
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <ShieldCheck className="h-4 w-4" />
                                <span>无菌验证</span>
                            </div>
                            <span className="font-medium">{sample.sterileCheck}</span>
                        </div>
                    )}
                    {sample.owner && (
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>负责人</span>
                            </div>
                            <span className="font-medium">{sample.owner}</span>
                        </div>
                    )}
                    {sample.updatedAt && (
                        <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>更新时间</span>
                            </div>
                            <span className="font-medium">
                                {new Date(sample.updatedAt).toLocaleString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </span>
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
