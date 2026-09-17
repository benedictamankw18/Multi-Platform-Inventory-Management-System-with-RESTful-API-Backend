# 06 — User Manual

**Multi-Platform Inventory Management System (MPIMS)**
Web client & Desktop client — August 2026

---

## 1. Getting Started

### 1.1 Signing in
1. Open the web address of your workplace system, or launch the **desktop app**.
2. Enter your **username or e-mail** and **password** → *Sign in*.
3. **Select your branch** — click the card for the branch you are working from.
   - If you belong to only one branch, it is selected automatically.
   - The chosen branch appears in the top bar; everything you see is scoped to it.

> Forgot your password? Click **Forgot password**, enter your e-mail and follow
> the link we send you (valid for 1 hour). If no e-mail arrives within a few
> minutes, ask an Administrator to check the Message Queue page and press
> **Resend** on your reset job.

### 1.2 Switching branch
Click the branch name in the top bar → pick another branch on the selection
screen. All lists reload for the new branch automatically — products stocked
only elsewhere will not appear.

### 1.3 Understanding roles
| Role | Can typically do |
|------|------------------|
| Business Owner | Everything: settings, all branches, reports |
| Administrator | Users, roles, branches, message queue, audit logs |
| Branch Manager | Branch inventory, purchases, transfers, approvals |
| Storekeeper | Receiving goods, stock counts/movements |
| Cashier | POS sales only |

If a menu is missing for you, your role does not include that permission — see
your Administrator.

---

## 2. Daily Selling (POS)

1. Go to **POS**.
2. Scan a barcode or type a product name/SKU in the search box. Results show
   live stock **for your branch** ("Available stock: 24").
3. Click a product (or press its row) to add it to the cart; adjust quantities.
4. Press **Checkout / Complete sale**. Stock is reduced instantly and a receipt
   is created.

**Desktop offline mode:** if the internet drops, keep selling as normal using
the cached catalogue — sales queue locally and sync automatically once you are
back online. Check **Sync Logs** (Administration) to confirm queued sales went
through.

---

## 3. Managing Products

- **Products** page lists your branch's catalogue with search and pagination.
- **Add product:** *New Product* button → fill SKU, barcode, name, category,
  supplier, base unit, opening stock → save.
- **Edit / deactivate:** open a product; deactivation hides it everywhere
  without deleting history. Deactivated items can be re-enabled by an
  administrator (they stay hidden until then).
- **Import:** use *Import CSV* on the Products page (columns: Name, SKU,
  Category, Supplier, Base UoM…).
- **Export:** the Export menu downloads the current list to CSV/Excel/PDF.

---

## 4. Stock Operations

### 4.1 Record a stock movement
1. Open **Stock Movements** → *Record Movement*.
2. Choose IN (goods in) or OUT (removals/damages).
3. Search the product — the picker shows **only your branch's products** and
   their available quantity.
4. Enter quantity and reason/note → save. The system rejects quantities larger
   than available stock.

### 4.2 Transfer stock between branches
1. **Transfers** → *New Transfer*.
2. Pick source and destination branches, add products and quantities.
3. Confirm. Source stock decreases and destination stock increases as one safe
   operation; both ledgers record the movement.

### 4.3 Watch low stock
**Low Stock Alerts** lists every item at or below its reorder level so you can
reorder before running out.

---

## 5. Buying Stock (Purchases)

1. **Purchases** → *New Purchase Order* (select your branch).
2. Add line items while the PO is in **DRAFT** — totals update automatically.
3. Once finalised, items are locked (edits return "only DRAFT purchase orders
   can be modified").
4. When goods physically arrive, mark the PO received — branch stock increases.
5. Record supplier payments against the PO/supplier as they are made.

---

## 6. Customers & Payments
- **Customers:** store business name, contact person, phone, e-mail. At least
  one identifier is required.
- Record customer payments and track balances on the customer's profile.

## 7. Expenses
Record daily expenses under categories (**Expenses**) for branch-level cost
visibility alongside sales reports.

---

## 8. Notifications

### Reading notifications
Click the bell icon to see your notifications; mark them read or delete them.

### Sending notifications (permission required)
1. **Create Notification**.
2. Fill title and message; choose type and channels (In-app / E-mail / SMS).
3. Choose the audience:
   - **Specific users** — pick people from the list;
   - **All users** — everyone active in the business;
   - **Everyone in selected branch** — active staff of one branch.
4. Send. Delivery happens in the background with automatic retries; recipients
   each get their own copy.

---

## 9. Administration

### 9.1 Users & Roles
- Create accounts, assign a role and branch memberships (**Users**).
- Shape what each role may do via the permission matrix (**Roles**).

### 9.2 Branches & business profile
Manage branch records (**Branches**) and the company name/logo/contact details
used across the system and e-mails (**Business Settings**).

### 9.3 Message Queue (Administrators)
Shows background e-mail/SMS jobs: status, attempts, last error.
- Filter by status/type to investigate problems.
- Press **Resend** on any PROCESSING/FAILED job to requeue it immediately.
- DONE jobs cannot be resent (by design).

### 9.4 Audit Logs
Review who did what and when — privileged actions, logins and entity changes.

---

## 10. Reports
Open **Reports** for:
- Daily / Monthly / Annual sales,
- Profit report,
- Inventory valuation,
- Low-stock report.

Use the branch selector where available, then export with the CSV/Excel/PDF
buttons.

---

## 11. Troubleshooting

| Problem | What it means | What to do |
|---------|---------------|------------|
| "No branch assigned" after login | Account has no branch membership | Contact an Administrator to add you under Users → Branches |
| Product missing from POS/list | It belongs to another branch, or was deactivated | Switch branch; or ask admin to re-enable it |
| "Only DRAFT purchase orders can be modified" | PO already finalised/received | Create a new PO for corrections |
| Stock-out rejected although shelf looks full | System tracks recorded stock per branch | Record an IN movement or stock count first |
| Reset e-mail never arrives | SMTP hiccup at send time | Admin: Message Queue → find the job → **Resend** |
| Desktop sale "pending sync" | Working offline | Keep selling; verify later in Sync Logs |
| Wrong branch data showing | Stale selection | Switch branch away and back; lists reload scoped to the branch |

---

## 12. Tips
- Barcodes: any USB scanner that "types" text works on both clients; the
  desktop app additionally supports HID-mode scanners.
- Use search + filters before exporting so files contain exactly what you need.
- Deactivate instead of delete — reports and history stay correct.
