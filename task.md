# Project Tasks: Cell Bank Management System (CBMS)

> [!IMPORTANT]
> **CRITICAL RULES & MODEL SELECTION**
> 1.  **Backend Tasks**: REQUIRED Model: `claude-opus-4.5`. (Focus: Logic, Architecture, Security).
> 2.  **Frontend Tasks**: REQUIRED Model: `gemini-3-pro-high`. (Focus: Aesthetics, UX, Interactions).
> 3.  **Validation**: If current model capabilities do not match requirements, TERMINATE execution.
> 4.  **Tech Stack Constraint**: Strictly follow `README.md`. No deviations allowed.

## 🚀 Phase 1: Infrastructure & Project Setup
- [x] **1.1 Initialization**
    - [x] Initialize Next.js 15 project (`create-next-app`) <!-- id: 100 -->
    - [x] Configure Tailwind CSS & TypeScript <!-- id: 101 -->
    - [x] Setup Directory Structure (`/components`, `/lib`, `/server`) <!-- id: 102 -->
- [x] **1.2 UI Library Integration**
    - [x] Initialize `shadcn/ui` <!-- id: 103 -->
    - [x] Install Core Components (Button, Card, Dialog, Form, Input, Table, Sheet, Toast) <!-- id: 104 -->
    - [x] Configure Theme (Clinical Blue/White palette) <!-- id: 105 -->
- [x] **1.3 Database & Auth**
    - [x] Initialize Prisma & Connect to Local DB <!-- id: 106 -->
    - [x] Configure NextAuth (Credentials Provider) <!-- id: 107 -->

## 🗄️ Phase 2: Data Layer (The Backbone)
- [x] **2.1 Schema Definition**
    - [x] Define `StorageFacility`, `Rack`, `Shelf`, `Box`, `Slot` models <!-- id: 200 -->
    - [x] Define `Sample` model <!-- id: 201 -->
    - [x] Define `AuditLog` model <!-- id: 202 -->
    - [x] Run Migration `init-schema` <!-- id: 203 -->
- [x] **2.2 Seeding & DAL**
    - [x] Create Seed Script (Populate 1 Demo Fridge, Racks, Boxes) <!-- id: 204 -->
    - [x] Implement Data Access Layer (`server/db/facility.ts`, `server/db/sample.ts`) <!-- id: 205 -->

## 🏟️ Phase 3: Facility Management (The Container)
- [x] **3.1 Global Navigation**
    - [x] Implement `AppSidebar` / `TopNav` <!-- id: 300 -->
    - [x] Implement `Breadcrumbs` for Spatial Navigation <!-- id: 301 -->
- [x] **3.2 Admin Wizards**
    - [x] Feature: `CreateFacilityWizard` (Step-by-step form) <!-- id: 302 -->
    - [ ] Feature: `RackConfiguration` (Dynamic slot generation logic) <!-- id: 303 -->

## 🗺️ Phase 4: Visualization (The View)
- [x] **4.1 Macro View (Dashboard)**
    - [x] Component: `FacilityStatsCard` (Donut chart for capacity) <!-- id: 400 -->
    - [x] Component: `RackSkeleton` (Visual representation of shelves) <!-- id: 401 -->
- [x] **4.2 Micro View (Inventory Grid)**
    - [x] Component: `BoxGrid` (Dynamic CSS Grid 9x9/10x10) <!-- id: 402 -->
    - [x] Component: `SlotItem` (State: Empty/Occupied/Selected) <!-- id: 403 -->
    - [x] Feature: `GridNavigator` (Sidebar list of boxes) <!-- id: 404 -->

## 🧬 Phase 5: Core Operations (The Business Logic)
- [x] **5.1 Sample Input (Check In)**
    - [x] Component: `SampleEntryForm` (Compound Form with validation) <!-- id: 500 -->
    - [x] Action: `checkInSample` (Transaction: Create Sample + Update Slot) <!-- id: 501 -->
- [x] **5.2 Sample Output (Check Out)**
    - [x] Component: `CheckOutDialog` (Reason selection) <!-- id: 502 -->
    - [x] Action: `checkOutSample` (Transaction: Delete/Archive Sample + Log) <!-- id: 503 -->
- [x] **5.3 Move Operations**
    - [x] Component: `MoveTargetSelector` (Dialog to pick destination) <!-- id: 504 -->
    - [x] Action: `moveSample` (Transaction: Update SlotID + Log) <!-- id: 505 -->

## 📜 Phase 6: Audit & Reliability
- [x] **6.1 Audit Interface**
    - [x] Component: `AuditTable` (Filter by User/Action/Date) <!-- id: 600 -->
    - [ ] Feature: `SlotHistory` (Right-click slot -> View History) <!-- id: 601 -->
- [/] **6.2 Import/Export**
    - [ ] Feature: CSV Import Validator (Collision Detection) <!-- id: 602 -->
    - [ ] Feature: Export Box/Search Results to CSV <!-- id: 603 -->
