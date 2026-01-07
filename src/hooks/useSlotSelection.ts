'use client'

import { useState, useCallback, useMemo } from 'react'

// Types
export interface SlotInfo {
    id: string
    position: number
    rowLabel: string
    colLabel: string
    status: 'EMPTY' | 'OCCUPIED' | 'RESERVED'
    sample?: {
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
    } | null
}

export type SelectionType = 'empty' | 'occupied' | 'mixed' | null

// Choice for mixed selection
export type MixedSelectionChoice = 'samples' | 'empty' | 'cancel'

interface UseSlotSelectionReturn {
    selectedSlots: Set<string>
    selectionType: SelectionType
    lastClickedPosition: number | null
    handleSlotClick: (slot: SlotInfo, event: React.MouseEvent) => void
    clearSelection: () => void
    selectRange: (startPos: number, endPos: number, slots: SlotInfo[], columns: number) => void
    getSelectedSlotIds: () => string[]
    isSelected: (slotId: string) => boolean
    // Drag selection
    isDragging: boolean
    dragStartPos: { row: number; col: number } | null
    dragEndPos: { row: number; col: number } | null
    handleDragStart: (row: number, col: number, event: React.MouseEvent) => void
    handleDragMove: (row: number, col: number) => void
    handleDragEnd: () => void
    isInDragSelection: (row: number, col: number) => boolean
    // Mixed selection dialog
    showMixedChoiceDialog: boolean
    pendingMixedSlots: { occupied: SlotInfo[]; empty: SlotInfo[] } | null
    handleMixedChoice: (choice: MixedSelectionChoice) => void
}

/**
 * Hook for managing slot selection with Shift (block) and Ctrl (toggle) modifiers
 */
export function useSlotSelection(
    slots: SlotInfo[],
    columns: number,
    onMixedSelectionError?: () => void // Keep for backward compatibility
): UseSlotSelectionReturn {
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
    const [lastClickedPosition, setLastClickedPosition] = useState<number | null>(null)

    // Drag selection state
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartPos, setDragStartPos] = useState<{ row: number; col: number } | null>(null)
    const [dragEndPos, setDragEndPos] = useState<{ row: number; col: number } | null>(null)

    // Mixed selection choice dialog state
    const [showMixedChoiceDialog, setShowMixedChoiceDialog] = useState(false)
    const [pendingMixedSlots, setPendingMixedSlots] = useState<{ occupied: SlotInfo[]; empty: SlotInfo[]; append: boolean } | null>(null)

    // Build slot map for quick lookup
    const slotMap = useMemo(() => {
        const map = new Map<number, SlotInfo>()
        slots.forEach(slot => map.set(slot.position, slot))
        return map
    }, [slots])

    // Determine current selection type
    const selectionType = useMemo<SelectionType>(() => {
        if (selectedSlots.size === 0) return null

        let hasEmpty = false
        let hasOccupied = false

        for (const slotId of selectedSlots) {
            const slot = slots.find(s => s.id === slotId)
            if (!slot) continue

            if (slot.status === 'OCCUPIED') {
                hasOccupied = true
            } else {
                hasEmpty = true
            }

            if (hasEmpty && hasOccupied) return 'mixed'
        }

        return hasOccupied ? 'occupied' : 'empty'
    }, [selectedSlots, slots])

    // Check if adding a slot would create mixed selection
    const wouldCreateMixedSelection = useCallback((currentType: SelectionType, newSlotStatus: string): boolean => {
        if (currentType === null) return false
        if (currentType === 'mixed') return true

        const newIsOccupied = newSlotStatus === 'OCCUPIED'
        return (currentType === 'empty' && newIsOccupied) || (currentType === 'occupied' && !newIsOccupied)
    }, [])

    // Handle mixed selection choice
    const handleMixedChoice = useCallback((choice: MixedSelectionChoice) => {
        if (!pendingMixedSlots) {
            setShowMixedChoiceDialog(false)
            return
        }

        if (choice === 'cancel') {
            setShowMixedChoiceDialog(false)
            setPendingMixedSlots(null)
            return
        }

        // Get the slots to keep based on choice
        const slotsToKeep = choice === 'samples' ? pendingMixedSlots.occupied : pendingMixedSlots.empty

        // Always replace selection with only the chosen type
        setSelectedSlots(new Set(slotsToKeep.map(s => s.id)))

        // Update last clicked position
        if (slotsToKeep.length > 0) {
            setLastClickedPosition(slotsToKeep[Math.floor(slotsToKeep.length / 2)]?.position ?? null)
        }

        setShowMixedChoiceDialog(false)
        setPendingMixedSlots(null)
    }, [pendingMixedSlots])

    // Select a rectangular range (for Shift+click) - NOW APPENDS to existing selection
    const selectRange = useCallback((startPos: number, endPos: number, allSlots: SlotInfo[], cols: number) => {
        // Convert positions to row/col
        const startRow = Math.floor((startPos - 1) / cols)
        const startCol = (startPos - 1) % cols
        const endRow = Math.floor((endPos - 1) / cols)
        const endCol = (endPos - 1) % cols

        const minRow = Math.min(startRow, endRow)
        const maxRow = Math.max(startRow, endRow)
        const minCol = Math.min(startCol, endCol)
        const maxCol = Math.max(startCol, endCol)

        // Collect all slots in the rectangle
        const rangeSlots: SlotInfo[] = []
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const pos = r * cols + c + 1
                const slot = slotMap.get(pos)
                if (slot) rangeSlots.push(slot)
            }
        }

        // Separate by type
        const occupiedSlots = rangeSlots.filter(s => s.status === 'OCCUPIED')
        const emptySlots = rangeSlots.filter(s => s.status !== 'OCCUPIED')
        const hasEmpty = emptySlots.length > 0
        const hasOccupied = occupiedSlots.length > 0

        // Mixed selection: select ALL slots (both types) and show/update choice UI
        if (hasEmpty && hasOccupied) {
            // If already showing mixed choice dialog, accumulate the selection
            if (showMixedChoiceDialog && pendingMixedSlots) {
                // Append new slots to existing selection
                setSelectedSlots(prev => {
                    const newSet = new Set(prev)
                    rangeSlots.forEach(s => newSet.add(s.id))
                    return newSet
                })
                // Accumulate pending mixed slots
                setPendingMixedSlots({
                    occupied: [...pendingMixedSlots.occupied, ...occupiedSlots],
                    empty: [...pendingMixedSlots.empty, ...emptySlots],
                    append: true
                })
                return
            }

            // Check if already have a selection of one type (not mixed)
            if (selectedSlots.size > 0 && selectionType && selectionType !== 'mixed') {
                // Append only compatible slots to existing selection
                const compatibleSlots = selectionType === 'occupied' ? occupiedSlots : emptySlots
                if (compatibleSlots.length > 0) {
                    setSelectedSlots(prev => {
                        const newSet = new Set(prev)
                        compatibleSlots.forEach(s => newSet.add(s.id))
                        return newSet
                    })
                }
            } else {
                // Select ALL slots (both occupied and empty) and show choice buttons
                setSelectedSlots(new Set(rangeSlots.map(s => s.id)))
                setPendingMixedSlots({ occupied: occupiedSlots, empty: emptySlots, append: false })
                setShowMixedChoiceDialog(true)
            }
            return
        }
        // No mixed selection in new range, but check if we're in mixed choice mode
        if (showMixedChoiceDialog && pendingMixedSlots) {
            // Accumulate to existing mixed selection
            setSelectedSlots(prev => {
                const newSet = new Set(prev)
                rangeSlots.forEach(s => newSet.add(s.id))
                return newSet
            })
            setPendingMixedSlots({
                occupied: hasOccupied
                    ? [...pendingMixedSlots.occupied, ...occupiedSlots]
                    : pendingMixedSlots.occupied,
                empty: hasEmpty
                    ? [...pendingMixedSlots.empty, ...emptySlots]
                    : pendingMixedSlots.empty,
                append: true
            })
            return
        }

        // No mixed selection - append to existing (if compatible type)
        if (selectedSlots.size > 0 && selectionType && selectionType !== 'mixed') {
            const rangeType = hasOccupied ? 'occupied' : 'empty'
            if (selectionType !== rangeType) {
                // Select ALL and let user choose
                setSelectedSlots(new Set(rangeSlots.map(s => s.id)))
                setPendingMixedSlots({ occupied: occupiedSlots, empty: emptySlots, append: false })
                setShowMixedChoiceDialog(true)
                return
            }
        }

        // Append selection (compatible type, no mixed state)
        setSelectedSlots(prev => {
            const newSet = new Set(prev)
            rangeSlots.forEach(s => newSet.add(s.id))
            return newSet
        })
    }, [slotMap, selectedSlots, selectionType, showMixedChoiceDialog, pendingMixedSlots])

    // Handle slot click with modifiers
    const handleSlotClick = useCallback((slot: SlotInfo, event: React.MouseEvent) => {
        const isCtrl = event.ctrlKey || event.metaKey
        const isShift = event.shiftKey

        if (isShift && lastClickedPosition !== null) {
            // Shift+click: select range
            selectRange(lastClickedPosition, slot.position, slots, columns)
            setLastClickedPosition(slot.position)
            return
        }

        if (isCtrl) {
            // Ctrl+click: toggle single slot
            const slotIsSelected = selectedSlots.has(slot.id)
            const slotIsOccupied = slot.status === 'OCCUPIED'

            if (slotIsSelected) {
                // Remove from selection
                setSelectedSlots(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(slot.id)
                    return newSet
                })

                // Update pending mixed slots if in mixed mode
                if (showMixedChoiceDialog && pendingMixedSlots) {
                    if (slotIsOccupied) {
                        const newOccupied = pendingMixedSlots.occupied.filter(s => s.id !== slot.id)
                        if (newOccupied.length === 0 || pendingMixedSlots.empty.length === 0) {
                            // No longer mixed, clear dialog
                            setShowMixedChoiceDialog(false)
                            setPendingMixedSlots(null)
                        } else {
                            setPendingMixedSlots({ ...pendingMixedSlots, occupied: newOccupied })
                        }
                    } else {
                        const newEmpty = pendingMixedSlots.empty.filter(s => s.id !== slot.id)
                        if (newEmpty.length === 0 || pendingMixedSlots.occupied.length === 0) {
                            // No longer mixed, clear dialog
                            setShowMixedChoiceDialog(false)
                            setPendingMixedSlots(null)
                        } else {
                            setPendingMixedSlots({ ...pendingMixedSlots, empty: newEmpty })
                        }
                    }
                }
            } else {
                // Add to selection
                setSelectedSlots(prev => {
                    const newSet = new Set(prev)
                    newSet.add(slot.id)
                    return newSet
                })

                // If in mixed mode, accumulate
                if (showMixedChoiceDialog && pendingMixedSlots) {
                    if (slotIsOccupied) {
                        setPendingMixedSlots({
                            ...pendingMixedSlots,
                            occupied: [...pendingMixedSlots.occupied, slot]
                        })
                    } else {
                        setPendingMixedSlots({
                            ...pendingMixedSlots,
                            empty: [...pendingMixedSlots.empty, slot]
                        })
                    }
                } else if (selectedSlots.size > 0) {
                    // Check if this creates a mixed selection
                    const currentType = selectionType
                    if (wouldCreateMixedSelection(currentType, slot.status)) {
                        // Create mixed selection state
                        const allSelected = Array.from(selectedSlots).map(id => slots.find(s => s.id === id)!).filter(Boolean)
                        const occupiedSlots = allSelected.filter(s => s.status === 'OCCUPIED')
                        const emptySlots = allSelected.filter(s => s.status !== 'OCCUPIED')
                        if (slotIsOccupied) {
                            occupiedSlots.push(slot)
                        } else {
                            emptySlots.push(slot)
                        }
                        setPendingMixedSlots({ occupied: occupiedSlots, empty: emptySlots, append: true })
                        setShowMixedChoiceDialog(true)
                    }
                }
            }
            setLastClickedPosition(slot.position)
            return
        }

        // Normal click: single select - clear any pending mixed choice
        if (showMixedChoiceDialog) {
            setShowMixedChoiceDialog(false)
            setPendingMixedSlots(null)
        }
        setSelectedSlots(new Set([slot.id]))
        setLastClickedPosition(slot.position)
    }, [lastClickedPosition, selectRange, slots, columns, selectionType, wouldCreateMixedSelection, showMixedChoiceDialog, pendingMixedSlots, selectedSlots])

    // Clear all selections
    const clearSelection = useCallback(() => {
        setSelectedSlots(new Set())
        setLastClickedPosition(null)
    }, [])

    // Get array of selected slot IDs
    const getSelectedSlotIds = useCallback(() => {
        return Array.from(selectedSlots)
    }, [selectedSlots])

    // Check if a slot is selected
    const isSelected = useCallback((slotId: string) => {
        return selectedSlots.has(slotId)
    }, [selectedSlots])

    // Handle drag start
    const handleDragStart = useCallback((row: number, col: number, event: React.MouseEvent) => {
        // Only start drag on left mouse button
        if (event.button !== 0) return
        // Do not preventDefault to allow click events to fire naturally
        setIsDragging(true)
        setDragStartPos({ row, col })
        setDragEndPos({ row, col })
    }, [])

    // Handle drag move
    const handleDragMove = useCallback((row: number, col: number) => {
        if (!isDragging) return
        setDragEndPos({ row, col })
    }, [isDragging])

    // Handle drag end - apply selection
    const handleDragEnd = useCallback((event?: React.MouseEvent) => {
        if (!isDragging || !dragStartPos || !dragEndPos) {
            setIsDragging(false)
            setDragStartPos(null)
            setDragEndPos(null)
            return
        }

        // Check if it is a click (start == end) - defer to onClick handler
        if (dragStartPos.row === dragEndPos.row && dragStartPos.col === dragEndPos.col) {
            setIsDragging(false)
            setDragStartPos(null)
            setDragEndPos(null)
            return
        }

        // Calculate rectangle bounds
        const minRow = Math.min(dragStartPos.row, dragEndPos.row)
        const maxRow = Math.max(dragStartPos.row, dragEndPos.row)
        const minCol = Math.min(dragStartPos.col, dragEndPos.col)
        const maxCol = Math.max(dragStartPos.col, dragEndPos.col)

        // Collect all slots in the rectangle
        const rangeSlots: SlotInfo[] = []
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const pos = r * columns + c + 1
                const slot = slotMap.get(pos)
                if (slot) rangeSlots.push(slot)
            }
        }

        if (rangeSlots.length === 0) {
            setIsDragging(false)
            setDragStartPos(null)
            setDragEndPos(null)
            return
        }

        // Determine if we should append to existing selection
        const isAppend = event?.ctrlKey || event?.metaKey || event?.shiftKey

        // Separate by type
        const occupiedSlots = rangeSlots.filter(s => s.status === 'OCCUPIED')
        const emptySlots = rangeSlots.filter(s => s.status !== 'OCCUPIED')
        const rangeHasEmpty = emptySlots.length > 0
        const rangeHasOccupied = occupiedSlots.length > 0

        // Mixed selection: select ALL slots and show/update choice UI
        if (rangeHasEmpty && rangeHasOccupied) {
            // If already showing mixed choice dialog, accumulate the selection
            if (showMixedChoiceDialog && pendingMixedSlots) {
                setSelectedSlots(prev => {
                    const newSet = new Set(prev)
                    rangeSlots.forEach(s => newSet.add(s.id))
                    return newSet
                })
                // Accumulate pending mixed slots
                setPendingMixedSlots({
                    occupied: [...pendingMixedSlots.occupied, ...occupiedSlots],
                    empty: [...pendingMixedSlots.empty, ...emptySlots],
                    append: true
                })
                setIsDragging(false)
                setDragStartPos(null)
                setDragEndPos(null)
                return
            }

            // Select ALL slots (both types) and show choice buttons
            if (isAppend) {
                setSelectedSlots(prev => {
                    const newSet = new Set(prev)
                    rangeSlots.forEach(s => newSet.add(s.id))
                    return newSet
                })
            } else {
                setSelectedSlots(new Set(rangeSlots.map(s => s.id)))
            }
            setPendingMixedSlots({ occupied: occupiedSlots, empty: emptySlots, append: isAppend || false })
            setShowMixedChoiceDialog(true)
            setIsDragging(false)
            setDragStartPos(null)
            setDragEndPos(null)
            return
        }

        const rangeType = rangeHasOccupied ? 'occupied' : 'empty'

        // If appending, check against existing selection
        if (isAppend && selectedSlots.size > 0 && selectionType) {
            if (selectionType !== 'mixed' && selectionType !== rangeType) {
                // Mixed types - select all and show choice
                setSelectedSlots(prev => {
                    const newSet = new Set(prev)
                    rangeSlots.forEach(s => newSet.add(s.id))
                    return newSet
                })
                setPendingMixedSlots({ occupied: occupiedSlots, empty: emptySlots, append: true })
                setShowMixedChoiceDialog(true)
                setIsDragging(false)
                setDragStartPos(null)
                setDragEndPos(null)
                return
            }
        }

        // No mixed selection in new range, but check if we're in mixed choice mode
        if (showMixedChoiceDialog && pendingMixedSlots) {
            // Accumulate to existing mixed selection
            setSelectedSlots(prev => {
                const newSet = new Set(prev)
                rangeSlots.forEach(s => newSet.add(s.id))
                return newSet
            })
            setPendingMixedSlots({
                occupied: rangeHasOccupied
                    ? [...pendingMixedSlots.occupied, ...occupiedSlots]
                    : pendingMixedSlots.occupied,
                empty: rangeHasEmpty
                    ? [...pendingMixedSlots.empty, ...emptySlots]
                    : pendingMixedSlots.empty,
                append: true
            })
            setIsDragging(false)
            setDragStartPos(null)
            setDragEndPos(null)
            return
        }

        // Apply selection (compatible type, no mixed state)
        if (isAppend) {
            setSelectedSlots(prev => {
                const newSet = new Set(prev)
                rangeSlots.forEach(s => newSet.add(s.id))
                return newSet
            })
        } else {
            setSelectedSlots(new Set(rangeSlots.map(s => s.id)))
        }

        // Update last clicked position to center of selection
        const centerPos = rangeSlots[Math.floor(rangeSlots.length / 2)]?.position
        if (centerPos) setLastClickedPosition(centerPos)

        setIsDragging(false)
        setDragStartPos(null)
        setDragEndPos(null)
    }, [isDragging, dragStartPos, dragEndPos, columns, slotMap, selectedSlots, selectionType, showMixedChoiceDialog, pendingMixedSlots])

    // Check if a cell is in the current drag selection area
    const isInDragSelection = useCallback((row: number, col: number) => {
        if (!isDragging || !dragStartPos || !dragEndPos) return false
        const minRow = Math.min(dragStartPos.row, dragEndPos.row)
        const maxRow = Math.max(dragStartPos.row, dragEndPos.row)
        const minCol = Math.min(dragStartPos.col, dragEndPos.col)
        const maxCol = Math.max(dragStartPos.col, dragEndPos.col)
        return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
    }, [isDragging, dragStartPos, dragEndPos])

    return {
        selectedSlots,
        selectionType,
        lastClickedPosition,
        handleSlotClick,
        clearSelection,
        selectRange,
        getSelectedSlotIds,
        isSelected,
        // Drag selection
        isDragging,
        dragStartPos,
        dragEndPos,
        handleDragStart,
        handleDragMove,
        handleDragEnd,
        isInDragSelection,
        // Mixed selection dialog
        showMixedChoiceDialog,
        pendingMixedSlots: pendingMixedSlots ? { occupied: pendingMixedSlots.occupied, empty: pendingMixedSlots.empty } : null,
        handleMixedChoice,
    }
}
