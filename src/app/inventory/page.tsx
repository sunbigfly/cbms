'use client'

import { TopNav } from '@/components/features/TopNav'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SampleEntryForm } from '@/components/features/SampleEntryForm'
import {
    ChevronRight,
    Plus,
    Loader2,
    Building2,
    LayoutGrid,
    Package,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

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
    shelves: number
    occupancy: number
    shelvesDetail?: ShelfDetail[]
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

interface BoxDetail {
    id: string
    name: string
    rows: number
    columns: number
    slots: Slot[]
}

// Utility: Get color based on occupancy
function getOccupancyColor(occupancy: number): string {
    if (occupancy === 0) return 'bg-muted'
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

// Box Grid Component
function BoxGrid({ box }: { box: BoxDetail | null }) {
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

    return (
        <div className="p-4">
            {/* Column headers */}
            <div className="flex gap-1 mb-1 ml-6">
                {Array.from({ length: columns }, (_, i) => (
                    <div key={i} className="w-8 h-6 flex items-center justify-center text-xs text-muted-foreground font-medium">
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* Grid with row labels */}
            {Array.from({ length: rows }, (_, rowIndex) => (
                <div key={rowIndex} className="flex gap-1 mb-1">
                    <div className="w-5 h-8 flex items-center justify-center text-xs text-muted-foreground font-medium">
                        {rowLabels[rowIndex]}
                    </div>
                    {Array.from({ length: columns }, (_, colIndex) => {
                        const position = rowIndex * columns + colIndex + 1
                        const slot = slotMap.get(position)
                        const isOccupied = slot?.status === 'OCCUPIED'
                        return (
                            <button
                                key={colIndex}
                                className={`w-8 h-8 rounded-sm border transition-all hover:scale-110 hover:z-10 ${isOccupied
                                    ? 'bg-primary border-primary/50 hover:bg-primary/80'
                                    : 'bg-muted border-border hover:bg-accent'
                                    }`}
                                title={`${rowLabels[rowIndex]}${colIndex + 1}${isOccupied ? ` - ${slot?.sample?.name || '已占用'}` : ' - 空'}`}
                            />
                        )
                    })}
                </div>
            ))}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-sm bg-primary" />
                    <span>已占用</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-sm bg-muted border" />
                    <span>空闲</span>
                </div>
            </div>
        </div>
    )
}

type NavigationLevel = 'facility' | 'rack' | 'box'

export default function InventoryPage() {
    const [loading, setLoading] = useState(true)
    const [currentLevel, setCurrentLevel] = useState<NavigationLevel>('facility')

    // Data
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [racks, setRacks] = useState<Rack[]>([])
    const [boxes, setBoxes] = useState<BoxInfo[]>([])
    const [boxDetail, setBoxDetail] = useState<BoxDetail | null>(null)

    // Selections
    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)
    const [selectedRack, setSelectedRack] = useState<Rack | null>(null)
    const [selectedBox, setSelectedBox] = useState<BoxInfo | null>(null)

    const [sampleDialogOpen, setSampleDialogOpen] = useState(false)

    // Fetch facilities on mount
    useEffect(() => {
        async function fetchFacilities() {
            try {
                const res = await fetch('/api/inventory')
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
        fetchFacilities()
    }, [])

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
                const shelfBoxes = rack.shelves.flatMap((shelf: { boxes: BoxInfo[] }) =>
                    shelf.boxes.map((box: BoxInfo) => ({
                        ...box,
                        occupied: box.occupied || 0,
                        total: box.total || box.rows * box.columns,
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

    const handleSampleSuccess = () => {
        setSampleDialogOpen(false)
        if (selectedBox) fetchBoxDetail(selectedBox.id)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <TopNav />
                <main className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <TopNav />

            <main className="container mx-auto px-4 py-6">
                <div className="mb-6">
                    <Breadcrumbs />
                </div>

                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">细胞数据详情</h1>
                        <p className="text-muted-foreground text-sm mt-1">浏览和管理存储设施中的样本</p>
                    </div>
                    <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                新增样本
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>添加新样本</DialogTitle>
                                <DialogDescription>填写样本信息进行入库</DialogDescription>
                            </DialogHeader>
                            <SampleEntryForm onSuccess={handleSampleSuccess} />
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Two Column Layout: Left Navigation + Right Grid */}
                <div className="grid gap-6 lg:grid-cols-12">

                    {/* LEFT: Tab Navigation */}
                    <div className="lg:col-span-5">
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
                                                                {rack.shelves} 层
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={selectedRack?.id === rack.id ? 'secondary' : 'outline'}>{rack.occupancy}%</Badge>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    {rack.shelvesDetail && (
                                                        <ChildProgressBar items={rack.shelvesDetail} onItemClick={(shelf) => handleShelfBarClick(shelf, rack.id)} />
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

                    {/* RIGHT: Box Grid (Always Visible) */}
                    <div className="lg:col-span-7">
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
                                <BoxGrid box={boxDetail} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
