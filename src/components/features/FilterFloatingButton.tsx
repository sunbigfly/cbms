'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterFloatingButtonProps {
    isActive: boolean
    matchCount?: number
    onClick: () => void
    onClear?: () => void
}

export function FilterFloatingButton({
    isActive,
    matchCount,
    onClick,
    onClear,
}: FilterFloatingButtonProps) {
    return (
        <TooltipProvider>
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
                {/* 清除按钮 - 仅在筛选激活时显示 */}
                {isActive && onClear && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 rounded-full shadow-lg bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onClear()
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>清除筛选</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* 主筛选按钮 */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            className={cn(
                                "h-12 w-12 rounded-full shadow-lg transition-all relative",
                                isActive
                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/30"
                                    : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                            )}
                            onClick={onClick}
                        >
                            <SlidersHorizontal className="h-5 w-5" />

                            {/* 匹配数量徽章 */}
                            {isActive && matchCount !== undefined && (
                                <Badge
                                    className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] font-semibold bg-white text-primary border-0 shadow-md"
                                >
                                    {matchCount > 999 ? '999+' : matchCount}
                                </Badge>
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>{isActive ? '编辑筛选' : '筛选样本'}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    )
}
