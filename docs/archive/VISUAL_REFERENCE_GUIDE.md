# Visual Reference Guide - Quantity Logic Implementation

## 🎯 Quick Reference Card

### When ADDING New Item
```
┌─────────────────────────────────┐
│     ADD NEW ITEM FORM           │
├─────────────────────────────────┤
│ Item Name: [_____________]       │
│ Price (₦): [_____________]       │
│ Quantity:  [_____________]       │
│            (Goes to Main Store)  │
│ Category:  [_____________]       │
│ Commission:[_____________]       │
│                                  │
│  [Cancel]  [Add]                 │
└─────────────────────────────────┘

Result after submitting:
  Main Store: [entered quantity]
  Active Store: 0
  Total: [entered quantity]
```

### When EDITING Existing Item - ADD Mode
```
┌─────────────────────────────────┐
│     EDIT ITEM FORM              │
├─────────────────────────────────┤
│ Item Name: [Apple_________]      │
│ Price (₦): [2500__________]      │
│                                  │
│ Quantity Mode:                   │
│   ◉ Add (Increment existing)     │
│   ○ Update (Replace existing)    │
│                                  │
│ Add Quantity: [6________]        │
│ "This amount will be added to    │
│  existing Main Store quantity"   │
│                                  │
│ Category: [Fruit________]        │
│ Commission:[100_________]        │
│                                  │
│  [Cancel]  [Update]              │
└─────────────────────────────────┘

Calculation (ADD mode):
  Old Main Store: 5
  + Your Input: 6
  = New Main Store: 11
  Active Store: 2 (unchanged)
  = Total: 13
```

### When EDITING Existing Item - UPDATE Mode
```
┌─────────────────────────────────┐
│     EDIT ITEM FORM              │
├─────────────────────────────────┤
│ Item Name: [Apple_________]      │
│ Price (₦): [2500__________]      │
│                                  │
│ Quantity Mode:                   │
│   ○ Add (Increment existing)     │
│   ◉ Update (Replace existing)    │
│                                  │
│ New Quantity: [20________]       │
│ "This amount will replace        │
│  existing Main Store quantity"   │
│                                  │
│ Category: [Fruit________]        │
│ Commission:[100_________]        │
│                                  │
│  [Cancel]  [Update]              │
└─────────────────────────────────┘

Calculation (UPDATE mode):
  New Main Store: 20 (replaces old)
  Active Store: 2 (unchanged)
  = Total: 22
```

---

## 📊 Table Display

```
┌────┬────────┬──────┬───────┬─────────┬───────┬──────────────────┐
│ ID │ Name   │ SKU  │ Price │ Total   │ Main  │ Active │ Commission│
├────┼────────┼──────┼───────┼─────────┼───────┼────────┼──────────┤
│ 1  │ Apple  │ APP  │ 2500  │ 13      │ 11    │ 2      │ 100      │
│    │        │-001  │       │         │       │        │          │
├────┼────────┼──────┼───────┼─────────┼───────┼────────┼──────────┤
│ 2  │ Banana │ BAN  │ 3000  │ 22      │ 20    │ 2      │ 150      │
│    │        │-001  │       │         │       │        │          │
├────┼────────┼──────┼───────┼─────────┼───────┼────────┼──────────┤
│ 3  │ Orange │ ORA  │ 1800  │ 85      │ 75    │ 10     │ 75       │
│    │        │-001  │       │         │       │        │          │
└────┴────────┴──────┴───────┴─────────┴───────┴────────┴──────────┘

Formula: Total (13) = Main (11) + Active (2)
```

---

## 🔄 State Flow

### Adding Item
```
User fills form with quantity: 100
           ↓
handleAddItem() called
           ↓
API POST /items with quantity: 100
           ↓
Backend creates:
  - items record
  - inventory_main_store: quantity = 100
  - inventory_active_store: quantity = 0
           ↓
Frontend refetches data
           ↓
Table shows: Main=100, Active=0, Total=100
```

### Editing Item (ADD Mode)
```
User selects: ADD mode
User enters: 6
Current state: Main=5, Active=2
           ↓
handleEditItem() calculates:
  newMainQty = 5 + 6 = 11
           ↓
API PUT /items/{id} with main_store_quantity: 11
           ↓
Backend updates:
  - inventory_main_store: quantity = 11
           ↓
Frontend refetches data
           ↓
Table shows: Main=11, Active=2, Total=13
```

### Editing Item (UPDATE Mode)
```
User selects: UPDATE mode
User enters: 20
Current state: Main=5, Active=2
           ↓
handleEditItem() calculates:
  newMainQty = 20 (replaces 5)
           ↓
API PUT /items/{id} with main_store_quantity: 20
           ↓
Backend updates:
  - inventory_main_store: quantity = 20
           ↓
Frontend refetches data
           ↓
Table shows: Main=20, Active=2, Total=22
```

---

## 💾 Database Structure

```
items
├── id
├── name
├── sku
├── category
├── unit_price
├── commission (NEW)
└── ...

inventory_main_store
├── id
├── item_id (FK)
└── quantity_in_stock ← WHAT WE EDIT

inventory_active_store
├── id
├── item_id (FK)
└── quantity_available ← SALES SYSTEM UPDATES THIS
```

---

## 🧮 Math Formulas

```
VIEWING DATA:
  Total Quantity = Main Store + Active Store

ADDING ITEM:
  Main Store = User Input
  Active Store = 0
  Total = User Input

EDITING - ADD MODE:
  New Main = Current Main + User Input
  New Active = Current Active (unchanged)
  New Total = New Main + New Active

EDITING - UPDATE MODE:
  New Main = User Input (replaces old)
  New Active = Current Active (unchanged)
  New Total = New Main + New Active

SALES (when customer buys):
  Active Store -= Sales Amount
  Main Store = unchanged
  Total = Main + Active
```

---

## 🔍 Debugging Checklist

| Scenario | Console Log | Expected |
|----------|-------------|----------|
| Add item | `📝 Adding item with quantity: 100 (all goes to main store)` | ✓ |
| Edit ADD | `✏️ Edit (ADD mode): 1 Old Main: 5 Adding: 6 New Main: 11` | ✓ |
| Edit UPDATE | `✏️ Edit (UPDATE mode): 1 Old Main: 5 New Main: 20` | ✓ |
| Success | `✅ Item added successfully` | ✓ |
| Error | `❌ Error: [message]` | Check error |

---

## 📱 Form Fields Summary

### Add Item Modal
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Item Name | text | Yes | Auto-generates SKU |
| Price (₦) | number | Yes | Unit price |
| Quantity | number | Yes | Goes to Main Store |
| Category | text | Yes | Item category |
| Commission | number | No | Plain number, no % |

### Edit Item Modal
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Item Name | text | Yes | Can edit |
| Price (₦) | number | Yes | Can edit |
| **Quantity Mode** | dropdown | Yes | **NEW** - Add or Update |
| **Quantity** | number | Yes | Behavior depends on mode |
| Category | text | Yes | Can edit |
| Commission | number | No | Can edit |

---

## ✨ Mode Behavior Comparison

| Aspect | Add Mode | Update Mode |
|--------|----------|-------------|
| Purpose | Add more stock | Correct inventory |
| Formula | New = Old + Input | New = Input |
| Use Case | Restocking | Error correction |
| Example | Add 10 more | Set to exactly 50 |
| Label | "Add Quantity" | "New Quantity" |

---

## 🎓 Three Scenarios to Test

### Scenario 1: Fresh Start
```
Add "Mango" with quantity 100
├─ Expected: Main=100, Active=0, Total=100
└─ Console: "Adding item with quantity: 100"
```

### Scenario 2: Increment Stock
```
Current: Main=100, Active=20, Total=120
Edit with ADD mode, input 50
├─ Calculation: 100 + 50 = 150
├─ Expected: Main=150, Active=20, Total=170
└─ Console: "Edit (ADD mode): Old Main: 100 Adding: 50 New Main: 150"
```

### Scenario 3: Correct Inventory
```
Current: Main=150, Active=20, Total=170
Edit with UPDATE mode, input 80
├─ Calculation: Replace with 80
├─ Expected: Main=80, Active=20, Total=100
└─ Console: "Edit (UPDATE mode): Old Main: 150 New Main: 80"
```

---

**Last Updated**: After quantity logic overhaul
**Status**: ✅ Ready for testing
**Documentation**: Complete with visual guides
