'use client'

import { AppLayout } from '@/components/features/AppLayout'
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
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSlotSelection, SlotInfo, SelectionType } from '@/hooks/useSlotSelection'

// Cookie 常量
const LIBRARY_MODE_COOKIE = 'library_mode'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

// 从 cookie 读取 libraryMode 初始值
function getInitialLibraryMode(): LibraryMode {
    if (typeof document === 'undefined') return 'public'
    const match = document.cookie.match(new RegExp(`(^| )${LIBRARY_MODE_COOKIE}=([^;]+)`))
    const value = match ? match[2] : null
    return value === 'private' ? 'private' : 'public'
}

// Types
interface RackDetail {
    id: string
    name: string
    code: string
    occupancy: number
}

interface ShelfDetail {
    id: string
    name: string
    order: number
    occupancy: number
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
    items: { id: string; name: string; occupancy: number }[]
    onItemClick: (item: { id: string; name: string; occupancy: number }) => void
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
                            <p className="text-xs">{item.occupancy}% 已用</p>
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
    onCheckIn?: (slotIds: string[]) => void
    onCheckOut?: (sampleIds: string[]) => void
    onEdit?: (sampleIds: string[]) => void
    onSampleSelect?: (sample: SlotInfo['sample'] | null, slotPosition: string, batchGroupSlotIds: string[]) => void
}

function BoxGrid({ box, onCheckIn, onCheckOut, onEdit, onSampleSelect }: BoxGridProps) {
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
            onCheckIn(getSelectedSlotIds())
        }
    }

    const handleCheckOutClick = () => {
        if (selectionType === 'occupied' && onCheckOut) {
            const sampleIds = slotsInfo
                .filter(s => selectedSlots.has(s.id) && s.sample)
                .map(s => s.sample!.id)
            onCheckOut(sampleIds)
        }
    }

    const handleEditClick = () => {
        if (selectionType === 'occupied' && onEdit) {
            const sampleIds = slotsInfo
                .filter(s => selectedSlots.has(s.id) && s.sample)
                .map(s => s.sample!.id)
            onEdit(sampleIds)
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

    // Get slot style based on status, selection, batch group, and drag state
    const getSlotStyle = (slot: Slot | undefined, isSlotSelected: boolean, isBatchMember: boolean, isInDrag: boolean) => {
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

        return isOccupied
            ? 'bg-primary border-primary/50 hover:bg-primary/80'
            : 'bg-muted border-border hover:bg-accent'
    }

    return (
        <div className="p-4">
            {/* Mixed selection error toast */}
            {showMixedError && (
                <div className="mb-3 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                    ⚠️ 无法同时选择空闲和已占用的槽位
                </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
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

                <div className="ml-auto text-xs text-muted-foreground">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd> 多选 |{' '}
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Shift</kbd> 块选 |{' '}
                    <span className="text-blue-600">拖拽框选</span>
                </div>
            </div>

            {/* Grid container - centered */}
            <div
                className={`flex flex-col items-center select-none ${isDragging ? 'cursor-crosshair' : ''}`}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
            >
                {/* Column headers */}
                <div className="inline-flex gap-1.5 mb-1 ml-8">
                    {Array.from({ length: columns }, (_, i) => (
                        <div key={i} className="w-10 h-6 flex items-center justify-center text-xs text-muted-foreground font-medium">
                            {i + 1}
                        </div>
                    ))}
                </div>

                {/* Grid with row labels */}
                <TooltipProvider>
                    {Array.from({ length: rows }, (_, rowIndex) => (
                        <div key={rowIndex} className="inline-flex gap-1.5 mb-1.5">
                            <div className="w-6 h-10 flex items-center justify-center text-xs text-muted-foreground font-medium">
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

                                return (
                                    <Tooltip key={colIndex}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={(e) => {
                                                    // Only handle click if not dragging
                                                    if (!isDragging && slotInfo) {
                                                        handleSlotClick(slotInfo, e)
                                                    }
                                                }}
                                                onMouseDown={(e) => handleDragStart(rowIndex, colIndex, e)}
                                                onMouseEnter={() => handleDragMove(rowIndex, colIndex)}
                                                className={`w-10 h-10 rounded-md border transition-all hover:scale-110 hover:z-10 flex items-center justify-center text-xs font-medium ${getSlotStyle(slot, isSlotSelected, isBatchMember, isInDrag)}`}
                                            >
                                                {isOccupied && slot?.sample?.name?.slice(0, 2)}
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

                {/* Legend */}
                <div className="inline-flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-primary" />
                        <span>已占用</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-muted border" />
                        <span>空闲</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-green-100 border-2 border-green-500" />
                        <span>空闲选中</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-yellow-100 border-2 border-yellow-500" />
                        <span>已占用选中</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-red-50 border-2 border-red-500" />
                        <span>同批次</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-sm bg-blue-50 border-2 border-blue-500" />
                        <span>拖拽选中</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

type NavigationLevel = 'facility' | 'rack' | 'box'

export default function InventoryPage() {
    const [loading, setLoading] = useState(true)
    const [currentLevel, setCurrentLevel] = useState<NavigationLevel>('facility')
    const [libraryMode, setLibraryModeState] = useState<LibraryMode>(getInitialLibraryMode)

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
    const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([])

    // Callbacks for BoxGrid actions
    const handleCheckIn = (slotIds: string[]) => {
        setSelectedSlotIds(slotIds)
        setCheckInDialogOpen(true)
    }

    const handleCheckOut = (sampleIds: string[]) => {
        setSelectedSampleIds(sampleIds)
        setCheckOutDialogOpen(true)
    }

    const handleEdit = (sampleIds: string[]) => {
        setSelectedSampleIds(sampleIds)
        setEditDialogOpen(true)
    }

    const handleDialogSuccess = () => {
        // Refresh box detail after any operation
        if (selectedBox) {
            fetchBoxDetail(selectedBox.id)
        }
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

    // Fetch facilities on mount or when library mode changes
    useEffect(() => {
        async function fetchFacilities() {
            setLoading(true)
            try {
                const privateParam = libraryMode === 'private' ? '?private=true' : ''
                const res = await fetch(`/api/inventory${privateParam}`)
                if (res.ok) {
                    const data = await res.json()
                    setFacilities(data.facilities || [])
                }
            } catch (error) {
                console.error('Failed to fetch facilities:', error)
            } finally {
                setLoading(false)
            }
        }
        // Reset selections when switching modes
        setSelectedFacility(null)
        setSelectedRack(null)
        setSelectedBox(null)
        setBoxDetail(null)
        setCurrentLevel('facility')
        fetchFacilities()
    }, [libraryMode])

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
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>

            <div className="container mx-auto px-4 py-6">
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
                                    <TabsList className="w-full">
                                        <TabsTrigger value="facility" className="flex-1 gap-1">
                                            <Building2 className="h-4 w-4" />
                                            设施
                                        </TabsTrigger>
                                        <TabsTrigger value="rack" className="flex-1 gap-1" disabled={!selectedFacility}>
                                            <LayoutGrid className="h-4 w-4" />
                                            货架
                                        </TabsTrigger>
                                        <TabsTrigger value="box" className="flex-1 gap-1" disabled={!selectedRack}>
                                            <Package className="h-4 w-4" />
                                            盒子
                                        </TabsTrigger>
                                    </TabsList>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {/* Facility List */}
                                    <TabsContent value="facility" className="mt-0 space-y-2 max-h-[500px] overflow-y-auto">
                                        {facilities.length === 0 ? (
                                            <div className="text-center py-8 text-sm text-muted-foreground">暂无设施</div>
                                        ) : (
                                            facilities.map((facility) => (
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
                                                                {facility.type} | {facility.racks} 货架
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={selectedFacility?.id === facility.id ? 'secondary' : 'outline'}>{facility.capacity}%</Badge>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    {facility.racksDetail && (
                                                        <ChildProgressBar items={facility.racksDetail} onItemClick={handleRackBarClick} />
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </TabsContent>

                                    {/* Rack List */}
                                    <TabsContent value="rack" className="mt-0 space-y-2 max-h-[500px] overflow-y-auto">
                                        <div className="text-xs text-muted-foreground mb-2 pb-2 border-b">
                                            {selectedFacility?.name}
                                        </div>
                                        {racks.length === 0 ? (
                                            <div className="text-center py-8 text-sm text-muted-foreground">暂无货架</div>
                                        ) : (
                                            racks.map((rack) => (
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
                                                            <Badge variant={selectedRack?.id === rack.id ? 'secondary' : 'outline'}>{rack.occupancy}%</Badge>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    {rack.shelves && (
                                                        <ChildProgressBar items={rack.shelves} onItemClick={(shelf) => handleShelfBarClick(shelf, rack.id)} />
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </TabsContent>

                                    {/* Box List */}
                                    <TabsContent value="box" className="mt-0 space-y-2 max-h-[500px] overflow-y-auto">
                                        <div className="text-xs text-muted-foreground mb-2 pb-2 border-b">
                                            {selectedFacility?.name} &gt; {selectedRack?.name}
                                        </div>
                                        {boxes.length === 0 ? (
                                            <div className="text-center py-8 text-sm text-muted-foreground">暂无盒子</div>
                                        ) : (
                                            boxes.map((box) => (
                                                <button
                                                    key={box.id}
                                                    onClick={() => handleBoxClick(box)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedBox?.id === box.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-sm">{box.name}</span>
                                                        <Badge variant={selectedBox?.id === box.id ? 'secondary' : 'outline'}>
                                                            {box.occupied}/{box.total}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${getOccupancyColor(Math.round(box.occupied / box.total * 100))}`}
                                                            style={{ width: `${Math.round(box.occupied / box.total * 100)}%` }}
                                                        />
                                                    </div>
                                                </button>
                                            ))
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
            </div>

            {/* Batch Operation Dialogs */}
            <BatchCheckInDialog
                open={checkInDialogOpen}
                onOpenChange={setCheckInDialogOpen}
                slotIds={selectedSlotIds}
                onSuccess={handleDialogSuccess}
            />
            <BatchCheckOutDialog
                open={checkOutDialogOpen}
                onOpenChange={setCheckOutDialogOpen}
                sampleIds={selectedSampleIds}
                onSuccess={handleDialogSuccess}
            />
            <BatchEditDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                sampleIds={selectedSampleIds}
                onSuccess={handleDialogSuccess}
            />
        </AppLayout>
    )
}
