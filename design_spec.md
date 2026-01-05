# Cell Bank Management System (CBMS) - Design Specification

## 1. Core Domain Model (Entity Relationships)

The data model is designed to support **Multi-Depot**, **Flexible Hierarchy**, and **Full Audit Trails**. We use **Prisma Schema** notation for clarity and direct mapping to the tech stack.

### 1.1 Spatial Hierarchy (Physical Storage)

We adopt a strict hierarchical model to ensure data integrity and query performance.

```prisma
// Top level: The physical facility or major appliance (e.g., "Main Library", "Liquid Nitrogen Tank A")
model StorageFacility {
  id          String   @id @default(cuid())
  name        String   // e.g., "Master Bank", "Working Bank"
  type        String   // e.g., "-80C Freezer", "LN2 Tank"
  description String?
  
  // Capacity Configuration (Snapshot for visualization performance)
  totalRacks  Int      // How many racks this facility holds
  
  racks       Rack[]   // One Facility has many Racks
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Level 2: The physical rack or frame inside the facility
model Rack {
  id          String   @id @default(cuid())
  name        String   // e.g., "Rack 01"
  code        String   // e.g., "R01"
  
  // Capacity Configuration
  totalShelves Int     // How many shelves/drawers vertical
  
  facilityId  String
  facility    StorageFacility @relation(fields: [facilityId], references: [id])
  
  shelves     Shelf[]  // One Rack has many Shelves
}

// Level 3: The drawer or shelf within a rack
model Shelf {
  id          String   @id @default(cuid())
  name        String   // e.g., "Drawer 1", "Layer 3"
  order       Int      // Physical order (1 = Top)
  
  rackId      String
  rack        Rack     @relation(fields: [rackId], references: [id])
  
  boxes       Box[]    // One Shelf holds many Boxes
}

// Level 4: The actual container holding the samples
model Box {
  id          String   @id @default(cuid())
  name        String   // e.g., "CHO-Cells-001"
  barcode     String?  @unique
  
  // Dimensions for Dynamic Grid
  rows        Int      // e.g., 9
  columns     Int      // e.g., 10
  gridType    String   // e.g., "ALPHANUMERIC" (A1-H12) or "NUMERIC" (1-81)
  
  shelfId     String
  shelf       Shelf    @relation(fields: [shelfId], references: [id])
  
  slots       Slot[]   // A Box has fixed/virtual slots
}

// Level 5: The specific position provided by the Box
model Slot {
  id          String   @id @default(cuid())
  boxId       String
  box         Box      @relation(fields: [boxId], references: [id])
  
  // Coordinate Systems
  rowLabel    String   // "A"
  colLabel    String   // "1"
  position    Int      // Flattened index (e.g., 1)
  
  // Content
  status      String   // "EMPTY", "OCCUPIED", "RESERVED"
  sample      Sample?  // One-to-one relation
}
```

### 1.2 Biological Data (Samples)

```prisma
model Sample {
  id          String   @id @default(cuid())
  
  // Core Bio Data
  name        String   // "CHO"
  type        String   // "Chinese Hamster Ovary"
  batchNo     String?  // "20250422-01"
  
  // Cryo Data
  quantity    Float    // Volume
  unit        String   // "ml"
  concentration String // "2.8x10^6"
  viability   Float    // 0.988
  passage     String   // "P1"
  media       String?  // "CryoStor"
  
  // Location (One-to-One with Slot)
  slotId      String   @unique
  slot        Slot     @relation(fields: [slotId], references: [id])
  
  // Audit
  owner       String   // "Wang Haiyan"
  notes       String?
  
  auditLogs   AuditLog[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 1.3 Audit Trail (Full History)

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  action      String   // "CREATE", "MOVE", "CONSUME", "DESTROY", "UPDATE"
  
  // Snapshot of data BEFORE change (for diffing)
  previousData Json?
  newData      Json?
  
  // Who and What
  userId      String   // Operator
  sampleId    String?  // Related Sample
  sample      Sample?  @relation(fields: [sampleId], references: [id])
  
  description String   // Human readable: "Moved sample CHO-1 from Box A to Box B"
  
  timestamp   DateTime @default(now())
}
```

---

## 2. Web Layout & Navigation (Modernized)

**Architecture**: Single Page Application (SPA) with Top Navigation Bar.
**Theme**: Clean, Clinical Science Professional (Blues, Whites, Grays).

### 2.1 Top Navigation Structure
The app is divided into 5 clear sections as requested:

1.  **Dashboard (首页)**
    *   *Overview*: Global status, Recent activities, Capacity alerts.
2.  **Inventory (细胞数据详情)**
    *   *Explorer View*: The core visual interface for browsing Libraries -> Racks -> Boxes.
    *   *Search View*: Global search results list.
3.  **Audit (历史记录)**
    *   *Log Table*: Filterable table of all In/Out/Edit/Move actions.
4.  **Reports (报表)**
    *   *Analytics*: Capacity stats, Usage trends.
    *   *Export*: Data export tools.
5.  **Settings (系统设置)**
    *   *Facility Management*: Configure Libraries/Racks/Strategies.
    *   *User Management*: Role-based access.

---

## 3. Visualization Strategy (Multi-Depot)

### 3.1 Option A: The "Spatial Card" View (Recommended)
**Concept**: Real-world physical hierarchy replication.
*   **Level 1 (Facilities)**: A grid of Cards. Each Card represents a Fridge/Tank.
    *   *Visual*: A "Battery Indicator" or "Donut Chart" on the covered showing % Full. 
    *   *Action*: Click to open.
*   **Level 2 (Racks)**: Inside a facility, show Racks as vertical columns.
    *   *Visual*: A skeleton view of the rack with slots for shelves. Filled shelves are colored blue; empty are gray.
*   **Level 3 (Box Grid)**: The 9x9 or 10x10 interactive grid (as previously designed).

### 3.2 Option B: The "Heatmap Treemap" View
**Concept**: Data-density focus.
*   **Visual**: One large rectangle (The Lab) divided into smaller rectangles (Fridges), subdivided into Racks -> Boxes.
*   **Color Coding**: 
    *   Red = >90% Full (Critical)
    *   Green = <50% Full (Available)
*   **Best for**: "Where can I put these 50 new samples?" (Finding free space quickly).

---

## 4. Admin Configuration & Features

### 4.1 Dynamic Hierarchy Builder (Wizard)
When Admin creates a new Library, they follow a localized wizard:
1.  **Basic Info**: Name ("-80C Freezer A"), Type.
2.  **Rack Configuration**: "How many racks?" (e.g., 4). "Naming Pattern?" (Rack 1 - Rack 4).
3.  **Shelf Configuration**: "How many shelves per rack?" (e.g., 5).
4.  **Box Configuration**: "Default Box Format?" (e.g., 9x9 or 10x10).
    *   *Constraint*: This sets the *default*, but individual shelves can be overridden later.

### 4.2 Import/Export Logic
*   **CSV Import**:
    *   *Template*: Users download a strictly formatted CSV template.
    *   *Columns*: `CellName`, `Type`, `LocationString` (e.g., "FreezerA-Rack1-Shelf1-BoxA-A1"), `Date`, etc.
    *   *Validation*: System parses file -> Validates coordinates exist and are empty -> Shows preview -> Commits.
    *   *Error Handling*: "Row 5: Position A1 is already occupied."
*   **CSV Export**:
    *   *Scope*: Export Current Search Results, Export Whole Box, or Export Whole Library.

### 4.3 Preset Values
*   **Field**: `Cell Type`, `Media`, `Owner`.
*   **UI**: Combobox with "Create new..." option or strict Admin-defined lists (Configurable in Settings).


---

## 3. Workflow Improvements (VB to Web)

| VB Legacy Feature | Web Modernization |
| :--- | :--- |
| Manual "Type Layer No" | **Cascading Selects** or **Visual Navigator** (Click Facility -> Click Rack -> Click Box). |
| "Legend" fixed colors | **Dynamic Legend**: Auto-generated based on unique Cell Types in the current box. |
| "Bing Search" Button | **Internal Knowledge Base** or Integrated PubMed API search. |
| Manual "Input/Output" | **Drag & Drop** from "Bench" (Clipboard) to Box. |
| "Filter by Location" | **Global Search** (Command+K) to find "CHO" anywhere in the facility. |
