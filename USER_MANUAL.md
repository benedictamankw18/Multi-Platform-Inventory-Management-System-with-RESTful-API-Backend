# User Manual

**Multi-Platform Inventory Management System (MPIMS)** — Web client & Desktop client.

This guide is for day-to-day users. It covers signing in, the daily workflows
(selling, stock, purchasing, reporting) and administration. Technical details are
in [`TECHNICAL_MANUAL.md`](./TECHNICAL_MANUAL.md).

- [1. Getting started](#1-getting-started)
- [2. Roles & what you can see](#2-roles--what-you-can-see)
- [3. Navigation overview](#3-navigation-overview)
- [4. Dashboard](#4-dashboard)
- [5. Selling with POS](#5-selling-with-pos)
- [6. Sales & receipts](#6-sales--receipts)
- [7. Products & price history](#7-products--price-history)
- [8. Categories & units of measure](#8-categories--units-of-measure)
- [9. Inventory](#9-inventory)
- [10. Transfers](#10-transfers)
- [11. Batches & expiry](#11-batches--expiry)
- [12. Purchasing](#12-purchasing)
- [13. Suppliers](#13-suppliers)
- [14. Customers & payments](#14-customers--payments)
- [15. Expenses](#15-expenses)
- [16. Reports](#16-reports)
- [17. Notifications](#17-notifications)
- [18. Administration](#18-administration)
- [19. My profile & sessions](#19-my-profile--sessions)
- [20. Desktop app features](#20-desktop-app-features)
- [21. Troubleshooting](#21-troubleshooting)
- [22. Tips & good practice](#22-tips--good-practice)

---

## 1. Getting started

### 1.1 Signing in

1. Open the web address of your workplace system, or launch the **desktop app**.
2. Enter your **username or e-mail** and **password** → **Sign in**.
3. **Select your branch** — click the card for the branch you are working from.
   - If you belong to only one branch, it is selected automatically.
   - The chosen branch appears in the top bar; everything you see is scoped to it.

> **Forgot your password?** Click **Forgot password**, enter your e-mail and
> follow the link (valid for 1 hour). If no e-mail arrives within a few minutes,
> ask an Administrator to open **Message Queue** and press **Resend** on your
> reset job.

### 1.2 Switching branch

Click the branch name in the top bar → pick another branch. All lists reload for
the new branch automatically. Products stocked only in another branch will not
appear.

### 1.3 Staying signed in

Sessions expire after a period of inactivity (default 30 minutes). You will be
returned to the sign-in screen. If your account is deactivated, access is
revoked immediately.

---

## 2. Roles & what you can see

Menus are driven by permissions, so what you see depends on your role:

| Role | Typically can do |
| ---- | ---------------- |
| **Business Owner** | Everything: settings, all branches, reports. |
| **Administrator** | Users, roles, branches, message queue, audit logs, settings. |
| **Manager** | Full operations except user/branch management. |
| **Branch Manager** | Branch inventory, purchases, transfers, approvals. |
| **Storekeeper** | Receiving goods, stock counts and movements. |
| **Cashier** | Point of sale, sales history, dashboard. |
| **Technical** | Monitoring and read-only access. |

**Cashiers** see a reduced menu (no Categories, Suppliers, Purchases, Inventory,
Transfers, Batches, Expenses, Users/Roles, or admin pages) but retain POS, Sales,
Dashboard, and their profile.

If a menu is missing, your role does not include that permission — contact an
Administrator.

---

## 3. Navigation overview

The sidebar groups the screens you have permission to use:

- **Dashboard** — KPIs and charts.
- **Sync & Offline** — connectivity and pending changes.
- **Products**, **Categories**, **Units of Measure** — catalogue.
- **Inventory**, **Stock Movements**, **Stock History**, **Low Stock Alerts**,
  **Batches**, **Transfers** — stock control.
- **Sales**, **POS** — selling.
- **Purchase Orders**, **Suppliers** — buying.
- **Customers**, **Expenses** — relationships and costs.
- **Branches**, **Reports**, **Expiry Report** — oversight.
- **Users**, **Roles** — administration.
- **Notifications**, **Create Notification** — messaging.
- **My Profile** — your account.
- **Audit Logs**, **Sync Logs** — traceability.
- **Price History** — cost/price changes.
- **Message Queue**, **SMS Balance**, **Business Settings**, **System Settings** —
  administration.

The top bar shows the online/offline pill (if permitted), the current branch, the
notification bell, your avatar, and **Sign out**.

---

## 4. Dashboard

The landing page summarises your branch at a glance:

- **Key figures** — sales, profit, low stock and activity.
- **Sales trend chart** — pick a range and granularity (day/week/month) to see
  how sales are moving, with a comparison to the previous period. Voided sales
  are excluded.
- **Best selling** and **branch performance** panels.
- **Low-stock** and recent **activity** summaries.

Use the branch selector to change scope.

---

## 5. Selling with POS

1. Go to **POS**.
2. Scan a barcode or type a product name/SKU. Results show live **available
   stock for your branch**.
3. Click a product to add it to the cart; adjust quantities as needed.
4. Choose the customer (optional) and payment details.
5. Press **Checkout / Complete sale**. Stock is reduced instantly and a receipt
   is created.

> **Desktop offline mode:** if the internet drops, keep selling from the cached
> catalogue. Sales queue locally and sync automatically when you are back online.
> Confirm later in **Sync Logs**.

---

## 6. Sales & receipts

- **Sales** lists completed sales for the branch with filters (date, customer,
  status).
- Open a sale to view its line items and **reprint the receipt**.
- Users with the right permission can **void or refund** a sale. Voided sales are
  excluded from sales-trend reporting.
- A **full refund** returns the sold quantities to stock. A **partial refund**
  adjusts the amount only (inventory is unchanged) and can be topped up later to
  complete the refund. Once a sale has been refunded (fully or partly) it can no
  longer be voided.
- Receipts carry your business name/logo from **Business Settings** and amounts
  show your business currency (e.g. `GHS 12.00`).

---

## 7. Products & price history

- **Products** lists your branch's catalogue with search and pagination.
- **New Product** — fill SKU, barcode, name, category, supplier, base unit and
  opening stock, then save.
- **Edit / deactivate** — open a product. Deactivation hides it everywhere without
  deleting history; an administrator can re-enable it.
- **Import / Export** — *Import CSV* (Name, SKU, Category, Supplier, Base UoM, …)
  and the Export menu (CSV/Excel/PDF).
- **Price History** records cost and selling-price changes, including the source
  (e.g. a purchase order) and the batch number, so you can see why a cost moved.

---

## 8. Categories & units of measure

- **Categories** group products for reporting and filtering.
- **Units of Measure** define how products are counted (piece, box, kg …) and can
  be activated/deactivated.

These screens require the relevant permissions and are hidden from Cashiers.

---

## 9. Inventory

### 9.1 Stock levels

**Inventory** shows on-hand quantities per product for your branch.

### 9.2 Record a stock movement

1. **Stock Movements** → **Record Movement**.
2. Choose **IN** (goods in) or **OUT** (removals/damages).
3. Search the product — only your branch's products are listed, with their
   available quantity.
4. Enter quantity and a reason/note → save. Quantities larger than available
   stock are rejected.

### 9.3 History

**Stock History** lists every ledger entry for auditing movements over time.

### 9.4 Low stock alerts

**Low Stock Alerts** lists every item at or below its reorder level, so you can
reorder before running out.

---

## 10. Transfers

1. **Transfers** → **New Transfer**.
2. Pick the source and destination branches, then add products and quantities.
3. Confirm. The transfer moves through shipping and receiving; both branch
   ledgers record the movement.

> Products tracked by expiry/batch cannot be transferred.

---

## 11. Batches & expiry

- **Batches** lists stock batches with their batch numbers and expiry dates.
- **Expiry Report** highlights products approaching or past expiry so you can act
  before losses occur.

Batch numbers are generated automatically when goods are received against a
purchase order (for example `PO-<number>`).

---

## 12. Purchasing

1. **Purchase Orders** → **New Purchase Order** (select the branch).
2. Add line items while the PO is in **DRAFT** — totals update automatically.
3. Once finalised, items are locked (edits return *"only DRAFT purchase orders
   can be modified"*).
4. When goods physically arrive, **receive** the PO — branch stock increases, the
   cost price is recorded in price history, and a batch number is assigned.
5. Record **supplier payments** against the PO/supplier as they are made.

Purchase orders list newest first.

---

## 13. Suppliers

**Suppliers** stores supplier contact details and lets you record supplier
payments and track balances.

---

## 14. Customers & payments

**Customers** stores business name, contact person, phone and e-mail (at least
one identifier is required). Open a customer to record payments and track their
balance.

---

## 15. Expenses

Record day-to-day costs under categories in **Expenses** for branch-level
visibility alongside sales and profit reports.

---

## 16. Reports

Open **Reports** for:

- Daily / Monthly / Annual sales,
- Profit,
- Inventory valuation,
- Low-stock report,
- Best-selling and branch performance.

Choose a branch and date range where available, then export via the
**CSV / Excel / PDF** buttons. The **Expiry Report** is a separate, focused
screen under the same permission.

---

## 17. Notifications

### Reading notifications

Click the bell (top bar) or open **Notifications**. Mark items as read or delete
them. The bell shows an unread count.

### Sending notifications (permission required)

1. Open **Create Notification**.
2. Enter a title and message; choose the type and channels (In-app / E-mail /
   SMS).
3. Choose the audience:
   - **Specific users** — pick people from the list;
   - **All users** — everyone active in the business;
   - **Everyone in a selected branch** — active staff of one branch.
4. Send. Delivery happens in the background with automatic retries; each
   recipient gets their own copy.

---

## 18. Administration

### 18.1 Users & roles
- **Users** — create accounts, assign a role, set branch memberships, activate or
  deactivate.
- **Roles** — shape what each role may do via the permission matrix.

### 18.2 Branches & business profile
- **Branches** — manage branch records.
- **Business Settings** — company name, logo, contact details and currency used
  across the app and e-mails.
- **System Settings** — system-level options.

### 18.3 Message Queue
Shows background e-mail/SMS jobs (status, attempts, last error).
- Filter by status/type to investigate problems.
- Press **Resend** on any PROCESSING/FAILED job to requeue it immediately.
- DONE jobs cannot be resent (by design).

### 18.4 SMS Balance
Shows the remaining credit with the SMS provider (when SMS is configured).

### 18.5 Audit & sync logs
- **Audit Logs** — who did what and when: privileged actions, logins and entity
  changes.
- **Sync Logs** — records of offline sync push/pull operations.

---

## 19. My profile & sessions

Open **My Profile** from the avatar (top right) to:

- Update your details and profile photo,
- **Change your password**,
- Review and sign out of your active sessions.

Signing out of a session invalidates it immediately. You can only manage your own
sessions.

---

## 20. Desktop app features

The desktop client is the same application with native extras:

- **Barcode scanning** — a keyboard "wedge" scanner works anywhere, and HID-mode
  scanners can be selected in the scanner settings.
- **Silent printing** — receipts and labels print to a chosen printer without the
  system dialog (configurable in print settings).
- **Offline mode** — keep selling when disconnected; changes sync automatically.

Set up your printer/scanner from the desktop app's settings the first time you
use it.

---

## 21. Troubleshooting

| Problem | What it means | What to do |
| ------- | ------------- | ---------- |
| "No branch assigned" after login | Your account has no branch membership | Ask an Administrator to add you under **Users → Branches**. |
| A menu is missing | Your role lacks that permission | Contact an Administrator. |
| Product missing from POS/list | It belongs to another branch, or was deactivated | Switch branch, or ask an admin to re-enable it. |
| "Only DRAFT purchase orders can be modified" | The PO is already finalised/received | Create a new PO for corrections. |
| Stock-out rejected although the shelf looks full | The system tracks recorded stock per branch | Record an **IN** movement or a stock count first. |
| Reset e-mail never arrives | SMTP hiccup at send time | Admin: **Message Queue** → find the job → **Resend**. |
| Desktop sale shows "pending sync" | You are offline | Keep selling; verify later in **Sync Logs**. |
| Wrong branch data showing | Stale selection | Switch branch away and back; lists reload scoped to the branch. |
| Session ended unexpectedly | Inactivity timeout, or your account was deactivated | Sign in again; if it recurs, contact an Administrator. |

---

## 22. Tips & good practice

- **Barcodes:** any USB scanner that "types" text works on both clients; the
  desktop app additionally supports HID-mode scanners.
- **Search and filter before exporting** so files contain exactly what you need.
- **Deactivate instead of delete** — reports and history stay correct.
- **Receive purchases promptly** so stock, cost and batch data stay accurate.
- **Watch Low Stock and Expiry reports** to avoid stock-outs and write-offs.
