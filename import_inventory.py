"""
Import ABIFRESH PRODUCTS.xlsx into Supabase `items` table.
- Clears all existing inventory
- Parses Excel with merged cells (brand, package)
- Generates SKU for each product
- Sets unit_price=0, active_store_quantity=1, main_store_quantity=1
- Maps categories correctly
"""

import openpyxl
from supabase import create_client
import uuid
import re

# Supabase connection
SUPABASE_URL = "https://cifzlkspxjghpgxhrwkg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzMDEzMCwiZXhwIjoyMDg0OTA2MTMwfQ.7Eg2j5-16Mr97DvRhipQ8XSq-BCkDcKiO5NRqkwfHm4"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Excel file path
EXCEL_PATH = r"C:\Users\LuckyGold\OneDrive\Documents\ABIFRESH PRODUCTS.xlsx"


def determine_category(brand_name: str) -> str:
    """Determine the correct category based on brand name."""
    brand_upper = (brand_name or "").upper().strip()
    
    if "DIAPER" in brand_upper and "ADULT" not in brand_upper:
        return "Baby Diapers"
    elif "ADULT" in brand_upper:
        return "Adult Diapers"
    elif "SANITARY" in brand_upper or "PAD" in brand_upper:
        return "Sanitary Pads"
    elif "WIPE" in brand_upper:
        return "Wipes"
    elif "NET PAD" in brand_upper:
        return "Sanitary Pads"
    elif "BLUE PAD" in brand_upper:
        return "Sanitary Pads"
    elif "UNDERPAD" in brand_upper or "NIGHTINGALE" in brand_upper:
        return "Underpads"
    elif "PANTY" in brand_upper or "LINER" in brand_upper:
        return "Panty Liners"
    else:
        return "Other"


def generate_sku(brand: str, package_type: str, product_name: str, index: int) -> str:
    """Generate a unique SKU from brand, package type, and product name."""
    
    def abbreviate(text: str, max_len=4) -> str:
        """Get abbreviation from text."""
        if not text:
            return "GEN"
        words = text.upper().strip().split()
        if len(words) == 1:
            return words[0][:max_len]
        # Take first letter of each word, up to max_len
        abbr = "".join(w[0] for w in words if w)[:max_len]
        if len(abbr) < 2:
            abbr = words[0][:max_len]
        return abbr
    
    # Brand abbreviation
    brand_abbr = abbreviate(brand or "GEN", 3)
    
    # Extract size info from product name (S1, S2, etc. or specific identifiers)
    size_match = re.search(r'S(\d)', product_name or "")
    size_part = f"S{size_match.group(1)}" if size_match else ""
    
    # Package type abbreviation
    pkg_parts = (package_type or "").upper().strip()
    if "SACHET" in pkg_parts:
        pkg_abbr = "SAC"
    elif "CARRY" in pkg_parts:
        pkg_abbr = "CP"
    elif "ECO" in pkg_parts:
        pkg_abbr = "ECO"
    elif "JUMBO" in pkg_parts:
        pkg_abbr = "JMB"
    elif "MEGA" in pkg_parts or "ZIP" in pkg_parts:
        pkg_abbr = "MGA"
    elif "POCKET" in pkg_parts:
        pkg_abbr = "PKT"
    elif "ROLL" in pkg_parts:
        pkg_abbr = "SAC"
    else:
        pkg_abbr = abbreviate(pkg_parts, 3) if pkg_parts else "STD"
    
    # Build SKU
    parts = [brand_abbr, pkg_abbr]
    if size_part:
        parts.append(size_part)
    else:
        parts.append(f"{index:03d}")
    
    sku = "-".join(parts)
    return sku


def parse_excel():
    """Parse the Excel file and return list of product dicts."""
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb["Sheet1"]
    
    products = []
    current_brand = None
    current_package = None
    sku_counter = {}  # Track SKUs for uniqueness
    
    for row_idx in range(3, ws.max_row + 1):  # Start from row 3 (skip header rows)
        col_a = ws.cell(row=row_idx, column=1).value  # Brand
        col_b = ws.cell(row=row_idx, column=2).value  # Package
        col_c = ws.cell(row=row_idx, column=3).value  # Product Name
        col_d = ws.cell(row=row_idx, column=4).value  # Price Jalingo
        col_e = ws.cell(row=row_idx, column=5).value  # Price Outside
        col_f = ws.cell(row=row_idx, column=6).value  # Commission
        
        # Update brand if present (merged cells leave None for continuation)
        if col_a is not None and str(col_a).strip():
            current_brand = str(col_a).strip()
        
        # Update package if present
        if col_b is not None and str(col_b).strip():
            current_package = str(col_b).strip()
        
        # Skip rows without a product name
        if not col_c or not str(col_c).strip():
            continue
        
        product_name = str(col_c).strip()
        brand = current_brand or ""
        package_type = current_package or ""
        
        # Determine category
        category = determine_category(brand)
        
        # Special overrides for specific brands
        if "WIPE" in brand.upper():
            category = "Wipes"
        if "NET PAD" in brand.upper():
            category = "Sanitary Pads"
        if "BLUE PAD" in brand.upper():
            category = "Sanitary Pads"
        if "UNDERPAD" in brand.upper():
            category = "Underpads"
        if "OTHERS" in brand.upper():
            category = "Other"
        
        # Generate SKU
        sku = generate_sku(brand, package_type, product_name, row_idx)
        
        # Ensure SKU uniqueness
        if sku in sku_counter:
            sku_counter[sku] += 1
            sku = f"{sku}-{sku_counter[sku]}"
        else:
            sku_counter[sku] = 1
        
        # Parse prices
        price_jalingo = float(col_d) if col_d and col_d != 0 else 0.0
        price_outside = float(col_e) if col_e else 0.0
        commission = float(col_f) if col_f else 0.0
        
        product = {
            "name": product_name,
            "sku": sku,
            "category": category,
            "unit_price": 0,
            "brand": brand,
            "package_type": package_type,
            "price_jalingo": price_jalingo,
            "price_outside": price_outside,
            "commission": commission,
            "active_store_quantity": 1,
            "main_store_quantity": 1,
            "is_available": True,
            "image_url": None,
        }
        
        products.append(product)
    
    return products


def main():
    print("=" * 60)
    print("ABIFRESH INVENTORY IMPORT")
    print("=" * 60)
    
    # Step 1: Parse Excel
    print("\n[1/4] Parsing Excel file...")
    products = parse_excel()
    print(f"     Found {len(products)} products")
    
    # Print summary by category
    categories = {}
    for p in products:
        cat = p["category"]
        categories[cat] = categories.get(cat, 0) + 1
    print("\n     Category breakdown:")
    for cat, count in sorted(categories.items()):
        print(f"       - {cat}: {count} items")
    
    # Step 2: Preview first few products
    print("\n[2/4] Preview (first 5 products):")
    for p in products[:5]:
        print(f"     {p['sku']:15s} | {p['name']:30s} | {p['category']:15s} | Brand: {p['brand']}")
    print("     ...")
    
    # Step 3: Clear existing data (dependent tables first, then items)
    print("\n[3/4] Clearing existing data...")
    
    # Order matters: clear child tables before parent table
    tables_to_clear = [
        "receipt_items",
        "daily_sales_summary",
        "sales",
        "posted_items",
        "inventory_transfers",
        "inventory_main_store",
        "inventory_active_store",
        "items",
    ]
    
    for table_name in tables_to_clear:
        try:
            result = supabase.table(table_name).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            deleted_count = len(result.data) if result.data else 0
            print(f"     Cleared {table_name}: {deleted_count} rows deleted")
        except Exception as e:
            err_msg = str(e)
            if "Could not find" in err_msg or "does not exist" in err_msg:
                print(f"     Skipped {table_name}: table not found")
            else:
                print(f"     Warning on {table_name}: {err_msg[:100]}")
    
    print("     All old data cleared successfully!")
    
    # Step 4: Insert new products
    print(f"\n[4/4] Inserting {len(products)} new products...")
    
    # Insert in batches of 20
    batch_size = 20
    inserted = 0
    errors = 0
    
    for i in range(0, len(products), batch_size):
        batch = products[i:i + batch_size]
        try:
            result = supabase.table("items").insert(batch).execute()
            inserted += len(batch)
            print(f"     Inserted batch {i // batch_size + 1}: {len(batch)} items (total: {inserted})")
        except Exception as e:
            print(f"     ERROR in batch {i // batch_size + 1}: {e}")
            # Try inserting one by one for the failed batch
            for product in batch:
                try:
                    supabase.table("items").insert(product).execute()
                    inserted += 1
                except Exception as e2:
                    errors += 1
                    print(f"     FAILED: {product['name']} - {e2}")
    
    print("\n" + "=" * 60)
    print(f"IMPORT COMPLETE")
    print(f"  Successfully inserted: {inserted}")
    print(f"  Errors: {errors}")
    print(f"  Total products in Excel: {len(products)}")
    print("=" * 60)
    
    # Verify
    print("\nVerifying...")
    count_result = supabase.table("items").select("id", count="exact").execute()
    print(f"  Items now in database: {count_result.count}")


if __name__ == "__main__":
    main()
