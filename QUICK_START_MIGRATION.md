# QUICK START: Execute Database Migration

## ⚡ 5-Minute Setup

### Step 1: Open Supabase Dashboard
1. Go to: https://app.supabase.com
2. Select your ABIFRESH project
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Create New Query
1. Click **"+ New Query"** button
2. Or use the **"New Query"** option at the top

### Step 3: Copy Migration SQL
1. Open this file: `C:\Users\LuckyGold\Desktop\AKV\backend\migrations\create_receipts_table.sql`
2. Copy **ALL** the SQL code
3. Paste it into the Supabase SQL Editor

### Step 4: Execute
1. Click the **"Run"** button (or press `Ctrl + Enter`)
2. Wait for execution to complete (should take 2-3 seconds)
3. You should see: ✅ **"Query successful"**

### Step 5: Verify Tables Created
1. Go to **"Database"** section in left sidebar
2. Click on **"Tables"**
3. You should see:
   - ✅ `receipts` table
   - ✅ `receipt_items` table

---

## 📊 What Gets Created

### receipts Table (Main Receipt Record)
```
id              : UUID (unique identifier)
receipt_number  : Text (example: RCP-1234567890)
staff_id        : Foreign key to users table
total_amount    : Decimal (e.g., 50000.00)
payment_method  : Text (cash, pos, or transfer)
sold_outside_jalingo : Boolean (true/false)
items_count     : Number (how many items in receipt)
created_at      : Auto timestamp
updated_at      : Auto timestamp
```

### receipt_items Table (Individual Items in Receipt)
```
id              : UUID (unique identifier)
receipt_id      : Foreign key to receipts
item_id         : Foreign key to items table
quantity        : Number (quantity sold)
unit_price      : Decimal (price per unit)
total_price     : Decimal (quantity × unit_price)
created_at      : Auto timestamp
```

---

## ✅ Success Indicators

After running the SQL, you should see:

```
✅ "Query executed successfully"
✅ receipts table in table list
✅ receipt_items table in table list
✅ Both tables have proper columns
✅ Foreign key relationships working
```

---

## 🧪 Quick Test (Optional)

After creating tables, you can test:

1. **Query receipts table (should be empty):**
   ```sql
   SELECT * FROM receipts;
   ```
   Result: 0 rows (which is correct, no sales yet)

2. **Check table structure:**
   ```sql
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name = 'receipts';
   ```

---

## 🚀 Next: Test the System

After SQL execution completes:

1. **Frontend is ready** ✅
   - Open: http://localhost:3000/sales/make-sale
   - (Make sure `npm run dev` is running)

2. **Backend is ready** ✅
   - Already running on port 5000
   - Health check: http://localhost:5000/health

3. **Database is ready** ✅
   - Tables created
   - RLS policies active
   - Ready to save receipts

4. **Test Complete Sale Flow:**
   - Add items to cart
   - Set payment method
   - Click "Complete Sale"
   - Receipt should:
     - Display in modal
     - Save to database
     - Be viewable in receipts history page

---

## ❓ Troubleshooting

### "Table already exists" Error
**This is fine!** It means the tables were created previously.
- You can ignore this error
- Tables are already set up correctly

### "Query execution failed" Error
- Check that you copied **all** the SQL
- Ensure no lines were accidentally deleted
- Try copying again from the migration file

### "Permission denied" Error
- Make sure you're using a project with admin role
- Check that you're logged into the correct Supabase account

### Tables not appearing after execution
- Refresh the page (F5)
- Go out of SQL Editor and back in
- Check "Database" → "Tables" section again

---

## 📞 Support

If you encounter any issues:

1. Check the error message carefully
2. Verify all SQL was copied correctly
3. Ensure you're in the correct Supabase project
4. Check connection status (health check endpoint)

---

## 📋 Checklist

Before moving to Phase 3:

- [ ] Opened Supabase dashboard
- [ ] Created new SQL query
- [ ] Copied migration SQL
- [ ] Executed query
- [ ] Saw "Query successful" message
- [ ] Verified receipts table exists
- [ ] Verified receipt_items table exists
- [ ] Tables have correct columns
- [ ] Foreign key relationships OK
- [ ] Tested complete sale flow

---

## 🎉 You're Done!

Once the tables are created, the system is fully operational:

✅ **Phase 1:** Make-a-sale improvements
✅ **Phase 2:** Receipt generation & storage
✅ **Database:** Tables created and ready

**Ready for Phase 3:** Posted items workflow and notifications

---

**Estimated time:** 5 minutes
**Difficulty:** Very Easy ⭐
**Next step:** Test the system with a complete sale
