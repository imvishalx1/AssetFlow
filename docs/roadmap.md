# AssetFlow: Enterprise Asset & Resource Management System**Hackathon Project Blueprint & Implementation Roadmap**

---

## 1. Project Overview & Scope
AssetFlow is a centralized Enterprise Resource Planning (ERP) platform designed to simplify and digitize how organizations track, allocate, and maintain physical assets and shared resources[cite: 1].

* **Target Audience:** Any organization managing equipment, furniture, vehicles, or shared spaces (including offices, schools, hospitals, factories, and agencies)[cite: 1].
* **Core Problem Solved:** Replaces inefficient manual tracking (spreadsheets and paper logs) with structured asset lifecycles, centralized resource booking, and real-time visibility into asset location, holder, and condition[cite: 1].
* **Strict Scope Boundaries:** Focuses exclusively on core ERP functionality, clean architecture, secure role-based workflows, and scalable module design without touching purchasing, invoicing, or accounting concerns[cite: 1].

---

## 2. Core Engines & State Machines

### A. The 7-Stage Asset Lifecycle State Machine
Every asset in the system must dynamically transition between seven distinct operational states[cite: 1]:
1. **Available:** Ready to be allocated or booked[cite: 1].
2. **Allocated:** Currently assigned to an employee or department[cite: 1].
3. **Reserved:** Held for a specific future use or transfer[cite: 1].
4. **Under Maintenance:** Automatically triggered when a maintenance request is approved[cite: 1].
5. **Lost:** Automatically updated when confirmed missing during an audit cycle[cite: 1].
6. **Retired:** Taken out of active service due to age or wear[cite: 1].
7. **Disposed:** Permanently removed from the organization's inventory[cite: 1].

### B. The Two Conflict Prevention Engines
* **Double-Allocation Prevention Engine:** The system strictly prevents double-allocation of a single asset[cite: 1]. If an asset is already taken (e.g., Priya holds Laptop `AF-0114`), any attempt by another user to allocate it is blocked, displaying a *"currently held by Priya"* message and offering a **Transfer Request** button instead[cite: 1].
* **Resource Booking Overlap Validation Engine:** Shared resources (rooms, vehicles, equipment) are booked by time slots and protected by overlap validation[cite: 1]. For example, if Room B2 is booked from 9:00–10:00, a request for 9:30–10:30 is automatically rejected, while a request for 10:00–11:00 is permitted[cite: 1].

---

## 3. Role-Based Access Control (RBAC) Matrix

> **CRITICAL SECURITY RULE:** When a user signs up, the system must create an **Employee** account only; there is no role selection during signup to prevent self-elevating admin accounts[cite: 1]. Roles can only be promoted by an Admin within the Employee Directory[cite: 1].

| Role | Key Permissions & Responsibilities[cite: 1] |
| :--- | :--- |
| **Admin** | Manages master data (Departments, Asset Categories, Employee Directory), sets up audit cycles, promotes employees to higher roles, and views organization-wide analytics[cite: 1]. |
| **Asset Manager** | Registers new assets, allocates equipment, and approves transfer requests, maintenance repairs, asset returns, and audit discrepancy resolutions[cite: 1]. |
| **Department Head** | Views assets allocated to their department, approves allocation/transfer requests within their department, and books shared resources on behalf of the department[cite: 1]. |
| **Employee** | Default signup role[cite: 1]. Views personal allocated assets, books shared resources, raises maintenance requests, and initiates return or transfer requests[cite: 1]. |

---

## 4. The 10 Core Modules (Feature Specifications)

### Module 1: Login / Signup Screen
* Authenticate users with realistic, non-self-elevating account creation[cite: 1].
* Signup creates an Employee account only (no role selection allowed at registration)[cite: 1].
* Supports email and password login, forgot password functionality, and secure session validation[cite: 1].

### Module 2: Dashboard / Home Screen
* Provides a real-time operational snapshot tailored to the user's specific role[cite: 1].
* Displays KPI cards: *Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers,* and *Upcoming Returns*[cite: 1].
* Visually highlights overdue returns (past their Expected Return Date) separately from standard upcoming returns[cite: 1].
* Provides quick action buttons: *Register Asset, Book Resource,* and *Raise Maintenance Request*[cite: 1].

### Module 3: Organization Setup Screen (Admin Only — 3 Tabs)
* **Tab A (Department Management):** Create, edit, or deactivate departments; assign Department Heads; set optional Parent Departments for hierarchy; toggle Active/Inactive status[cite: 1].
* **Tab B (Asset Category Management):** Create and edit categories (Electronics, Furniture, Vehicles, etc.) and define optional category-specific fields (e.g., warranty periods for Electronics)[cite: 1].
* **Tab C (Employee Directory):** Manage employee details (Name, Email, Department, Role, Status)[cite: 1]. Serves as the **only** place where an Admin can promote an Employee to Department Head or Asset Manager[cite: 1].

### Module 4: Asset Registration & Directory Screen
* **Registration Form:** Input Name, Category, Serial Number, Acquisition Date, Acquisition Cost (used for ranking/reports only, not accounting), Condition, Location, photo/documents, and a "shared/bookable" toggle flag[cite: 1].
* Auto-generates a unique Asset Tag upon registration (e.g., `AF-0001`)[cite: 1].
* Search and filter functionality by Asset Tag, Serial Number, QR code, category, status, department, or location[cite: 1].
* Displays current lifecycle status and a complete historical log (allocation history + maintenance history) per asset[cite: 1].

### Module 5: Asset Allocation & Transfer Screen
* Allocate assets to employees or departments with an optional Expected Return Date[cite: 1].
* Enforces the **Double-Allocation Block Rule**, blocking taken assets and offering a Transfer Request flow instead[cite: 1].
* **Transfer Workflow:** *Requested → Approved (by Asset Manager/Department Head) → Re-allocated* (automatically updating asset history)[cite: 1].
* **Return Flow:** Process returns by capturing condition check-in notes and automatically reverting the asset status to *Available*[cite: 1].
* Automatically flags overdue allocations to feed the Dashboard and Notifications system[cite: 1].

### Module 6: Resource Booking Screen
* Time-slot booking interface for shared resources featuring a visual calendar view[cite: 1].
* Enforces the **Overlap Validation Engine** to reject overlapping time-slot requests automatically[cite: 1].
* Tracks booking statuses (*Upcoming, Ongoing, Completed, Cancelled*), allows rescheduling or cancellation, and sends reminder notifications before slots begin[cite: 1].

### Module 7: Maintenance Management Screen
* Route repairs through an approval workflow before work starts[cite: 1].
* Users raise requests by selecting an asset, describing the issue, setting a priority level, and attaching photos[cite: 1].
* **Approval Workflow:** *Pending → Approved/Rejected (by Asset Manager) → Technician Assigned → In Progress → Resolved*[cite: 1].
* Automatically updates asset status to *Under Maintenance* upon approval, and reverts it back to *Available* upon resolution, while retaining full maintenance history[cite: 1].

### Module 8: Asset Audit Screen
* Enables structured physical verification cycles instead of relying on single static forms[cite: 1].
* Admins create an Audit Cycle by scoping a department or location and setting a date range[cite: 1].
* Assigned auditors review items and mark each asset as: *Verified, Missing,* or *Damaged*[cite: 1].
* System auto-generates a discrepancy report for flagged items[cite: 1].
* Closing the audit cycle locks the report and automatically updates affected asset statuses (e.g., flipping confirmed missing items to *Lost*)[cite: 1].

### Module 9: Reports & Analytics Screen
* Delivers actionable operational insights via visual dashboards and tables[cite: 1].
* Tracks asset utilization trends, comparing most-used versus completely idle assets[cite: 1].
* Monitors maintenance frequency broken down by asset or category[cite: 1].
* Identifies assets due for maintenance or nearing retirement[cite: 1].
* Provides department-wise allocation summaries and resource booking heatmaps showing peak usage windows[cite: 1].
* Supports exportable reports[cite: 1].

### Module 10: Activity Logs & Notifications Screen
* Keeps all roles informed with real-time system notifications[cite: 1].
* Triggers alerts for: *Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return Alert,* and *Audit Discrepancy Flagged*[cite: 1].
* Maintains an immutable, comprehensive audit log tracking all admin, manager, and employee actions (recording who did what, and when)[cite: 1].

---

## 5. Hackathon Execution Roadmap (Step-by-Step Implementation)

### Phase 1: Foundation & Data Architecture (Hours 1–4)
* [ ] Initialize project repository, UI framework, and database schemas[cite: 1].
* [ ] Create core database tables: `Users`, `Departments`, `Categories`, `Assets`, `Allocations`, `Bookings`, `MaintenanceRequests`, `AuditCycles`, and `ActivityLogs`[cite: 1].
* [ ] Configure the 7-stage Asset Lifecycle enum values in the database[cite: 1].

### Phase 2: Authentication & Master Data Setup (Hours 5–8)
* [ ] Build **Module 1 (Login / Signup)** ensuring new registrations default strictly to the *Employee* role[cite: 1].
* [ ] Build **Module 3 (Organization Setup)** with tabs for Departments, Asset Categories, and the Employee Directory[cite: 1].
* [ ] Implement the role-promotion mechanism in the Employee Directory (allowing Admins to promote users to *Asset Manager* or *Department Head*)[cite: 1].

### Phase 3: Core Directory & Conflict Prevention Engines (Hours 9–14)
* [ ] Build **Module 4 (Asset Registration & Directory)** featuring auto-generated tags (`AF-0001`), QR code search, and lifecycle tracking[cite: 1].
* [ ] Build **Module 5 (Allocation & Transfer)** and code the **Double-Allocation Block Engine** to block taken assets and trigger Transfer Requests[cite: 1].
* [ ] Build **Module 6 (Resource Booking)** and code the **Time-Slot Overlap Validation Engine** to prevent overlapping room/vehicle reservations[cite: 1].

### Phase 4: Workflows, Maintenance & Auditing (Hours 15–20)
* [ ] Build **Module 7 (Maintenance Management)** and wire up automated state transitions (flipping status to *Under Maintenance* on approval, and back to *Available* on resolution)[cite: 1].
* [ ] Build **Module 8 (Asset Audit Screen)** allowing auditors to verify items and auto-generating discrepancy reports[cite: 1].
* [ ] Program the audit closure trigger to automatically change missing assets to *Lost*[cite: 1].

### Phase 5: Dashboards, Analytics & Final Polish (Hours 21–24)
* [ ] Build **Module 10 (Activity Logs & Notifications)** to capture system events and record user actions in an audit log[cite: 1].
* [ ] Build **Module 2 (Dashboard)** displaying live KPI cards, quick actions, and overdue return highlights[cite: 1].
* [ ] Build **Module 9 (Reports & Analytics)** displaying utilization trends, department summaries, and booking heatmaps[cite: 1].
* [ ] Conduct end-to-end testing of role permissions and conflict validation rules before final submission[cite: 1].