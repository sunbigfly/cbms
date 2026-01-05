# Product Requirement Document (PRD): Cell Bank Management System (CBMS) Refactoring

> **Version**: 1.0
> **Date**: 2026-01-04
> **Status**: DRAFT
> **Tech Stack**: Next.js 15, Prisma 6, shadcn/ui, Recharts

## 1. Project Overview

### 1.1 Goal
Refactor the existing Excel/VB-based Cell Bank Management System into a modern, web-based (SaaS-ready) application. The new system will solve the limitations of the legacy system (single-user, single-library, lack of audit) by introducing **Multi-Depot Support**, **Dynamic Spatial Hierarchies**, and **Full Audit Trails**.

### 1.2 Target Audience
- **Lab Managers**: Configure facility structures, manage user permissions, view capacity reports.
- **Lab Technicians**: Daily input/output of samples, querying locations.

---

## 2. Information Architecture (Web Layout)

The application will adopt a modern Single Page Application (SPA) layout with a consistent **Top Navigation Bar**.

| Section | Description | Key Features |
| :--- | :--- | :--- |
| **Dashboard** | Operational Command Center | Global capacity, Alert widgets, Quick actions. |
| **Inventory** | Core Management Interface | "Spatial Card" explorer, Search, Grid View. |
| **Audit** | Compliance & History | Immutable logs of all actions. |
| **Reports** | Analytics & Data | Usage trends, CSV Export/Import. |
| **Settings** | Configuration | Facility setup, User roles, Field presets. |

---

## 3. Visualization Strategy: "Spatial Card View" (Selected)

We will implement a **Physical Hierarchy Replication** model to minimize cognitive load for users transitioning from physical work to digital recording.

### 3.1 Level 1: Facility View (The Lab)
- **UI**: A grid of "Facility Cards".
- **Card Content**:
    - **Title**: Facility Name (e.g., "-80°C Freezer A").
    - **Visual**: A "Donut Chart" showing overall capacity (e.g., 85% Full).
    - **Stats**: "Total Racks: 4", "Free Slots: 120".
- **Interaction**: Click card to enter **Rack View**.

### 3.2 Level 2: Rack View (The Interior)
- **UI**: A horizontal scroll or grid layout representing the physical arrangement of racks.
- **Visual**: Each Rack is displayed as a vertical column of Shelves (Drawers).
    - **Shelf Indicators**: Color-coded bars (Green=Empty, Yellow=Partial, Red=Full).
- **Interaction**: Click a specific Shelf to view **Box List/Grid**.

### 3.3 Level 3: Box View (The Matrix)
- **UI**: 
    - Left: List of boxes on this shelf.
    - Center: **The Interactive Grid** (9x9 or 10x10).
- **Grid Interactions**:
    - **Hover**: Tooltip with Cell Name, Type, Passage #.
    - **Click**: Select slot (opens Detail Sheet).
    - **Shift+Click**: Multi-select for Batch Ops.
    - **Drag & Drop**: Move sample from Slot A to Slot B (triggers rapid audit log).

---

## 4. Functional Requirements

### 4.1 Facility & Hierarchy Management (Admin)
*   **System Initialization**:
    *   **Wizard Step 1**: Create Facility (Name, Type).
    *   **Wizard Step 2**: Define Racks (Quantity, Naming Prefix).
    *   **Wizard Step 3**: Define Shelves per Rack.
    *   **Wizard Step 4**: Define Box Template (Default 9x9, 10x10, or Custom rows/cols).
*   **Flexibility**: Admin can override specific shelf configurations later (e.g., "Shelf 5 holds 5x5 boxes").

### 4.2 Core Inventory Operations
*   **Check In (Input)**:
    *   Click empty slot -> File "Compound Form" -> Save.
    *   Batch Input: Select 10 slots -> Apply same "Cell Name/Type" -> Auto-increment IDs if needed.
*   **Check Out (Output)**:
    *   Select slot(s) -> Click "Check Out".
    *   System requires "Reason" (User Choice: "Experiment", "Destroy", "Transfer").
    *   Slot becomes empty; History recorded.
*   **Move / Transfer**:
    *   Select slot(s) -> Click "Move".
    *   **Workflow**: Pop-up Dialog asks for "Target Location" (Navigator: Library->Rack->Box->Slot) OR "Paste" into a new location if "Cut" was clicked.
*   **Edit**:
    *   Modify metadata (e.g., add Notes).
    *   *Critical*: Changing "Cell Name" or "ID" tracks old vs new value for audit.

### 4.3 Search & Discovery
*   **Global Search**: Top bar input. Searches `Cell Name`, `Batch No`, `Owner`.
*   **Result View**: List of matching samples with direct "Go to Location" link.

### 4.4 Data Import/Export
*   **CSV Import**:
    *   Download Template: Columns `CellName`, `Type`, `Rack`, `Shelf`, `Box`, `Row`, `Col`.
    *   **Collision Detection**: Validator checks if target coordinates are occupied. Returns error summary before commit.
*   **CSV Export**:
    *   Export current view or search results to standard CSV.

---

## 5. Data Model (Schema Design)

> **Note**: Uses Prisma Schema syntax.

### 5.1 Spatial Entities
*   **StorageFacility**: `id`, `name`, `type`, `totalRacks`.
*   **Rack**: `id`, `facilityId`, `name`, `code` (e.g., "R1"), `totalShelves`.
*   **Shelf**: `id`, `rackId`, `name` (e.g., "Drawer 1"), `order`.
*   **Box**: `id`, `shelfId`, `name`, `rows` (Int), `columns` (Int), `gridType` (Labeling: ALPHANUMERIC vs NUMERIC).
*   **Slot**: `id`, `boxId`, `position` (Index), `rowLabel`, `colLabel`.

### 5.2 Biological Entities
*   **Sample**:
    *   `id` (UUID)
    *   `slotId` (Relational Link)
    *   `name` (e.g., "CHO")
    *   `type` (e.g., "Hamster Ovary")
    *   `batchNo`
    *   `passage` (e.g., "P3")
    *   `viability` (Float)
    *   `owner` (String)

### 5.3 Audit Entities
*   **AuditLog**:
    *   `id`
    *   `action` (IN, OUT, MOVE, EDIT)
    *   `targetId` (Sample ID)
    *   `operator` (User ID)
    *   `timestamp`
    *   `details` (JSON: `{ "oldVal": "P3", "newVal": "P4" }`)

---

## 6. Non-Functional Requirements
*   **Performance**: Grid view must render <200ms.
*   **Responsive**: Layout compatible with Tablets (iPad) for lab bench use.
*   **Security**: Role-based access (Admin vs Technician).

---

## 7. Migration Strategy (Legacy VB to Web)
1.  **Export**: Dump VB database to CSV.
2.  **Cleanse**: Normalize "Cell Types" and "Owners".
3.  **Import**: Use the new "CSV Import" feature to populate the initial database.
