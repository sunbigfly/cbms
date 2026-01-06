'use client'

import { cn } from '@/lib/utils'

// 小型盒子预览组件
interface MiniBoxPreviewProps {
    rows: number
    cols: number
    selectedLabels: string[]     // 所有被选中的位置标签
    currentLabel?: string        // 当前正在编辑的位置标签（可选）
}

export function MiniBoxPreview({ rows, cols, selectedLabels, currentLabel }: MiniBoxPreviewProps) {
    const rowLabels = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i))
    const colLabels = Array.from({ length: cols }, (_, i) => i + 1)

    // 根据标签判断状态
    const getSlotStatus = (label: string) => {
        if (currentLabel && label === currentLabel) return 'current'
        if (selectedLabels.includes(label)) return 'selected'
        return 'empty'
    }

    return (
        <div className="border rounded-lg p-2 bg-muted/30 flex-shrink-0">
            <div className="text-[10px] text-muted-foreground text-center mb-1">
                {currentLabel ? '当前位置' : '选中位置'}
            </div>
            <div className="flex gap-0.5">
                {/* 行标签列 */}
                <div className="flex flex-col gap-0.5 pr-0.5">
                    <div className="w-3 h-3" /> {/* 空白角落 */}
                    {rowLabels.map(row => (
                        <div key={row} className="w-3 h-3 flex items-center justify-center text-[8px] text-muted-foreground font-medium">
                            {row}
                        </div>
                    ))}
                </div>
                {/* 网格 */}
                <div className="flex flex-col gap-0.5">
                    {/* 列标签行 */}
                    <div className="flex gap-0.5">
                        {colLabels.map(col => (
                            <div key={col} className="w-3 h-3 flex items-center justify-center text-[8px] text-muted-foreground font-medium">
                                {col}
                            </div>
                        ))}
                    </div>
                    {/* 槽位网格 */}
                    {rowLabels.map(row => (
                        <div key={row} className="flex gap-0.5">
                            {colLabels.map(col => {
                                const label = `${row}${col}`
                                const status = getSlotStatus(label)
                                return (
                                    <div
                                        key={label}
                                        className={cn(
                                            "w-3 h-3 rounded-sm transition-colors",
                                            status === 'current' && "bg-destructive ring-1 ring-destructive-foreground",
                                            status === 'selected' && "bg-primary/70",
                                            status === 'empty' && "bg-muted"
                                        )}
                                        title={label}
                                    />
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
