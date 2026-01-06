'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
    Search,
    X,
    Check,
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
// Helper Components
// ============================================

const MultiSelect = ({
    options,
    selected = [],
    onChange,
    placeholder = "选择..."
}: {
    options: string[],
    selected?: string[],
    onChange: (values: string[]) => void,
    placeholder?: string
}) => {
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState(false)
    const filteredOptions = options.filter(opt =>
        opt?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    className="w-full min-h-10 border rounded-md px-3 py-2 flex flex-wrap gap-1 cursor-text bg-background hover:bg-accent/20 transition-colors"
                >
                    {selected.length === 0 && (
                        <span className="text-sm text-muted-foreground self-center">{placeholder}</span>
                    )}
                    {selected.map(val => (
                        <Badge key={val} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                            {val}
                            <button
                                className="ml-1 hover:text-red-500"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onChange(selected.filter(v => v !== val))
                                }}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <div className="flex flex-col max-h-[300px]">
                    <div className="flex items-center border-b px-3">
                        <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Input
                            placeholder="搜索选项..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="border-0 focus-visible:ring-0 shadow-none h-10"
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredOptions.length === 0 ? (
                            <p className="text-sm text-center py-6 text-muted-foreground">没有找到匹配项</p>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredOptions.map(opt => (
                                    <div
                                        key={opt}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent",
                                            selected.includes(opt) && "bg-accent"
                                        )}
                                        onClick={() => {
                                            const newSelected = selected.includes(opt)
                                                ? selected.filter(s => s !== opt)
                                                : [...selected, opt]
                                            onChange(newSelected)
                                        }}
                                    >
                                        <div className={cn(
                                            "h-4 w-4 border rounded-sm flex items-center justify-center",
                                            selected.includes(opt) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                                        )}>
                                            {selected.includes(opt) && <Check className="h-3 w-3" />}
                                        </div>
                                        <span>{opt}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

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
                conditions: JSON.stringify(conditions), // 传递当前筛选条件以获取级联结果
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
    }, [libraryMode, scope, currentFacilityId, currentRackId, conditions]) // 添加 conditions 依赖

    // 初始化：当对话框打开时，重置为传入的筛选条件
    useEffect(() => {
        if (open && currentFilter) {
            setScope(currentFilter.scope)
            setConditions(currentFilter.conditions)
        }
    }, [open]) // 仅在打开时执行初始化

    // 当依赖变化时（如筛选条件变化），自动加载唯一值
    useEffect(() => {
        if (open) {
            loadUniqueValues()
        }
    }, [open, loadUniqueValues])

    // 当 scope 变化时重新加载唯一值
    useEffect(() => {
        if (open) {
            loadUniqueValues()
        }
    }, [scope, open, loadUniqueValues])

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
                    <MultiSelect
                        options={options}
                        selected={condition?.values}
                        onChange={(values) => updateCondition(field, { values })}
                        placeholder="选择或搜索值..."
                    />
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
                    <MultiSelect
                        options={options}
                        selected={condition?.values}
                        onChange={(values) => updateCondition(field, { values })}
                        placeholder="选择或搜索代次..."
                    />
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
        const condition = getCondition(field)

        return (
            <div key={field} className="grid grid-cols-[120px_1fr] gap-4 items-start py-4 border-b last:border-0">
                {/* 左侧：标签 */}
                <div className="flex flex-col gap-1 pt-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <config.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{config.label}</span>
                    </div>
                    {!config.required && (
                        <div className="flex flex-col gap-1.5 mt-2 pl-6">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`${field}-only-empty`}
                                    checked={condition?.onlyEmpty || false}
                                    onCheckedChange={checked => updateCondition(field, {
                                        onlyEmpty: !!checked,
                                        includeEmpty: false
                                    })}
                                />
                                <Label htmlFor={`${field}-only-empty`} className="text-xs text-muted-foreground font-normal cursor-pointer">仅空值</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`${field}-include-empty`}
                                    checked={condition?.includeEmpty || false}
                                    disabled={condition?.onlyEmpty}
                                    onCheckedChange={checked => updateCondition(field, { includeEmpty: !!checked })}
                                />
                                <Label htmlFor={`${field}-include-empty`} className="text-xs text-muted-foreground font-normal cursor-pointer">含空值</Label>
                            </div>
                        </div>
                    )}
                </div>

                {/* 右侧：输入控件 */}
                <div className="flex-1 min-w-0">
                    {!condition?.onlyEmpty && (
                        <>
                            {type === 'text' && renderTextFilter(field, uniqueValues[field] || [])}
                            {type === 'number' && renderNumberFilter(field, config)}
                            {type === 'passage' && renderPassageFilter(field, uniqueValues[field] || [])}
                            {type === 'date' && renderDateFilter(field)}
                            {type === 'boolean' && renderBooleanFilter(field)}
                        </>
                    )}
                    {condition?.onlyEmpty && (
                        <div className="h-9 flex items-center text-sm text-muted-foreground italic">
                            已选择仅筛选空值
                        </div>
                    )}
                </div>
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
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
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
                <div className="flex items-center gap-3 py-3 border-b bg-muted/10 px-6 -mx-6">
                    <Label className="text-sm font-medium whitespace-nowrap">筛选范围:</Label>
                    <Select value={scope} onValueChange={(v: 'all' | 'facility' | 'rack') => setScope(v)}>
                        <SelectTrigger className="w-[200px] h-9 bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全库搜索</SelectItem>
                            {currentFacilityId && (
                                <SelectItem value="facility">仅当前设施 ({currentFacilityName})</SelectItem>
                            )}
                            {currentRackId && (
                                <SelectItem value="rack">仅当前架子 ({currentRackName})</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {loading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            正在加载选项...
                        </div>
                    )}
                </div>

                {/* 筛选条件列表 - Grid 布局 */}
                <div className="flex-1 overflow-y-auto pr-2 min-h-0" style={{ maxHeight: 'calc(80vh - 200px)' }}>
                    <div className="grid grid-cols-1 gap-0 py-2">
                        {FIELD_CONFIG.map(config => renderFieldFilter(config))}
                    </div>
                </div>

                {/* 底部操作 */}
                <DialogFooter className="flex items-center justify-between sm:justify-between pt-4 border-t">
                    <Button
                        variant="ghost"
                        onClick={handleClear}
                        disabled={filtering}
                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
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
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm min-w-[100px]"
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
