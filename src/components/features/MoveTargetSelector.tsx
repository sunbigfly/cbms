'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Box, Database } from 'lucide-react'

// Demo data for facilities/racks/boxes
const demoFacilities = [
    { id: '1', name: 'Master Cell Bank' },
    { id: '2', name: 'Working Cell Bank' },
    { id: '3', name: 'LN2 Tank A' },
]

const demoRacks = [
    { id: 'r1', name: 'Rack 01', facilityId: '1' },
    { id: 'r2', name: 'Rack 02', facilityId: '1' },
    { id: 'r3', name: 'Rack 03', facilityId: '2' },
]

const demoBoxes = [
    { id: 'b1', name: 'Box-1A', rackId: 'r1', emptySlots: 9 },
    { id: 'b2', name: 'Box-1B', rackId: 'r1', emptySlots: 23 },
    { id: 'b3', name: 'Box-2A', rackId: 'r2', emptySlots: 15 },
]

interface MoveTargetSelectorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sample?: {
        id: string
        name: string
        currentLocation: string
    }
    onConfirm: (targetSlotId: string, targetLocation: string) => void
}

export function MoveTargetSelector({ open, onOpenChange, sample, onConfirm }: MoveTargetSelectorProps) {
    const [selectedFacility, setSelectedFacility] = useState('')
    const [selectedRack, setSelectedRack] = useState('')
    const [selectedBox, setSelectedBox] = useState('')
    const [selectedSlot, setSelectedSlot] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const availableRacks = demoRacks.filter(r => r.facilityId === selectedFacility)
    const availableBoxes = demoBoxes.filter(b => b.rackId === selectedRack)

    // Generate demo slots for selected box
    const selectedBoxData = demoBoxes.find(b => b.id === selectedBox)
    const availableSlots = selectedBoxData
        ? Array.from({ length: selectedBoxData.emptySlots }, (_, i) => {
            const row = Math.floor(i / 9)
            const col = i % 9
            return {
                id: `slot-${selectedBox}-${i}`,
                label: `${String.fromCharCode(65 + row)}${col + 1}`,
            }
        })
        : []

    const handleConfirm = async () => {
        if (!selectedSlot) return

        setIsSubmitting(true)
        try {
            await new Promise(resolve => setTimeout(resolve, 300))

            const facility = demoFacilities.find(f => f.id === selectedFacility)
            const rack = demoRacks.find(r => r.id === selectedRack)
            const box = demoBoxes.find(b => b.id === selectedBox)
            const slot = availableSlots.find(s => s.id === selectedSlot)

            const targetLocation = `${facility?.name} > ${rack?.name} > ${box?.name} > ${slot?.label}`
            onConfirm(selectedSlot, targetLocation)

            // Reset
            setSelectedFacility('')
            setSelectedRack('')
            setSelectedBox('')
            setSelectedSlot('')
            onOpenChange(false)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!sample) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        选择目标位置
                    </DialogTitle>
                    <DialogDescription>
                        为样本 &quot;{sample.name}&quot; 选择新的存储位置
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Current Location */}
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline">当前位置</Badge>
                                <span className="text-muted-foreground">{sample.currentLocation}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Target Selection */}
                    <div className="grid gap-4">
                        {/* Facility */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                选择设施
                            </Label>
                            <Select value={selectedFacility} onValueChange={(v) => {
                                setSelectedFacility(v)
                                setSelectedRack('')
                                setSelectedBox('')
                                setSelectedSlot('')
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择设施" />
                                </SelectTrigger>
                                <SelectContent>
                                    {demoFacilities.map((f) => (
                                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Rack */}
                        {selectedFacility && (
                            <div className="space-y-2">
                                <Label>选择货架</Label>
                                <Select value={selectedRack} onValueChange={(v) => {
                                    setSelectedRack(v)
                                    setSelectedBox('')
                                    setSelectedSlot('')
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择货架" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableRacks.map((r) => (
                                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Box */}
                        {selectedRack && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Box className="h-4 w-4" />
                                    选择冻存盒
                                </Label>
                                <Select value={selectedBox} onValueChange={(v) => {
                                    setSelectedBox(v)
                                    setSelectedSlot('')
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择冻存盒" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableBoxes.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.name} ({b.emptySlots} 空位)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Slot */}
                        {selectedBox && (
                            <div className="space-y-2">
                                <Label>选择槽位</Label>
                                <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择槽位" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSlots.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {selectedSlot && (
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Badge>新位置</Badge>
                                    <span className="font-medium">
                                        {demoFacilities.find(f => f.id === selectedFacility)?.name} &gt; {' '}
                                        {demoRacks.find(r => r.id === selectedRack)?.name} &gt; {' '}
                                        {demoBoxes.find(b => b.id === selectedBox)?.name} &gt; {' '}
                                        {availableSlots.find(s => s.id === selectedSlot)?.label}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedSlot || isSubmitting}>
                        {isSubmitting ? '移动中...' : '确认移动'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
