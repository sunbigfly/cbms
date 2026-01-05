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
    } | null
}

export type SelectionType = 'empty' | 'occupied' | 'mixed' | null

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
}

/**
 * Hook for managing slot selection with Shift (block) and Ctrl (toggle) modifiers
 */
export function useSlotSelection(
    slots: SlotInfo[],
    columns: number,
    onMixedSelectionError?: () => void
): UseSlotSelectionReturn {
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
    const [lastClickedPosition, setLastClickedPosition] = useState<number | null>(null)

    // Drag selection state
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartPos, setDragStartPos] = useState<{ row: number; col: number } | null>(null)
    const [dragEndPos, setDragEndPos] = useState<{ row: number; col: number } | null>(null)

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

    // Select a rectangular range (for Shift+click)
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

        // Check for mixed types
        const hasEmpty = rangeSlots.some(s => s.status !== 'OCCUPIED')
        const hasOccupied = rangeSlots.some(s => s.status === 'OCCUPIED')

        if (hasEmpty && hasOccupied) {
            onMixedSelectionError?.()
            return
        }

        // Apply selection
        setSelectedSlots(new Set(rangeSlots.map(s => s.id)))
    }, [slotMap, onMixedSelectionError])

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
            setSelectedSlots(prev => {
                const newSet = new Set(prev)

                if (newSet.has(slot.id)) {
                    // Remove from selection
                    newSet.delete(slot.id)
                } else {
                    // Check if adding would create mixed selection
                    const currentType = selectionType
                    if (wouldCreateMixedSelection(currentType, slot.status)) {
                        onMixedSelectionError?.()
                        return prev
                    }
                    newSet.add(slot.id)
                }

                return newSet
            })
            setLastClickedPosition(slot.position)
            return
        }

        // Normal click: single select
        setSelectedSlots(new Set([slot.id]))
        setLastClickedPosition(slot.position)
    }, [lastClickedPosition, selectRange, slots, columns, selectionType, wouldCreateMixedSelection, onMixedSelectionError])

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
        event.preventDefault()
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
    const handleDragEnd = useCallback(() => {
        if (!isDragging || !dragStartPos || !dragEndPos) {
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

        // Check for mixed types
        const hasEmpty = rangeSlots.some(s => s.status !== 'OCCUPIED')
        const hasOccupied = rangeSlots.some(s => s.status === 'OCCUPIED')

        if (hasEmpty && hasOccupied) {
            onMixedSelectionError?.()
        } else if (rangeSlots.length > 0) {
            // Apply selection
            setSelectedSlots(new Set(rangeSlots.map(s => s.id)))
            // Update last clicked position to center of selection
            const centerPos = rangeSlots[Math.floor(rangeSlots.length / 2)]?.position
            if (centerPos) setLastClickedPosition(centerPos)
        }

        setIsDragging(false)
        setDragStartPos(null)
        setDragEndPos(null)
    }, [isDragging, dragStartPos, dragEndPos, columns, slotMap, onMixedSelectionError])

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
    }
}
