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
        if (open && samples.length === 0 && sampleIds.length > 0) {
            // TODO: Fetch sample details from API if needed
            setLoadedSamples(sampleIds.map(id => ({ id, name: `样本 ${id.slice(-4)}`, type: '未知' })))
        }
        // Reset when dialog closes
        if (!open) {
            setLoadedSamples([])
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
                    userId: 'system', // TODO: get from auth
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || '出库失败')
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

                    {/* Sample preview */}
                    {displaySamples.length > 0 && (
                        <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/30 p-2">
                            <div className="text-xs text-muted-foreground mb-1">即将出库的样本：</div>
                            <div className="space-y-1">
                                {displaySamples.slice(0, 5).map((sample) => (
                                    <div key={sample.id} className="text-sm flex justify-between">
                                        <span className="font-medium">{sample.name}</span>
                                        <span className="text-muted-foreground">{sample.type}</span>
                                    </div>
                                ))}
                                {displaySamples.length > 5 && (
                                    <div className="text-xs text-muted-foreground">
                                        ...还有 {displaySamples.length - 5} 个样本
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
