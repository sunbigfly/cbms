'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
    Search,
    X,
    ChevronDown,
    ChevronUp,
    Calendar,
    Hash,
    Type,
    Percent,
    FlaskConical,
    Regex,
    Filter as FilterIcon,
    Loader2,
} from 'lucide-react'

// ============================================
// Types
// ============================================

export interface FilterCondition {
    field: string
    type: 'text' | 'number' | 'date' | 'boolean' | 'passage'
    mode: 'exact' | 'advanced' | 'range' | 'compare'
    values?: string[]
    pattern?: string
    isRegex?: boolean
    min?: number | string
    max?: number | string
    operator?: '>=' | '<=' | '=' | 'range'
    includeEmpty?: boolean
    onlyEmpty?: boolean
}

export interface FilterState {
    scope: 'all' | 'facility' | 'rack'
    scopeId?: string
    conditions: FilterCondition[]
    isActive: boolean
}

export interface FilterResult {
    totalMatched: number
    matchedSampleIds: string[]
    facilities: {
        id: string
        name: string
        matchCount: number
        racks: {
            id: string
            name: string
            matchCount: number
            boxes: {
                id: string
                name: string
                matchCount: number
                matchedSlotIds: string[]
            }[]
        }[]
    }[]
}

interface SampleFilterDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onApply: (filter: FilterState, result: FilterResult) => void
    onClear: () => void
    currentFilter?: FilterState
    libraryMode: 'public' | 'private'
    currentFacilityId?: string
    currentFacilityName?: string
    currentRackId?: string
    currentRackName?: string
}

// 字段配置
const FIELD_CONFIG = [
    { field: 'name', label: '样本名称', type: 'text' as const, icon: Type, required: true },
    { field: 'type', label: '类型', type: 'text' as const, icon: FlaskConical, required: true },
    { field: 'batchNo', label: '批次号', type: 'text' as const, icon: Hash, required: false },
    { field: 'passage', label: '代次', type: 'passage' as const, icon: Calendar, required: false },
    { field: 'viability', label: '活性', type: 'number' as const, icon: Percent, required: false, unit: '%', range: [0, 100] },
    { field: 'quantity', label: '体积', type: 'number' as const, icon: FlaskConical, required: false, unit: 'mL' },
    { field: 'concentration', label: '浓度', type: 'number' as const, icon: FlaskConical, required: false, isScientific: true },
    { field: 'media', label: '冻存液', type: 'text' as const, icon: FlaskConical, required: false },
    { field: 'sterileCheck', label: '无菌验证', type: 'boolean' as const, icon: FlaskConical, required: false },
    { field: 'owner', label: '负责人', type: 'text' as const, icon: Type, required: true },
    { field: 'updatedAt', label: '更新时间', type: 'date' as const, icon: Calendar, required: true },
]

// ============================================
// Component
// ============================================

export function SampleFilterDialog({
    open,
    onOpenChange,
    onApply,
    onClear,
    currentFilter,
    libraryMode,
    currentFacilityId,
    currentFacilityName,
    currentRackId,
    currentRackName,
}: SampleFilterDialogProps) {
    // 状态
    const [scope, setScope] = useState<'all' | 'facility' | 'rack'>('all')
    const [conditions, setConditions] = useState<FilterCondition[]>([])
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
    const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({})
    const [loading, setLoading] = useState(false)
    const [filtering, setFiltering] = useState(false)

    // 加载唯一值
    const loadUniqueValues = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                libraryMode,
                scope,
                ...(scope === 'facility' && currentFacilityId ? { scopeId: currentFacilityId } : {}),
                ...(scope === 'rack' && currentRackId ? { scopeId: currentRackId } : {}),
            })
            const res = await fetch(`/api/samples/filter?${params}`)
            if (res.ok) {
                const data = await res.json()
                setUniqueValues(data.uniqueValues || {})
            }
        } catch (error) {
            console.error('Failed to load unique values:', error)
        } finally {
            setLoading(false)
        }
    }, [libraryMode, scope, currentFacilityId, currentRackId])

    // 初始化
    useEffect(() => {
        if (open) {
            loadUniqueValues()
            if (currentFilter) {
                setScope(currentFilter.scope)
                setConditions(currentFilter.conditions)
                setExpandedFields(new Set(currentFilter.conditions.map(c => c.field)))
            }
        }
    }, [open, loadUniqueValues, currentFilter])

    // 当 scope 变化时重新加载唯一值
    useEffect(() => {
        if (open) {
            loadUniqueValues()
        }
    }, [scope, open, loadUniqueValues])

    // 切换字段展开/折叠
    const toggleField = (field: string) => {
        const newExpanded = new Set(expandedFields)
        if (newExpanded.has(field)) {
            newExpanded.delete(field)
            // 移除该字段的条件
            setConditions(prev => prev.filter(c => c.field !== field))
        } else {
            newExpanded.add(field)
        }
        setExpandedFields(newExpanded)
    }

    // 更新条件
    const updateCondition = (field: string, updates: Partial<FilterCondition>) => {
        setConditions(prev => {
            const existing = prev.find(c => c.field === field)
            if (existing) {
                return prev.map(c => c.field === field ? { ...c, ...updates } : c)
            } else {
                const config = FIELD_CONFIG.find(f => f.field === field)
                return [...prev, {
                    field,
                    type: config?.type || 'text',
                    mode: 'exact',
                    ...updates
                }]
            }
        })
    }

    // 获取条件
    const getCondition = (field: string): FilterCondition | undefined => {
        return conditions.find(c => c.field === field)
    }

    // 应用筛选
    const handleApply = async () => {
        const activeConditions = conditions.filter(c => {
            if (c.mode === 'exact' && c.values?.length) return true
            if (c.mode === 'advanced' && c.pattern) return true
            if (c.mode === 'range' && (c.min !== undefined || c.max !== undefined)) return true
            if (c.mode === 'compare' && c.min !== undefined) return true
            if (c.onlyEmpty) return true
            return false
        })

        if (activeConditions.length === 0) {
            onClear()
            onOpenChange(false)
            return
        }

        setFiltering(true)
        try {
            const res = await fetch('/api/samples/filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scope,
                    scopeId: scope === 'facility' ? currentFacilityId : scope === 'rack' ? currentRackId : undefined,
                    conditions: activeConditions,
                    libraryMode,
                })
            })

            if (res.ok) {
                const result: FilterResult = await res.json()
                onApply({
                    scope,
                    scopeId: scope === 'facility' ? currentFacilityId : scope === 'rack' ? currentRackId : undefined,
                    conditions: activeConditions,
                    isActive: true,
                }, result)
                onOpenChange(false)
            }
        } catch (error) {
            console.error('Filter failed:', error)
        } finally {
            setFiltering(false)
        }
    }

    // 清除所有
    const handleClear = () => {
        setConditions([])
        setExpandedFields(new Set())
        onClear()
    }

    // 渲染文本字段筛选器
    const renderTextFilter = (field: string, options: string[]) => {
        const condition = getCondition(field)
        const mode = condition?.mode || 'exact'

        return (
            <div className="space-y-2">
                {/* 模式切换 */}
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant={mode === 'exact' ? 'default' : 'outline'}
                        onClick={() => updateCondition(field, { mode: 'exact', pattern: undefined })}
                        className="text-xs h-7"
                    >
                        精确匹配
                    </Button>
                    <Button
                        size="sm"
                        variant={mode === 'advanced' ? 'default' : 'outline'}
                        onClick={() => updateCondition(field, { mode: 'advanced', values: undefined })}
                        className="text-xs h-7"
                    >
                        <Regex className="h-3 w-3 mr-1" />
                        高级匹配
                    </Button>
                </div>

                {mode === 'exact' ? (
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {options.map(opt => (
                            <Badge
                                key={opt}
                                variant={condition?.values?.includes(opt) ? 'default' : 'outline'}
                                className="cursor-pointer text-xs"
                                onClick={() => {
                                    const current = condition?.values || []
                                    const newValues = current.includes(opt)
                                        ? current.filter(v => v !== opt)
                                        : [...current, opt]
                                    updateCondition(field, { values: newValues })
                                }}
                            >
                                {opt}
                            </Badge>
                        ))}
                        {options.length === 0 && (
                            <span className="text-xs text-muted-foreground">无可用选项</span>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Input
                            placeholder="输入匹配模式 (支持 * 和 ?)"
                            value={condition?.pattern || ''}
                            onChange={e => updateCondition(field, { pattern: e.target.value })}
                            className="h-8 text-sm"
                        />
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id={`${field}-regex`}
                                checked={condition?.isRegex || false}
                                onCheckedChange={checked => updateCondition(field, { isRegex: !!checked })}
                            />
                            <Label htmlFor={`${field}-regex`} className="text-xs text-muted-foreground">
                                使用正则表达式
                            </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            通配符: * 匹配任意字符, ? 匹配单个字符
                        </p>
                    </div>
                )}
            </div>
        )
    }

    // 渲染数值字段筛选器
    const renderNumberFilter = (field: string, config: typeof FIELD_CONFIG[number]) => {
        const condition = getCondition(field)
        const operator = condition?.operator || 'range'

        return (
            <div className="space-y-2">
                {/* 操作符选择 */}
                <div className="flex gap-2">
                    {['range', '>=', '<=', '='].map(op => (
                        <Button
                            key={op}
                            size="sm"
                            variant={operator === op ? 'default' : 'outline'}
                            onClick={() => updateCondition(field, { operator: op as FilterCondition['operator'], mode: op === 'range' ? 'range' : 'compare' })}
                            className="text-xs h-7"
                        >
                            {op === 'range' ? '范围' : op}
                        </Button>
                    ))}
                </div>

                {/* 输入框 */}
                <div className="flex items-center gap-2">
                    {operator === 'range' ? (
                        <>
                            <Input
                                type={config.isScientific ? 'text' : 'number'}
                                placeholder="最小值"
                                value={condition?.min ?? ''}
                                onChange={e => updateCondition(field, { min: e.target.value })}
                                className="h-8 text-sm flex-1"
                            />
                            <span className="text-muted-foreground">~</span>
                            <Input
                                type={config.isScientific ? 'text' : 'number'}
                                placeholder="最大值"
                                value={condition?.max ?? ''}
                                onChange={e => updateCondition(field, { max: e.target.value })}
                                className="h-8 text-sm flex-1"
                            />
                        </>
                    ) : (
                        <Input
                            type={config.isScientific ? 'text' : 'number'}
                            placeholder="输入值"
                            value={condition?.min ?? ''}
                            onChange={e => updateCondition(field, { min: e.target.value })}
                            className="h-8 text-sm flex-1"
                        />
                    )}
                    {config.unit && <span className="text-sm text-muted-foreground">{config.unit}</span>}
                </div>

                {config.isScientific && (
                    <p className="text-xs text-muted-foreground">
                        支持格式: 2e7, 2×10^7, 2x10^7
                    </p>
                )}
            </div>
        )
    }

    // 渲染代次字段筛选器
    const renderPassageFilter = (field: string, options: string[]) => {
        const condition = getCondition(field)
        const mode = condition?.mode || 'exact'
        const operator = condition?.operator || 'range'

        return (
            <div className="space-y-2">
                {/* 模式切换 */}
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant={mode === 'exact' ? 'default' : 'outline'}
                        onClick={() => updateCondition(field, { mode: 'exact' })}
                        className="text-xs h-7"
                    >
                        精确选择
                    </Button>
                    <Button
                        size="sm"
                        variant={mode === 'range' || mode === 'compare' ? 'default' : 'outline'}
                        onClick={() => updateCondition(field, { mode: 'range', operator: 'range' })}
                        className="text-xs h-7"
                    >
                        范围
                    </Button>
                </div>

                {mode === 'exact' ? (
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {options.map(opt => (
                            <Badge
                                key={opt}
                                variant={condition?.values?.includes(opt) ? 'default' : 'outline'}
                                className="cursor-pointer text-xs"
                                onClick={() => {
                                    const current = condition?.values || []
                                    const newValues = current.includes(opt)
                                        ? current.filter(v => v !== opt)
                                        : [...current, opt]
                                    updateCondition(field, { values: newValues })
                                }}
                            >
                                {opt}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            {['range', '>=', '<='].map(op => (
                                <Button
                                    key={op}
                                    size="sm"
                                    variant={operator === op ? 'default' : 'outline'}
                                    onClick={() => updateCondition(field, { operator: op as FilterCondition['operator'] })}
                                    className="text-xs h-7"
                                >
                                    {op === 'range' ? '范围' : op}
                                </Button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">P</span>
                            {operator === 'range' ? (
                                <>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={condition?.min ?? ''}
                                        onChange={e => updateCondition(field, { min: e.target.value })}
                                        className="h-8 text-sm w-20"
                                    />
                                    <span className="text-muted-foreground">~ P</span>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="30"
                                        value={condition?.max ?? ''}
                                        onChange={e => updateCondition(field, { max: e.target.value })}
                                        className="h-8 text-sm w-20"
                                    />
                                </>
                            ) : (
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={condition?.min ?? ''}
                                    onChange={e => updateCondition(field, { min: e.target.value })}
                                    className="h-8 text-sm w-20"
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // 渲染日期字段筛选器
    const renderDateFilter = (field: string) => {
        const condition = getCondition(field)
        const operator = condition?.operator || 'range'

        return (
            <div className="space-y-2">
                {/* 操作符选择 */}
                <div className="flex gap-2 flex-wrap">
                    {[
                        { op: 'range', label: '范围' },
                        { op: '=', label: '等于' },
                        { op: '>=', label: '之后' },
                        { op: '<=', label: '之前' },
                    ].map(({ op, label }) => (
                        <Button
                            key={op}
                            size="sm"
                            variant={operator === op ? 'default' : 'outline'}
                            onClick={() => updateCondition(field, { operator: op as FilterCondition['operator'], mode: op === 'range' ? 'range' : 'compare' })}
                            className="text-xs h-7"
                        >
                            {label}
                        </Button>
                    ))}
                </div>

                {/* 日期选择器 */}
                <div className="flex items-center gap-2">
                    {operator === 'range' ? (
                        <>
                            <Input
                                type="date"
                                value={condition?.min ? String(condition.min) : ''}
                                onChange={e => updateCondition(field, { min: e.target.value })}
                                className="h-8 text-sm flex-1"
                            />
                            <span className="text-muted-foreground">~</span>
                            <Input
                                type="date"
                                value={condition?.max ? String(condition.max) : ''}
                                onChange={e => updateCondition(field, { max: e.target.value })}
                                className="h-8 text-sm flex-1"
                            />
                        </>
                    ) : (
                        <Input
                            type="date"
                            value={condition?.min ? String(condition.min) : ''}
                            onChange={e => updateCondition(field, { min: e.target.value })}
                            className="h-8 text-sm"
                        />
                    )}
                </div>
            </div>
        )
    }

    // 渲染布尔字段筛选器
    const renderBooleanFilter = (field: string) => {
        const condition = getCondition(field)
        const values = condition?.values || []

        return (
            <div className="flex gap-2">
                {['是', '否'].map(opt => (
                    <Badge
                        key={opt}
                        variant={values.includes(opt) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                            const newValues = values.includes(opt)
                                ? values.filter(v => v !== opt)
                                : [...values, opt]
                            updateCondition(field, { values: newValues, mode: 'exact' })
                        }}
                    >
                        {opt}
                    </Badge>
                ))}
            </div>
        )
    }

    // 渲染字段筛选区
    const renderFieldFilter = (config: typeof FIELD_CONFIG[number]) => {
        const { field, type } = config
        const isExpanded = expandedFields.has(field)
        const condition = getCondition(field)
        const hasCondition = condition && (
            (condition.values?.length ?? 0) > 0 ||
            condition.pattern ||
            condition.min !== undefined ||
            condition.max !== undefined ||
            condition.onlyEmpty
        )

        return (
            <div key={field} className="border rounded-lg overflow-hidden">
                {/* 字段头部 */}
                <button
                    onClick={() => toggleField(field)}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
                        isExpanded && "bg-muted/30"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{config.label}</span>
                        {hasCondition && (
                            <Badge variant="secondary" className="text-xs">
                                已设置
                            </Badge>
                        )}
                        {!config.required && (
                            <span className="text-xs text-muted-foreground">(可空)</span>
                        )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {/* 展开内容 */}
                {isExpanded && (
                    <div className="px-3 py-3 border-t bg-muted/10 space-y-3">
                        {/* 空值筛选（仅非必填字段） */}
                        {!config.required && (
                            <div className="flex items-center gap-4 pb-2 border-b">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={`${field}-only-empty`}
                                        checked={condition?.onlyEmpty || false}
                                        onCheckedChange={checked => updateCondition(field, {
                                            onlyEmpty: !!checked,
                                            includeEmpty: false
                                        })}
                                    />
                                    <Label htmlFor={`${field}-only-empty`} className="text-xs">仅显示空值</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={`${field}-include-empty`}
                                        checked={condition?.includeEmpty || false}
                                        disabled={condition?.onlyEmpty}
                                        onCheckedChange={checked => updateCondition(field, { includeEmpty: !!checked })}
                                    />
                                    <Label htmlFor={`${field}-include-empty`} className="text-xs">包含空值</Label>
                                </div>
                            </div>
                        )}

                        {/* 根据类型渲染筛选器 */}
                        {!condition?.onlyEmpty && (
                            <>
                                {type === 'text' && renderTextFilter(field, uniqueValues[field] || [])}
                                {type === 'number' && renderNumberFilter(field, config)}
                                {type === 'passage' && renderPassageFilter(field, uniqueValues[field] || [])}
                                {type === 'date' && renderDateFilter(field)}
                                {type === 'boolean' && renderBooleanFilter(field)}
                            </>
                        )}
                    </div>
                )}
            </div>
        )
    }

    const activeConditionCount = conditions.filter(c => {
        if (c.mode === 'exact' && c.values?.length) return true
        if (c.mode === 'advanced' && c.pattern) return true
        if (c.mode === 'range' && (c.min !== undefined || c.max !== undefined)) return true
        if (c.mode === 'compare' && c.min !== undefined) return true
        if (c.onlyEmpty) return true
        return false
    }).length

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="flex items-center gap-3 text-lg">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                            <FilterIcon className="h-4 w-4" />
                        </div>
                        <span className="text-foreground">样本筛选</span>
                        {activeConditionCount > 0 && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                                {activeConditionCount} 个条件
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* 范围选择 */}
                <div className="flex items-center gap-3 py-2 border-b">
                    <Label className="text-sm whitespace-nowrap">筛选范围:</Label>
                    <Select value={scope} onValueChange={(v: 'all' | 'facility' | 'rack') => setScope(v)}>
                        <SelectTrigger className="w-48 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全库</SelectItem>
                            {currentFacilityId && (
                                <SelectItem value="facility">当前设施: {currentFacilityName}</SelectItem>
                            )}
                            {currentRackId && (
                                <SelectItem value="rack">当前架子: {currentRackName}</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                {/* 筛选条件列表 - 使用固定高度和原生滚动 */}
                <div className="flex-1 overflow-y-auto pr-2 min-h-0" style={{ maxHeight: 'calc(80vh - 200px)' }}>
                    <div className="space-y-2 py-2">
                        {FIELD_CONFIG.map(config => renderFieldFilter(config))}
                    </div>
                </div>

                {/* 底部操作 */}
                <DialogFooter className="flex items-center justify-between sm:justify-between pt-4 border-t">
                    <Button
                        variant="ghost"
                        onClick={handleClear}
                        disabled={filtering}
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <X className="h-4 w-4 mr-1" />
                        清除全部
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={filtering}>
                            取消
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={filtering}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                        >
                            {filtering ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    筛选中...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-2" />
                                    应用筛选
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
