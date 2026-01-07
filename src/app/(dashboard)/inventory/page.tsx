'use client'

import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BatchCheckInDialog } from '@/components/features/BatchCheckInDialog'
import { BatchCheckOutDialog } from '@/components/features/BatchCheckOutDialog'
import { BatchEditDialog } from '@/components/features/BatchEditDialog'
import { SlotDetailPanel, SampleDetail } from '@/components/features/SlotDetailPanel'
import { LibrarySwitch, LibraryMode } from '@/components/features/LibrarySwitch'
import { CreateFacilityWizard } from '@/components/features/CreateFacilityWizard'
import { SampleFilterDialog, FilterState, FilterResult } from '@/components/features/SampleFilterDialog'
import { FilterFloatingButton } from '@/components/features/FilterFloatingButton'
import {
    ChevronRight,
    Plus,
    Loader2,
    Building2,
    LayoutGrid,
    Package,
    LogOut,
    Pencil,
} from 'lucide-react'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSlotSelection, SlotInfo, SelectionType } from '@/hooks/useSlotSelection'

// Cookie 常量
const LIBRARY_MODE_COOKIE = 'library_mode'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

// SessionStorage keys for persisting selection state
const STORAGE_KEY_FACILITY = 'inventory_selected_facility_id'
const STORAGE_KEY_RACK = 'inventory_selected_rack_id'
const STORAGE_KEY_BOX = 'inventory_selected_box_id'
const STORAGE_KEY_LEVEL = 'inventory_current_level'
const STORAGE_KEY_LIBRARY_MODE = 'inventory_library_mode'

// 从 cookie 读取 libraryMode 初始值
function getInitialLibraryMode(): LibraryMode {
    if (typeof document === 'undefined') return 'public'
    const match = document.cookie.match(new RegExp(`(^| )${LIBRARY_MODE_COOKIE}=([^;]+)`))
    const value = match ? match[2] : null
    return value === 'private' ? 'private' : 'public'
}

// 从 sessionStorage 读取初始导航级别
function getInitialLevel(): NavigationLevel {
    if (typeof sessionStorage === 'undefined') return 'facility'
    const saved = sessionStorage.getItem(STORAGE_KEY_LEVEL)
    if (saved === 'rack' || saved === 'box' || saved === 'facility') return saved
    return 'facility'
}

// Types
interface RackDetail {
    id: string
    name: string
    code: string
    occupancy: number
    total: number
    used: number
}

interface ShelfDetail {
    id: string
    name: string
    order: number
    occupancy: number
    total: number
    used: number
}

interface Facility {
    id: string
    name: string
    type: string
    capacity: number
    totalSlots: number
    usedSlots: number
    racks: number
    racksDetail?: RackDetail[]
}

interface Rack {
    id: string
    name: string
    code: string
    totalShelves: number
    shelves: ShelfDetail[]
    occupancy: number
    total: number
    used: number
}

interface BoxInfo {
    id: string
    name: string
    rows: number
    columns: number
    total: number
    occupied: number
}

interface Slot {
    id: string
    position: number
    rowLabel: string
    colLabel: string
    status: string
    sample?: {
        id: string
        name: string
        type: string
    } | null
}

// Extended sample with all fields for batch detection
interface ExtendedSample {
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
    updatedAt?: string | Date
}

interface BoxDetail {
    id: string
    name: string
    rows: number
    columns: number
    slots: Slot[]
}

// Utility: Get color based on occupancy
function getOccupancyColor(occupancy: number): string {
    if (occupancy === 0) return 'bg-gray-300'
    if (occupancy < 50) return 'bg-green-500'
    if (occupancy < 80) return 'bg-yellow-500'
    return 'bg-red-500'
}

// Progress Bar for children items
function ChildProgressBar({
    items,
    onItemClick
}: {
    items: { id: string; name: string; occupancy: number; total?: number; used?: number }[]
    onItemClick: (item: { id: string; name: string; occupancy: number; total?: number; used?: number }) => void
}) {
    if (!items || items.length === 0) return null

    return (
        <TooltipProvider>
            <div className="flex gap-1 mt-2">
                {items.map((item) => (
                    <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onItemClick(item)
                                }}
                                className={`flex-1 h-2 rounded-sm transition-all hover:scale-y-150 ${getOccupancyColor(item.occupancy)}`}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs">{item.used ?? '-'}/{item.total ?? '-'} 已用</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    )
}

// Box Grid Component with Selection Support
interface BoxGridProps {
    box: BoxDetail | null
    onCheckIn?: (slotIds: string[], slotLabels: string[]) => void
    onCheckOut?: (sampleIds: string[], slotLabels: string[]) => void
    onEdit?: (sampleIds: string[], slotLabels: string[]) => void
    onSampleSelect?: (sample: SlotInfo['sample'] | null, slotPosition: string, batchGroupSlotIds: string[]) => void
    filterMatchedSlotIds?: Set<string> // 筛选匹配的 slot IDs
}

function BoxGrid({ box, onCheckIn, onCheckOut, onEdit, onSampleSelect, filterMatchedSlotIds }: BoxGridProps) {
    const [showMixedError, setShowMixedError] = useState(false)

    // Convert slots to SlotInfo format
    const slotsInfo: SlotInfo[] = useMemo(() => {
        if (!box) return []
        return box.slots.map(slot => ({
            id: slot.id,
            position: slot.position,
            rowLabel: slot.rowLabel,
            colLabel: slot.colLabel,
            status: slot.status as 'EMPTY' | 'OCCUPIED' | 'RESERVED',
            sample: slot.sample ? {
                id: slot.sample.id,
                name: slot.sample.name,
                type: slot.sample.type,
                batchNo: (slot.sample as ExtendedSample).batchNo,
                quantity: (slot.sample as ExtendedSample).quantity,
                unit: (slot.sample as ExtendedSample).unit,
                concentration: (slot.sample as ExtendedSample).concentration,
                viability: (slot.sample as ExtendedSample).viability,
                passage: (slot.sample as ExtendedSample).passage,
                media: (slot.sample as ExtendedSample).media,
                owner: (slot.sample as ExtendedSample).owner,
                notes: (slot.sample as ExtendedSample).notes,
                sterileCheck: (slot.sample as ExtendedSample).sterileCheck,
                updatedAt: (slot.sample as ExtendedSample).updatedAt,
            } : null
        }))
    }, [box])

    const {
        selectedSlots,
        selectionType,
        handleSlotClick,
        clearSelection,
        isSelected,
        getSelectedSlotIds,
        // Drag selection
        isDragging,
        handleDragStart,
        handleDragMove,
        handleDragEnd,
        isInDragSelection,
    } = useSlotSelection(
        slotsInfo,
        box?.columns || 0,
        () => setShowMixedError(true)
    )

    // Clear selection when box data updates (e.g. after refresh)
    const occupiedCount = box?.slots.filter(s => s.status === 'OCCUPIED').length
    useEffect(() => {
        clearSelection()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [box?.id, occupiedCount])

    // Note: onSelectionChange callback removed to prevent infinite render loop
    // Selection state is used directly by action button handlers instead

    // Track batch group for highlighting (slots with same sample properties)
    const [batchGroupSlotIds, setBatchGroupSlotIds] = useState<Set<string>>(new Set())

    // Find batch group when single occupied slot is selected
    useEffect(() => {
        if (selectedSlots.size === 1 && selectionType === 'occupied') {
            const selectedId = Array.from(selectedSlots)[0]
            const selectedSlot = slotsInfo.find(s => s.id === selectedId)
            if (selectedSlot?.sample) {
                // Find other slots with matching sample properties
                const matchingSlotIds = slotsInfo
                    .filter(s =>
                        s.id !== selectedId &&
                        s.sample &&
                        s.sample.name === selectedSlot.sample!.name &&
                        s.sample.type === selectedSlot.sample!.type &&
                        s.sample.batchNo === selectedSlot.sample!.batchNo &&
                        s.sample.quantity === selectedSlot.sample!.quantity &&
                        s.sample.concentration === selectedSlot.sample!.concentration &&
                        s.sample.viability === selectedSlot.sample!.viability &&
                        s.sample.passage === selectedSlot.sample!.passage &&
                        s.sample.media === selectedSlot.sample!.media &&
                        s.sample.owner === selectedSlot.sample!.owner
                    )
                    .map(s => s.id)
                setBatchGroupSlotIds(new Set(matchingSlotIds))

                // Notify parent of selected sample
                onSampleSelect?.(
                    selectedSlot.sample,
                    `${selectedSlot.rowLabel}${selectedSlot.colLabel}`,
                    matchingSlotIds
                )
            } else {
                setBatchGroupSlotIds(new Set())
                onSampleSelect?.(null, '', [])
            }
        } else {
            setBatchGroupSlotIds(new Set())
            if (selectedSlots.size !== 1) {
                onSampleSelect?.(null, '', [])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSlots, selectionType]) // Intentionally limited deps

    // Hide mixed error after 3 seconds
    useEffect(() => {
        if (showMixedError) {
            const timer = setTimeout(() => setShowMixedError(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [showMixedError])

    // Handle action buttons
    const handleCheckInClick = () => {
        if (selectionType === 'empty' && onCheckIn) {
            const slotIds = getSelectedSlotIds()
            const slotLabels = slotsInfo
                .filter(s => selectedSlots.has(s.id))
                .map(s => `${s.rowLabel}${s.colLabel}`)
            onCheckIn(slotIds, slotLabels)
        }
    }

    const handleCheckOutClick = () => {
        if (selectionType === 'occupied' && onCheckOut) {
            const sampleIds = slotsInfo
                .filter(s => selectedSlots.has(s.id) && s.sample)
                .map(s => s.sample!.id)
            const slotLabels = slotsInfo
                .filter(s => selectedSlots.has(s.id) && s.sample)
                .map(s => `${s.rowLabel}${s.colLabel}`)
            onCheckOut(sampleIds, slotLabels)
        }
    }

    const handleEditClick = () => {
        if (selectionType === 'occupied' && onEdit) {
            const sampleIds = slotsInfo
                .filter(s => selectedSlots.has(s.id) && s.sample)
                .map(s => s.sample!.id)
            const slotLabels = slotsInfo
                .filter(s => selectedSlots.has(s.id) && s.sample)
                .map(s => `${s.rowLabel}${s.colLabel}`)
            onEdit(sampleIds, slotLabels)
        }
    }

    if (!box) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>选择一个盒子查看详情</p>
                </div>
            </div>
        )
    }

    const { rows, columns, slots } = box
    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, rows)
    const slotMap = new Map<number, Slot>()
    slots.forEach(slot => slotMap.set(slot.position, slot))

    // 以 9x9 为基准计算格子大小
    // 基准大小为 36px (w-9)，9x9 时不变
    // 小于 9x9 时放大，大于 9x9 时缩小
    const BASE_SIZE = 36 // 基准格子大小 (像素)
    const BASE_DIMENSION = 9 // 基准维度
    const MIN_SIZE = 20 // 最小格子大小
    const MAX_SIZE = 48 // 最大格子大小

    const maxDimension = Math.max(rows, columns)
    const scaleFactor = BASE_DIMENSION / maxDimension
    const calculatedSize = Math.round(BASE_SIZE * scaleFactor)
    const cellSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, calculatedSize))

    // 对应的行标签宽度和列标签高度
    const labelWidth = Math.max(16, Math.round(cellSize * 0.55))
    const headerHeight = Math.max(16, Math.round(cellSize * 0.55))

    // Get slot style based on status, selection, batch group, drag state, and filter match
    const getSlotStyle = (slot: Slot | undefined, isSlotSelected: boolean, isBatchMember: boolean, isInDrag: boolean, isFilterMatch: boolean) => {
        const isOccupied = slot?.status === 'OCCUPIED'

        // Drag selection preview (blue border)
        if (isInDrag && !isSlotSelected) {
            return 'bg-blue-50 border-blue-500 ring-2 ring-blue-400'
        }

        // Batch group member (red border) - highest priority for non-selected
        if (isBatchMember && !isSlotSelected) {
            return 'bg-red-50 border-red-500 ring-2 ring-red-400'
        }

        if (isSlotSelected) {
            return isOccupied
                ? 'bg-yellow-100 border-yellow-500 ring-2 ring-yellow-500'
                : 'bg-green-100 border-green-500 ring-2 ring-green-500'
        }

        // Filter match (purple) - highlight matched samples
        if (isFilterMatch && isOccupied) {
            return 'bg-blue-100 text-blue-900 border-blue-500 ring-2 ring-blue-400 hover:bg-blue-200'
        }

        return isOccupied
            ? 'bg-primary text-primary-foreground border-primary/50 hover:bg-primary/80'
            : 'bg-muted border-border hover:bg-accent'
    }

    return (
        <div className="p-4">
            {/* Mixed selection error toast */}
            {showMixedError && (
                <div className="mb-3 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                    无法同时选择空闲和已占用的槽位
                </div>
            )}

            {/* Action Bar */}
            <div className="mb-3 pb-2 border-b">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        size="sm"
                        variant={selectionType === 'empty' ? 'default' : 'outline'}
                        disabled={selectionType !== 'empty'}
                        onClick={handleCheckInClick}
                    >
                        <Plus className="h-4 w-4" />
                        入库 {selectionType === 'empty' && selectedSlots.size > 0 && `(${selectedSlots.size})`}
                    </Button>
                    <Button
                        size="sm"
                        variant={selectionType === 'occupied' ? 'destructive' : 'outline'}
                        disabled={selectionType !== 'occupied'}
                        onClick={handleCheckOutClick}
                    >
                        <LogOut className="h-4 w-4" />
                        出库 {selectionType === 'occupied' && selectedSlots.size > 0 && `(${selectedSlots.size})`}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={selectionType !== 'occupied'}
                        onClick={handleEditClick}
                    >
                        <Pencil className="h-4 w-4" />
                        编辑 {selectionType === 'occupied' && selectedSlots.size > 0 && `(${selectedSlots.size})`}
                    </Button>

                    {selectedSlots.size > 0 && (
                        <Button size="sm" variant="ghost" onClick={clearSelection}>
                            清除选择
                        </Button>
                    )}
                </div>
            </div>

            {/* Grid container - centered */}
            <div
                className={`flex flex-col items-center select-none ${isDragging ? 'cursor-crosshair' : ''}`}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
            >
                {/* Column headers */}
                <div className="inline-flex gap-0.5 mb-0.5" style={{ marginLeft: labelWidth + 2 }}>
                    {Array.from({ length: columns }, (_, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-center text-muted-foreground font-medium"
                            style={{ width: cellSize, height: headerHeight, fontSize: Math.max(10, cellSize * 0.35) }}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>

                {/* Grid with row labels */}
                <TooltipProvider>
                    {Array.from({ length: rows }, (_, rowIndex) => (
                        <div key={rowIndex} className="inline-flex gap-0.5 mb-0.5">
                            <div
                                className="flex items-center justify-center text-muted-foreground font-medium"
                                style={{ width: labelWidth, height: cellSize, fontSize: Math.max(10, cellSize * 0.35) }}
                            >
                                {rowLabels[rowIndex]}
                            </div>
                            {Array.from({ length: columns }, (_, colIndex) => {
                                const position = rowIndex * columns + colIndex + 1
                                const slot = slotMap.get(position)
                                const slotInfo = slotsInfo.find(s => s.position === position)
                                const isOccupied = slot?.status === 'OCCUPIED'
                                const isSlotSelected = slot ? isSelected(slot.id) : false
                                const isBatchMember = slot ? batchGroupSlotIds.has(slot.id) : false
                                const isInDrag = isInDragSelection(rowIndex, colIndex)
                                const isFilterMatch = slot ? (filterMatchedSlotIds?.has(slot.id) ?? false) : false

                                return (
                                    <Tooltip key={colIndex}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={(e) => {
                                                    // Always handle click (handleDragEnd will skip 1x1 drags)
                                                    if (slotInfo) {
                                                        handleSlotClick(slotInfo, e)
                                                    }
                                                }}
                                                onMouseDown={(e) => handleDragStart(rowIndex, colIndex, e)}
                                                onMouseEnter={() => handleDragMove(rowIndex, colIndex)}
                                                style={{
                                                    width: cellSize,
                                                    height: cellSize,
                                                    fontSize: (() => {
                                                        const name = slot?.sample?.name || ''
                                                        const len = name.length
                                                        const maxFontSize = Math.max(8, cellSize * 0.40)
                                                        const minFontSize = Math.max(5, cellSize * 0.25)
                                                        const maxLen = 6
                                                        if (len > maxLen) return minFontSize
                                                        const t = (len - 1) / (maxLen - 1)
                                                        return Math.round(maxFontSize - t * (maxFontSize - minFontSize))
                                                    })(),
                                                    lineHeight: 1.1,
                                                    letterSpacing: (slot?.sample?.name?.length || 0) > 6 ? '-0.03em' : 'normal',
                                                    wordBreak: 'break-all',
                                                }}
                                                className={`rounded-md border transition-all hover:scale-110 hover:z-10 flex items-center justify-center p-0.5 text-center font-medium overflow-hidden ${getSlotStyle(slot, isSlotSelected, isBatchMember, isInDrag, isFilterMatch)}`}
                                            >
                                                <span className="line-clamp-3 max-w-full">{isOccupied && slot?.sample?.name}</span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[200px]">
                                            <p className="font-medium">{rowLabels[rowIndex]}{colIndex + 1}</p>
                                            {isOccupied && slot?.sample ? (
                                                <div className="text-xs space-y-0.5 mt-1">
                                                    <p>样本: {slot.sample.name}</p>
                                                    <p>类型: {slot.sample.type}</p>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">空闲</p>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    ))}
                </TooltipProvider>

                {/* Legend and Shortcuts */}
                <div className="inline-flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground justify-center items-center">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-primary" />
                        <span>已占用</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-muted border" />
                        <span>空闲</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-500" />
                        <span>空闲选中</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-500" />
                        <span>已占用选中</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-red-50 border border-red-500" />
                        <span>同批次</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-blue-50 border border-blue-500" />
                        <span>拖拽选中</span>
                    </div>
                    {filterMatchedSlotIds && filterMatchedSlotIds.size > 0 && (
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-500" />
                            <span className="text-blue-600">筛选匹配</span>
                        </div>
                    )}
                    <span className="pl-3 ml-1">
                        <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd> 多选
                        <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-[10px]">Shift</kbd> 块选
                        <span className="ml-2 text-blue-600">拖拽框选</span>
                    </span>
                </div>
            </div>
        </div>
    )
}

type NavigationLevel = 'facility' | 'rack' | 'box'

export default function InventoryPage() {
    const [loading, setLoading] = useState(true)
    const [currentLevel, setCurrentLevelState] = useState<NavigationLevel>('facility')
    const [libraryMode, setLibraryModeState] = useState<LibraryMode>(getInitialLibraryMode)

    // 包装 setCurrentLevel 以同时更新 sessionStorage
    const setCurrentLevel = useCallback((level: NavigationLevel) => {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY_LEVEL, level)
        }
        setCurrentLevelState(level)
    }, [])

    // 包装 setLibraryMode 以同时更新 cookie
    const setLibraryMode = useCallback((value: LibraryMode) => {
        document.cookie = `${LIBRARY_MODE_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE}`
        setLibraryModeState(value)
    }, [])

    // Data
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [racks, setRacks] = useState<Rack[]>([])
    const [boxes, setBoxes] = useState<BoxInfo[]>([])
    const [boxDetail, setBoxDetail] = useState<BoxDetail | null>(null)

    // Selections
    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)
    const [selectedRack, setSelectedRack] = useState<Rack | null>(null)
    const [selectedBox, setSelectedBox] = useState<BoxInfo | null>(null)


    // Dialog states for batch operations
    const [checkInDialogOpen, setCheckInDialogOpen] = useState(false)
    const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
    const [selectedSlotLabels, setSelectedSlotLabels] = useState<string[]>([])
    const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([])

    // Callbacks for BoxGrid actions
    const handleCheckIn = (slotIds: string[], slotLabels: string[]) => {
        setSelectedSlotIds(slotIds)
        setSelectedSlotLabels(slotLabels)
        setCheckInDialogOpen(true)
    }

    const handleCheckOut = (sampleIds: string[], slotLabels: string[]) => {
        setSelectedSampleIds(sampleIds)
        setSelectedSlotLabels(slotLabels)
        setCheckOutDialogOpen(true)
    }

    const handleEdit = (sampleIds: string[], slotLabels: string[]) => {
        setSelectedSampleIds(sampleIds)
        setSelectedSlotLabels(slotLabels)
        setEditDialogOpen(true)
    }

    const handleDialogSuccess = () => {
        // Refresh everything to update counts and statuses
        if (selectedFacility) fetchRacks(selectedFacility.id)
        if (selectedRack) fetchBoxes(selectedRack.id)
        if (selectedBox) fetchBoxDetail(selectedBox.id)

        // Also refresh facilities list to update high-level stats
        const privateParam = libraryMode === 'private' ? '?private=true' : ''
        fetch(`/api/inventory${privateParam}`)
            .then(res => res.json())
            .then(data => setFacilities(data.facilities || []))

        // Clear selections
        setSelectedSlotIds([])
        setSelectedSlotLabels([])
        setSelectedSampleIds([])
        // Note: We don't clear selectedSlots in BoxGrid here as it requires prop drilling or context
        // Instead, BoxGrid effects will handle it when boxDetail updates
    }

    // State for detail panel
    const [selectedSample, setSelectedSample] = useState<SampleDetail | null>(null)
    const [selectedSlotPosition, setSelectedSlotPosition] = useState<string>('')
    const [batchGroupCount, setBatchGroupCount] = useState<number>(0)

    // Callback for BoxGrid sample selection
    const handleSampleSelect = useCallback((
        sample: SlotInfo['sample'] | null,
        slotPosition: string,
        batchGroupSlotIds: string[]
    ) => {
        if (sample) {
            setSelectedSample(sample as SampleDetail)
            setSelectedSlotPosition(slotPosition)
            setBatchGroupCount(batchGroupSlotIds.length)
        } else {
            setSelectedSample(null)
            setSelectedSlotPosition('')
            setBatchGroupCount(0)
        }
    }, [])

    // ============================================
    // 筛选功能状态
    // ============================================
    const [filterDialogOpen, setFilterDialogOpen] = useState(false)
    const [filterState, setFilterState] = useState<FilterState | null>(null)
    const [filterResult, setFilterResult] = useState<FilterResult | null>(null)

    // 当前盒子的筛选匹配 slot IDs
    const currentBoxFilterMatchedSlotIds = useMemo(() => {
        if (!filterResult || !selectedBox) return new Set<string>()

        // 在筛选结果中找到当前盒子
        for (const facility of filterResult.facilities) {
            for (const rack of facility.racks) {
                const box = rack.boxes.find(b => b.id === selectedBox.id)
                if (box) {
                    return new Set(box.matchedSlotIds)
                }
            }
        }
        return new Set<string>()
    }, [filterResult, selectedBox])

    // 筛选后的设施列表
    const filteredFacilities = useMemo(() => {
        if (!filterResult) return facilities
        // 只显示包含匹配样本的设施
        const matchedFacilityIds = new Set(filterResult.facilities.map(f => f.id))
        return facilities.filter(f => matchedFacilityIds.has(f.id))
    }, [facilities, filterResult])

    // 筛选后的架子列表
    const filteredRacks = useMemo(() => {
        if (!filterResult || !selectedFacility) return racks
        const facilityResult = filterResult.facilities.find(f => f.id === selectedFacility.id)
        if (!facilityResult) return []
        const matchedRackIds = new Set(facilityResult.racks.map(r => r.id))
        return racks.filter(r => matchedRackIds.has(r.id))
    }, [racks, filterResult, selectedFacility])

    // 筛选后的盒子列表
    const filteredBoxes = useMemo(() => {
        if (!filterResult || !selectedFacility || !selectedRack) return boxes
        const facilityResult = filterResult.facilities.find(f => f.id === selectedFacility.id)
        if (!facilityResult) return []
        const rackResult = facilityResult.racks.find(r => r.id === selectedRack.id)
        if (!rackResult) return []
        const matchedBoxIds = new Set(rackResult.boxes.map(b => b.id))
        return boxes.filter(b => matchedBoxIds.has(b.id))
    }, [boxes, filterResult, selectedFacility, selectedRack])

    // 获取筛选匹配数（用于显示）
    const getFilterMatchCount = useCallback((type: 'facility' | 'rack' | 'box', id: string) => {
        if (!filterResult) return null

        if (type === 'facility') {
            const facility = filterResult.facilities.find(f => f.id === id)
            return facility?.matchCount ?? null
        }

        if (type === 'rack' && selectedFacility) {
            const facilityResult = filterResult.facilities.find(f => f.id === selectedFacility.id)
            const rack = facilityResult?.racks.find(r => r.id === id)
            return rack?.matchCount ?? null
        }

        if (type === 'box' && selectedFacility && selectedRack) {
            const facilityResult = filterResult.facilities.find(f => f.id === selectedFacility.id)
            const rackResult = facilityResult?.racks.find(r => r.id === selectedRack.id)
            const box = rackResult?.boxes.find(b => b.id === id)
            return box?.matchCount ?? null
        }

        return null
    }, [filterResult, selectedFacility, selectedRack])

    // 应用筛选
    const handleFilterApply = useCallback((filter: FilterState, result: FilterResult) => {
        setFilterState(filter)
        setFilterResult(result)
    }, [])

    // 清除筛选
    const handleFilterClear = useCallback(() => {
        setFilterState(null)
        setFilterResult(null)
    }, [])

    // 使用 ref 追踪之前的 libraryMode，检测是否是切换
    const prevLibraryModeRef = useRef<LibraryMode | null>(null)
    // 使用 ref 追踪是否已完成初始化，防止首次加载时清除 sessionStorage
    const hasInitializedRef = useRef(false)

    // Fetch facilities on mount or when library mode changes
    useEffect(() => {
        async function fetchAndRestore() {
            setLoading(true)

            // 检查 libraryMode 是否真的改变了（不是首次加载）
            const savedLibraryMode = typeof sessionStorage !== 'undefined'
                ? sessionStorage.getItem(STORAGE_KEY_LIBRARY_MODE)
                : null
            const libraryModeChanged = savedLibraryMode !== null && savedLibraryMode !== libraryMode

            // 保存当前 libraryMode
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(STORAGE_KEY_LIBRARY_MODE, libraryMode)
            }

            // 如果 libraryMode 改变了，清除之前的选择缓存
            if (libraryModeChanged) {
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem(STORAGE_KEY_FACILITY)
                    sessionStorage.removeItem(STORAGE_KEY_RACK)
                    sessionStorage.removeItem(STORAGE_KEY_BOX)
                    sessionStorage.removeItem(STORAGE_KEY_LEVEL)
                }
                setSelectedFacility(null)
                setSelectedRack(null)
                setSelectedBox(null)
                setBoxDetail(null)
                setCurrentLevelState('facility')
            }

            try {
                const privateParam = libraryMode === 'private' ? '?private=true' : ''
                const res = await fetch(`/api/inventory${privateParam}`)
                if (res.ok) {
                    const data = await res.json()
                    const fetchedFacilities: Facility[] = data.facilities || []
                    setFacilities(fetchedFacilities)

                    // 只有在 libraryMode 没有改变时才恢复之前的选择状态
                    if (!libraryModeChanged && typeof sessionStorage !== 'undefined') {
                        const savedFacilityId = sessionStorage.getItem(STORAGE_KEY_FACILITY)
                        const savedRackId = sessionStorage.getItem(STORAGE_KEY_RACK)
                        const savedBoxId = sessionStorage.getItem(STORAGE_KEY_BOX)
                        const savedLevel = sessionStorage.getItem(STORAGE_KEY_LEVEL) as NavigationLevel

                        if (savedFacilityId) {
                            const facility = fetchedFacilities.find(f => f.id === savedFacilityId)
                            if (facility) {
                                setSelectedFacility(facility)
                                // 加载 racks
                                const racksRes = await fetch(`/api/inventory?facilityId=${savedFacilityId}`)
                                if (racksRes.ok) {
                                    const racksData = await racksRes.json()
                                    const fetchedRacks: Rack[] = racksData.racks || []
                                    setRacks(fetchedRacks)

                                    if (savedRackId) {
                                        const rack = fetchedRacks.find(r => r.id === savedRackId)
                                        if (rack) {
                                            setSelectedRack(rack)
                                            // 加载 boxes
                                            const boxesRes = await fetch(`/api/inventory?rackId=${savedRackId}`)
                                            if (boxesRes.ok) {
                                                const boxesData = await boxesRes.json()
                                                const rackData = boxesData.rack
                                                if (rackData?.shelves) {
                                                    const shelfBoxes: BoxInfo[] = rackData.shelves.flatMap((shelf: { boxes: Array<{ id: string; name: string; rows: number; columns: number; slots?: Array<{ status: string }> }> }) =>
                                                        shelf.boxes.map((box) => ({
                                                            id: box.id,
                                                            name: box.name,
                                                            rows: box.rows,
                                                            columns: box.columns,
                                                            occupied: box.slots?.filter((slot: { status: string }) => slot.status === 'OCCUPIED').length || 0,
                                                            total: box.rows * box.columns,
                                                        }))
                                                    )
                                                    setBoxes(shelfBoxes)

                                                    if (savedBoxId) {
                                                        const box = shelfBoxes.find(b => b.id === savedBoxId)
                                                        if (box) {
                                                            setSelectedBox(box)
                                                            // 加载 box detail
                                                            const boxDetailRes = await fetch(`/api/inventory?boxId=${savedBoxId}`)
                                                            if (boxDetailRes.ok) {
                                                                const boxDetailData = await boxDetailRes.json()
                                                                setBoxDetail(boxDetailData.box)
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                // 恢复导航级别
                                if (savedLevel) {
                                    setCurrentLevelState(savedLevel)
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch facilities:', error)
            } finally {
                setLoading(false)
                // 标记初始化完成，允许后续的持久化操作
                hasInitializedRef.current = true
            }
        }

        fetchAndRestore()
        prevLibraryModeRef.current = libraryMode
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [libraryMode])



    // 持久化选择状态到 sessionStorage（仅在初始化完成后）
    useEffect(() => {
        // 跳过首次加载，等待恢复完成
        if (!hasInitializedRef.current) {
            return
        }

        if (typeof sessionStorage !== 'undefined') {
            if (selectedFacility) {
                sessionStorage.setItem(STORAGE_KEY_FACILITY, selectedFacility.id)
            } else {
                sessionStorage.removeItem(STORAGE_KEY_FACILITY)
            }
            if (selectedRack) {
                sessionStorage.setItem(STORAGE_KEY_RACK, selectedRack.id)
            } else {
                sessionStorage.removeItem(STORAGE_KEY_RACK)
            }
            if (selectedBox) {
                sessionStorage.setItem(STORAGE_KEY_BOX, selectedBox.id)
            } else {
                sessionStorage.removeItem(STORAGE_KEY_BOX)
            }
        }
    }, [selectedFacility, selectedRack, selectedBox])

    // Fetch racks
    const fetchRacks = useCallback(async (facilityId: string) => {
        const res = await fetch(`/api/inventory?facilityId=${facilityId}`)
        if (res.ok) {
            const data = await res.json()
            setRacks(data.racks || [])
        }
    }, [])

    // Fetch boxes
    const fetchBoxes = useCallback(async (rackId: string) => {
        const res = await fetch(`/api/inventory?rackId=${rackId}`)
        if (res.ok) {
            const data = await res.json()
            const rack = data.rack
            if (rack?.shelves) {
                // Define type for box with slots from API
                interface BoxWithSlots {
                    id: string
                    name: string
                    rows: number
                    columns: number
                    slots?: Array<{ status: string }>
                }
                const shelfBoxes = rack.shelves.flatMap((shelf: { boxes: BoxWithSlots[] }) =>
                    shelf.boxes.map((box: BoxWithSlots) => ({
                        id: box.id,
                        name: box.name,
                        rows: box.rows,
                        columns: box.columns,
                        // Calculate occupied count from slots
                        occupied: box.slots?.filter((slot: { status: string }) => slot.status === 'OCCUPIED').length || 0,
                        total: box.rows * box.columns,
                    }))
                )
                setBoxes(shelfBoxes)
            } else {
                setBoxes([])
            }
        }
    }, [])

    // Fetch box detail
    const fetchBoxDetail = useCallback(async (boxId: string) => {
        const res = await fetch(`/api/inventory?boxId=${boxId}`)
        if (res.ok) {
            const data = await res.json()
            setBoxDetail(data.box)
        }
    }, [])

    // Handle facility click → switch to rack tab
    const handleFacilityClick = (facility: Facility) => {
        setSelectedFacility(facility)
        fetchRacks(facility.id)
        setCurrentLevel('rack')
    }

    // Handle rack bar click (shortcut)
    const handleRackBarClick = (rackInfo: { id: string; name: string }) => {
        // First ensure we're on the right facility, then select rack
        const facility = facilities.find(f => f.racksDetail?.some(r => r.id === rackInfo.id))
        if (facility) {
            setSelectedFacility(facility)
            fetchRacks(facility.id).then(() => {
                const rack = racks.find(r => r.id === rackInfo.id)
                if (rack) {
                    setSelectedRack(rack)
                    fetchBoxes(rack.id)
                }
            })
        }
        setCurrentLevel('rack')
    }

    // Handle rack click → switch to box tab
    const handleRackClick = (rack: Rack) => {
        setSelectedRack(rack)
        fetchBoxes(rack.id)
        setCurrentLevel('box')
    }

    // Handle shelf bar click - show all boxes from rack but select the one from clicked shelf
    const handleShelfBarClick = async (shelf: { id: string; name: string; occupancy: number }, rackId?: string) => {
        const targetRackId = rackId || selectedRack?.id
        if (!targetRackId) {
            setCurrentLevel('box')
            return
        }

        // Load all boxes from the rack
        const rackRes = await fetch(`/api/inventory?rackId=${targetRackId}`)
        const rackData = await rackRes.json()
        const rack = rackData.rack

        if (rack?.shelves) {
            // Flatten all boxes from all shelves
            const allBoxes: BoxInfo[] = []
            let targetBox: BoxInfo | null = null

            for (const s of rack.shelves) {
                for (const box of s.boxes) {
                    const boxInfo: BoxInfo = {
                        id: box.id,
                        name: box.name,
                        rows: box.rows,
                        columns: box.columns,
                        occupied: box.slots?.filter((slot: { status: string }) => slot.status === 'OCCUPIED').length || 0,
                        total: box.rows * box.columns,
                    }
                    allBoxes.push(boxInfo)

                    // If this shelf matches, mark the first box as target
                    if (s.id === shelf.id && !targetBox) {
                        targetBox = boxInfo
                    }
                }
            }

            setBoxes(allBoxes)

            // Select the target box, or fallback to first box
            if (targetBox) {
                setSelectedBox(targetBox)
                fetchBoxDetail(targetBox.id)
            } else if (allBoxes.length > 0) {
                setSelectedBox(allBoxes[0])
                fetchBoxDetail(allBoxes[0].id)
            }
        }

        setCurrentLevel('box')
    }

    // Handle box click → update right side grid
    const handleBoxClick = (box: BoxInfo) => {
        setSelectedBox(box)
        fetchBoxDetail(box.id)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
                <Breadcrumbs />
                <LibrarySwitch value={libraryMode} onChange={setLibraryMode} />
            </div>

            {/* Two Column Layout: Left Navigation + Right Grid */}
            <div className="grid gap-6 lg:grid-cols-12">

                {/* LEFT: Tab Navigation */}
                <div className="lg:col-span-3">
                    <Card className="h-full">
                        <Tabs value={currentLevel} onValueChange={(v) => setCurrentLevel(v as NavigationLevel)}>
                            <CardHeader className="pb-0">
                                <TabsList className="w-full grid grid-cols-3">
                                    <TabsTrigger value="facility" className="text-xs px-2">
                                        <Building2 className="h-3.5 w-3.5 mr-1" />
                                        细胞库
                                    </TabsTrigger>
                                    <TabsTrigger value="rack" className="text-xs px-2" disabled={!selectedFacility}>
                                        <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                                        扇/提
                                    </TabsTrigger>
                                    <TabsTrigger value="box" className="text-xs px-2" disabled={!selectedRack}>
                                        <Package className="h-3.5 w-3.5 mr-1" />
                                        盒子
                                    </TabsTrigger>
                                </TabsList>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {/* Filter Active Indicator */}
                                {filterResult && (
                                    <div className="mb-3 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200/60 rounded-lg text-sm flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            <span className="text-primary font-medium">筛选中</span>
                                            <span className="text-blue-400">·</span>
                                            <span className="text-blue-600">{filterResult.totalMatched} 个匹配</span>
                                        </div>
                                        <button
                                            onClick={handleFilterClear}
                                            className="px-2 py-0.5 text-xs text-blue-600 hover:text-white hover:bg-primary rounded transition-colors"
                                        >
                                            清除
                                        </button>
                                    </div>
                                )}

                                {/* Facility List */}
                                <TabsContent value="facility" className="mt-0 space-y-2 max-h-[500px] overflow-y-auto">
                                    {filteredFacilities.length === 0 ? (
                                        <div className="text-center py-8 text-sm text-muted-foreground">
                                            {filterResult ? '无匹配的细胞库' : '暂无细胞库'}
                                        </div>
                                    ) : (
                                        filteredFacilities.map((facility) => {
                                            const filterMatchCount = getFilterMatchCount('facility', facility.id)
                                            return (
                                                <div
                                                    key={facility.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => handleFacilityClick(facility)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleFacilityClick(facility)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${selectedFacility?.id === facility.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-sm">{facility.name}</p>
                                                            <p className={`text-xs ${selectedFacility?.id === facility.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                                {facility.type} | {facility.racks} 扇/提
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant={selectedFacility?.id === facility.id ? 'secondary' : 'outline'}
                                                                className={filterMatchCount !== null ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}
                                                            >
                                                                {filterMatchCount !== null ? filterMatchCount : facility.usedSlots}/{facility.totalSlots}
                                                            </Badge>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    {facility.racksDetail && (
                                                        <ChildProgressBar items={facility.racksDetail} onItemClick={handleRackBarClick} />
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </TabsContent>

                                {/* Rack List */}
                                <TabsContent value="rack" className="mt-0 space-y-2 max-h-[500px] overflow-y-auto">
                                    <div className="text-xs text-muted-foreground mb-2 pb-2 border-b">
                                        {selectedFacility?.name}
                                    </div>
                                    {filteredRacks.length === 0 ? (
                                        <div className="text-center py-8 text-sm text-muted-foreground">
                                            {filterResult ? '无匹配的扇/提' : '暂无扇/提'}
                                        </div>
                                    ) : (
                                        filteredRacks.map((rack) => {
                                            const filterMatchCount = getFilterMatchCount('rack', rack.id)
                                            return (
                                                <div
                                                    key={rack.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => handleRackClick(rack)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleRackClick(rack)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${selectedRack?.id === rack.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-sm">{rack.name}</p>
                                                            <p className={`text-xs ${selectedRack?.id === rack.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                                {rack.totalShelves} 层
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant={selectedRack?.id === rack.id ? 'secondary' : 'outline'}
                                                                className={filterMatchCount !== null ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}
                                                            >
                                                                {filterMatchCount !== null ? filterMatchCount : rack.used}/{rack.total}
                                                            </Badge>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    {rack.shelves && (
                                                        <ChildProgressBar items={rack.shelves} onItemClick={(shelf) => handleShelfBarClick(shelf, rack.id)} />
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </TabsContent>

                                {/* Box List */}
                                <TabsContent value="box" className="mt-0 space-y-2 max-h-[500px] overflow-y-auto">
                                    <div className="text-xs text-muted-foreground mb-2 pb-2 border-b">
                                        {selectedFacility?.name} &gt; {selectedRack?.name}
                                    </div>
                                    {filteredBoxes.length === 0 ? (
                                        <div className="text-center py-8 text-sm text-muted-foreground">
                                            {filterResult ? '无匹配的盒子' : '暂无盒子'}
                                        </div>
                                    ) : (
                                        filteredBoxes.map((box) => {
                                            const filterMatchCount = getFilterMatchCount('box', box.id)
                                            return (
                                                <button
                                                    key={box.id}
                                                    onClick={() => handleBoxClick(box)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedBox?.id === box.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-sm">{box.name}</span>
                                                        <Badge
                                                            variant={selectedBox?.id === box.id ? 'secondary' : 'outline'}
                                                            className={filterMatchCount !== null ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}
                                                        >
                                                            {filterMatchCount !== null ? filterMatchCount : box.occupied}/{box.total}
                                                        </Badge>
                                                    </div>
                                                    <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${selectedBox?.id === box.id ? 'bg-primary-foreground/30' : 'bg-muted/50'}`}>
                                                        <div
                                                            className={`h-full rounded-full ${getOccupancyColor(Math.round((filterMatchCount !== null ? filterMatchCount : box.occupied) / box.total * 100))}`}
                                                            style={{ width: `${Math.round((filterMatchCount !== null ? filterMatchCount : box.occupied) / box.total * 100)}%` }}
                                                        />
                                                    </div>
                                                </button>
                                            )
                                        })
                                    )}
                                </TabsContent>
                            </CardContent>
                        </Tabs>
                    </Card>
                </div>

                {/* CENTER: Box Grid */}
                <div className="lg:col-span-6">
                    <Card className="h-full">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">{selectedBox?.name || '盒子网格'}</CardTitle>
                                    {selectedBox && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {selectedBox.rows}×{selectedBox.columns} | {selectedBox.occupied}/{selectedBox.total} 槽位
                                        </p>
                                    )}
                                </div>
                                {selectedBox && (
                                    <Badge variant="outline">
                                        {Math.round(selectedBox.occupied / selectedBox.total * 100)}% 已用
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <BoxGrid
                                box={boxDetail}
                                onCheckIn={handleCheckIn}
                                onCheckOut={handleCheckOut}
                                onEdit={handleEdit}
                                onSampleSelect={handleSampleSelect}
                                filterMatchedSlotIds={currentBoxFilterMatchedSlotIds}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* FAR RIGHT: Sample Detail Panel */}
                <div className="lg:col-span-3">
                    <SlotDetailPanel
                        sample={selectedSample}
                        slotPosition={selectedSlotPosition}
                        batchGroupCount={batchGroupCount}
                    />
                </div>
            </div>


            {/* Batch Operation Dialogs */}
            <BatchCheckInDialog
                open={checkInDialogOpen}
                onOpenChange={setCheckInDialogOpen}
                slotIds={selectedSlotIds}
                slotLabels={selectedSlotLabels}
                boxRows={boxDetail?.rows}
                boxCols={boxDetail?.columns}
                locationInfo={{
                    libraryName: selectedFacility?.name,
                    rackName: selectedRack?.name,
                    boxName: selectedBox?.name
                }}
                onSuccess={handleDialogSuccess}
            />
            <BatchCheckOutDialog
                open={checkOutDialogOpen}
                onOpenChange={setCheckOutDialogOpen}
                sampleIds={selectedSampleIds}
                slotLabels={selectedSlotLabels}
                boxRows={boxDetail?.rows}
                boxCols={boxDetail?.columns}
                locationInfo={{
                    libraryName: selectedFacility?.name,
                    rackName: selectedRack?.name,
                    boxName: selectedBox?.name
                }}
                onSuccess={handleDialogSuccess}
            />
            <BatchEditDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                sampleIds={selectedSampleIds}
                slotLabels={selectedSlotLabels}
                boxRows={boxDetail?.rows}
                boxCols={boxDetail?.columns}
                locationInfo={{
                    libraryName: selectedFacility?.name,
                    rackName: selectedRack?.name,
                    boxName: selectedBox?.name
                }}
                onSuccess={handleDialogSuccess}
            />

            {/* Filter Floating Button */}
            <FilterFloatingButton
                isActive={filterState?.isActive ?? false}
                matchCount={filterResult?.totalMatched}
                onClick={() => setFilterDialogOpen(true)}
                onClear={handleFilterClear}
            />

            {/* Filter Dialog */}
            <SampleFilterDialog
                open={filterDialogOpen}
                onOpenChange={setFilterDialogOpen}
                onApply={handleFilterApply}
                onClear={handleFilterClear}
                currentFilter={filterState ?? undefined}
                libraryMode={libraryMode}
                currentFacilityId={selectedFacility?.id}
                currentFacilityName={selectedFacility?.name}
                currentRackId={selectedRack?.id}
                currentRackName={selectedRack?.name}
            />
        </div>
    )
}
