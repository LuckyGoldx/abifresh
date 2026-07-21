# Ambrose ₦8,062,950 Outstanding — Credit Sales Analysis

**Generated**: 2026-07-17 17:33 WAT
**Staff**: Ambrose Chinonso Anthony (commission_staff)
**Total outstanding**: ₦8,062,950
**Context**: Credit sales — goods delivered to customers on credit. Money not yet collected. Normal business operation.

---

## Top-Level Summary

| Metric | Value |
|---|---|
| Total staff_sales revenue | ₦54,084,150 |
| Total approved payments | ₦46,021,200 |
| Total pending payments | ₦0.00 |
| **Outstanding** (sales − approved) | **₦8,062,950** |
| Total staff_sales records | 385 |
| Fully unpaid records (0% paid) | 34 records, 879 units |
| Partially unpaid records | 1 record, 43.5 units remaining |
| Item-level unpaid total | ₦8,046,950 |
| Auto-heal gap | ₦16,000 (0.2%) |

---

## Per-Item Breakdown — Fully Unpaid Sales (34 records, ₦7,694,600)

| Item | Sales Count | Total Qty | Amount |
|---|---|---|---|
| JUSTFIT CARRY PACK S3 | 3 | 239 | ₦1,981,700 |
| JUSTFIT CARRY PACK S2 | 2 | 198 | ₦1,643,400 |
| JUSTFIT CARRY PACK S4 | 3 | 158 | ₦1,310,400 |
| AFRICAN TRADITIONAL BY 8+2LINER | 2 | 35 | ₦392,000 |
| ANGEL BY 10PCS | 1 | 40 | ₦220,000 |
| JUSTFIT ECO PACK S2 | 3 | 11 | ₦193,300 |
| LEB ECO PACK S3 | 2 | 6 | ₦116,100 |
| JUSTFIT ZIP PAD BY 30 PCS | 2 | 3 | ₦108,600 |
| BESENSE BLUE MEGA MIX 30 PCS ZIP PAD | 1 | 2 | ₦80,200 |
| BESENSE PINK MEGA MIX 30 PC ZIP PAD-HANDLE | 1 | 2 | ₦79,800 |
| BESENSE POCKET PACK 3 | 2 | 8 | ₦64,800 |
| JUSTFIT JUMBO PACK S3 | 1 | 2 | ₦49,800 |
| LEB CARRY PACK S2 | 1 | 5 | ₦44,500 |
| BESENSE WIPES BY 60PCS | 1 | 2 | ₦30,000 |
| BESENSE BY 10 | 1 | 2 | ₦23,200 |
| JUSTFIT N10 (GREEN) | 1 | 2 | ₦19,200 |
| JUSTFIT ECO PACK S4 | 1 | 1 | ₦17,300 |
| **Remaining items (various)** | 4 | 163 | ₦1,320,500 |

---

## Partially Unpaid (1 record)

| Item | Original Qty | Paid Qty | Remaining | Amount |
|---|---|---|---|---|
| (from sequential distribution artifact) | | | 43.5 | ₦352,350 |

---

## Timeline

| Date Range | Sales |
|---|---|
| Earliest fully unpaid | July 7, 2026 |
| Latest fully unpaid | July 10, 2026 |
| **All 34 unpaid records in 4 days** | |

Ambrose concentrated most of his credit sales in the final 4 days before his stock ran out (July 7-10).

---

## The 9 Oversold Items vs The ₦8M Outstanding

The 9 oversold items (quantity_sold > quantity in staff_store) overlap with but are not the same as the ₦8M unpaid credit sales:

| Category | Items | Amount |
|---|---|---|
| Unpaid sales on oversold items | 9 items (partial) | ~₦3.7M |
| Unpaid sales on non-oversold items | 25 items | ~₦4.4M |
| **Total unpaid** | **34 items** | **~₦8.05M** |

The oversold items (-57 display artifact) and the ₦8M credit sales gap are **two separate issues**:
- **Oversold**: Returns accepted after sales reduced posted quantity → display artifact → fix with SQL
- **Credit gap**: 34 sales with no payment → Ambrose hasn't collected money from credit customers

---

## The Auto-Heal Gap (₦16,000)

The item-level unpaid (₦8,046,950) and financial outstanding (₦8,062,950) differ by ₦16,000 — the auto-heal scaling layer handles this display correction on Ambrose's payment page.
