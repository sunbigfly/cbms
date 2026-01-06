'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { MiniBoxPreview } from './MiniBoxPreview'

interface SampleInfo {
    id: string
    name: string
    type: string
    slotPosition?: string
}

interface BatchCheckOutDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sampleIds: string[]
    samples?: SampleInfo[]
    slotLabels?: string[]      // 位置标签
    boxRows?: number           // 盒子行数
    boxCols?: number           // 盒子列数
    onSuccess?: () => void
}

type CheckOutReason = 'EXPERIMENT' | 'DESTROY' | 'TRANSFER'

const REASON_LABELS: Record<CheckOutReason, string> = {
    EXPERIMENT: '实验使用',
    DESTROY: '销毁处理',
    TRANSFER: '转移出库',
}

export function BatchCheckOutDialog({
    open,
    onOpenChange,
    sampleIds,
    samples = [],
    slotLabels = [],
    boxRows = 9,
    boxCols = 9,
    onSuccess
}: BatchCheckOutDialogProps) {
    const [loading, setLoading] = useState(false)
    const [reason, setReason] = useState<CheckOutReason>('EXPERIMENT')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)

    // Load sample info if not provided
    const [loadedSamples, setLoadedSamples] = useState<SampleInfo[]>([])

    // Only update loadedSamples when sampleIds actually changes (not on every render)
    const sampleIdsKey = sampleIds.join(',')

    useEffect(() => {
        let isMounted = true

        if (open && samples.length === 0 && sampleIds.length > 0) {
            setLoading(true)
            fetch(`/api/samples?ids=${sampleIds.join(',')}`)
                .then(res => res.json())
                .then(data => {
                    if (isMounted) {
                        if (Array.isArray(data)) {
                            // Map API response to SampleInfo format
                            const fetchedSamples = data.map((s: any) => ({
                                id: s.id,
                                name: s.name || '未命名样本',
                                type: s.type || '未知类型',
                                slotPosition: s.slot ? `${s.slot.rowLabel}${s.slot.colLabel}` : undefined
                            }))
                            setLoadedSamples(fetchedSamples)
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch sample details:', err)
                    // Fallback to basic info if fetch fails
                    if (isMounted) {
                        setLoadedSamples(sampleIds.map(id => ({
                            id,
                            name: `样本 ${id.slice(-4)}`,
                            type: '未知'
                        })))
                    }
                })
                .finally(() => {
                    if (isMounted) setLoading(false)
                })
        }

        // Reset when dialog closes
        if (!open) {
            setLoadedSamples([])
        }

        return () => {
            isMounted = false
        }
    }, [open, sampleIdsKey]) // Use sampleIdsKey instead of samples/sampleIds to avoid loops

    const displaySamples = samples.length > 0 ? samples : loadedSamples
    const isBatch = sampleIds.length > 1

    const handleSubmit = () => {
        // Show confirmation dialog for batch operations
        setShowConfirm(true)
    }

    const handleConfirmedSubmit = async () => {
        setShowConfirm(false)
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/samples/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sampleIds,
                    reason,
                    notes,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || '出库失败')
                throw new Error(errorMessage)
            }

            onSuccess?.()
            onOpenChange(false)
            setNotes('')
            setReason('EXPERIMENT')
        } catch (err) {
            setError(err instanceof Error ? err.message : '出库失败')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (!loading) {
            onOpenChange(false)
            setNotes('')
            setError(null)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            {isBatch ? `批量出库 (${sampleIds.length} 个样本)` : '样本出库'}
                        </DialogTitle>
                        <DialogDescription>
                            此操作将从存储位置移除样本，操作不可撤销
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {/* 盒子预览和样本列表 */}
                    <div className="flex gap-3">
                        {/* 小型盒子预览 */}
                        {boxRows > 0 && boxCols > 0 && slotLabels.length > 0 && (
                            <MiniBoxPreview
                                rows={boxRows}
                                cols={boxCols}
                                selectedLabels={slotLabels}
                            />
                        )}

                        {/* Sample preview */}
                        {displaySamples.length > 0 && (
                            <div className="flex-1 max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-2">
                                <div className="text-xs text-muted-foreground mb-1">即将出库的样本：</div>
                                <div className="space-y-1">
                                    {displaySamples.map((sample, index) => (
                                        <div key={sample.id} className="text-[10px] flex items-center gap-1.5">
                                            {slotLabels[index] && (
                                                <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1 py-0.5 rounded">
                                                    {slotLabels[index]}
                                                </span>
                                            )}
                                            <span className="font-medium">{sample.name}</span>
                                            <span className="text-muted-foreground">{sample.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">出库原因 *</Label>
                            <Select value={reason} onValueChange={(v) => setReason(v as CheckOutReason)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(REASON_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">备注</Label>
                            <Textarea
                                id="notes"
                                placeholder="出库相关备注..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose} disabled={loading}>
                            取消
                        </Button>
                        <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            确认出库
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认出库操作</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-sm text-muted-foreground">
                                您确定要出库 {sampleIds.length} 个样本吗？此操作将：
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>清空对应槽位</li>
                                    <li>记录出库日志</li>
                                    <li>此操作<strong>不可撤销</strong></li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleConfirmedSubmit}
                        >
                            确认出库
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
