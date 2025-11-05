# Legacy BOM Importer - Quick Start Instructions

## 📋 What This Tool Does

The Legacy BOM Importer converts your old CSV BOM files into the new system format:
- ✅ Creates **Assemblies** automatically
- ✅ Updates **Product Templates** with assembly references
- ✅ Handles multiple products in one file
- ✅ Allows creating new products on the fly

---

## 🚀 Quick Start (5 Minutes)

### Step 1️⃣: Prepare Your CSV File

**Option A: Use the Template**
- Open `BOM_IMPORT_TEMPLATE.csv` 
- Replace the sample data with your actual BOM data
- Keep the same column headers: `Product Name`, `Assembly Name`, `Component SKU`, `Quantity`

**Option B: Use Your Own CSV**
- Your CSV can have **any column names** - you'll map them in the tool
- Must include these 4 pieces of info:
  1. Product/system name
  2. Assembly/section name  
  3. Component SKU/part number
  4. Quantity

### Step 2️⃣: Open the BOM Importer
1. Launch Craft Tools Hub
2. Click **"BOM Importer"** from the plugin menu
3. Click **"Select .csv File"** button
4. Choose your CSV file

### Step 3️⃣: Map Your Columns
Match your CSV columns to the system fields:

| System Needs | Your CSV Column | Example |
|--------------|-----------------|---------|
| **Product Name** | ➜ Select your column | "Product", "System", "ProductType" |
| **Assembly Name** | ➜ Select your column | "Assembly", "Section", "Sub-Assembly" |
| **Component SKU** | ➜ Select your column | "SKU", "Part#", "MPN", "Component" |
| **Component Quantity** | ➜ Select your column | "Qty", "Quantity", "Count" |

Click **"Map Products →"**

### Step 4️⃣: Map Products to Codes

For each product name in your CSV, choose:

**Existing Product:**
- Select from dropdown: `100 - Brewhouse`, `200 - CIP System`, etc.

**New Product:**
- Select **"+ Create new product..."**
- Enter **New Code**: `700`, `800`, etc. (3 digits)
- Enter **New Name**: "Custom Skid", "Service Panel", etc.

Click **"Process & Import →"**

### Step 5️⃣: Done! ✅
- See how many assemblies were created
- See how many products were updated
- Your data is now in the system
- Click **"Start New Import"** to process another file

---

## 📝 CSV Format Examples

### Example 1: Standard Format (Recommended)
```csv
Product Name,Assembly Name,Component SKU,Quantity
Brewhouse,Main Disconnect,DISCONNECT-200A,1
Brewhouse,Main Disconnect,WIRE-14AWG-BLK,25
Brewhouse,Kettle VFD,VFD-1.5HP,1
CIP Skid,Pump Control,PLC-IDEC-40IO,1
```

### Example 2: Different Column Names (Still Works!)
```csv
System,Section,Part Number,Qty
Brewhouse,Main Disconnect,DISCONNECT-200A,1
Brewhouse,Main Disconnect,WIRE-14AWG-BLK,25
```
*You'll just map "System" → Product Name, "Section" → Assembly Name, etc.*

### Example 3: Minimal Format
```csv
Prod,Asm,SKU,Q
Panel,Main,DISCONNECT-100A,1
Panel,Controls,PLC-40IO,1
```
*Any column names work as long as you have the 4 required pieces of data!*

---

## ⚠️ Before You Import - Checklist

- [ ] **Component Library is populated**
  - Go to **Component Manager** first
  - Import/sync your components from Smartsheet or CSV
  - Verify all SKUs in your BOM exist in the component library
  
- [ ] **CSV file is clean**
  - No empty rows between data
  - Product names are consistent (not "Brewhouse" and "BrewHouse")
  - Quantities are numbers (not "two" or "N/A")
  - No special characters in SKUs
  
- [ ] **Know your product codes**
  - List existing products: 100, 200, 300, etc.
  - Decide which are new vs existing
  - Pick unique codes for new products (700, 750, 800, etc.)

---

## 🎯 What You'll Get After Import

### Assemblies Created
Each unique **Product + Assembly** combination becomes one assembly:

**Example:**
- CSV has 3 rows for "Brewhouse - Main Disconnect"
- Creates 1 assembly with 3 components inside it
- Assembly ID: `ASM-1730000001`

### Product Templates Updated
Products get their assembly lists updated:

**Example:**
- Product "100 - Brewhouse" file
- Gets assembly IDs added: `["ASM-1730000001", "ASM-1730000002"]`
- Ready to use in Quote Configurator

---

## 🔧 Common Issues & Fixes

### "All four fields must be mapped"
❌ **Problem:** Skipped a required field  
✅ **Fix:** Map all 4 fields in Step 2 (no skips allowed)

### "Product has not been mapped"
❌ **Problem:** Left a product unmapped in Step 3  
✅ **Fix:** Select a code or create new product for every row

### "New product code already exists"
❌ **Problem:** Code `700` is already used  
✅ **Fix:** Try `701`, `750`, `800`, etc.

### Components not showing in assemblies
❌ **Problem:** SKUs don't exist in component library  
✅ **Fix:** Add components to library first (Component Manager)

### File won't open
❌ **Problem:** Wrong file format or permissions  
✅ **Fix:** Ensure it's a .csv file, not .xlsx or .xls

---

## 💡 Pro Tips

### 1. Test with Small File First
- Export just 5-10 rows from your full BOM
- Import the test file
- Verify results in Assembly Manager
- Then import the full file

### 2. Use Consistent Naming
- Assembly names should be descriptive: "Main Disconnect" not "MD"
- Product names should match across rows
- Avoid typos that create duplicate products

### 3. Group Components Logically
- Put related components in same assembly
- Think about how you'll use them in quotes
- Example: All VFD components together in "Kettle VFD Assembly"

### 4. Component Library First
- **Always** populate your component library before importing BOMs
- Missing SKUs will cause errors or incomplete assemblies
- Use Component Manager to sync from Smartsheet

### 5. Product Code Strategy
- Use hundreds: 100, 200, 300 (not 101, 102, 103)
- Leave gaps for future products
- Group by category: 100-199 Brewhouse, 200-299 CIP, etc.

---

## 📁 Where Your Data Goes

### After Import:
1. **Assemblies** → `src/data/assemblies/assemblies.json`
   - View in: **Assembly Manager** plugin
   - Use in: Quote Configurator, Manual BOM Builder

2. **Product Templates** → `src/data/product-templates/[code].json`
   - View in: **Product Template Manager** plugin
   - Use in: Quote Configurator

---

## 🔄 After Import - Next Steps

### 1. Verify Assemblies
- Open **Assembly Manager**
- Search for your new assemblies
- Check components and quantities are correct
- Edit if needed

### 2. Check Products
- Open **Product Template Manager**
- Select your product code
- Verify assembly references appear
- Test in Quote Configurator

### 3. Build a Test Quote
- Open **Quote Configurator**
- Create new quote with your product
- Verify assemblies load correctly
- Check cost calculations

---

## 📞 Need Help?

### Debug Steps:
1. Press **F12** to open browser console
2. Look for error messages in red
3. Check the specific error details
4. Refer to BOM_IMPORTER_GUIDE.md for detailed troubleshooting

### Still Stuck?
- Review the full guide: `BOM_IMPORTER_GUIDE.md`
- Check CSV format against template
- Verify component library is complete
- Test with the provided template file first

---

## 📦 Template File Included

Use `BOM_IMPORT_TEMPLATE.csv` as your starting point:
- 5 sample products
- 15 assemblies  
- 35+ component rows
- Shows proper format
- Ready to customize with your data

**To use:**
1. Open `BOM_IMPORT_TEMPLATE.csv` in Excel or text editor
2. Replace sample data with your actual BOM
3. Keep the column headers OR use your own (you'll map them)
4. Save as .csv
5. Import!

---

## ⏱️ Estimated Time

| Task | Time |
|------|------|
| Prepare CSV file | 10-15 min |
| Import through wizard | 5 min |
| Verify results | 5 min |
| **Total** | **~20-25 min** |

*For a typical 100-row BOM file*

---

## ✅ Success Checklist

After import, you should be able to:
- [ ] See new assemblies in Assembly Manager
- [ ] Find assemblies by searching product or assembly name
- [ ] See assembly references in Product Template Manager
- [ ] Create a quote using the imported product
- [ ] See assemblies populate in quote configurator
- [ ] Calculate costs correctly
- [ ] Add assemblies to Manual BOM Builder

---

## 🎓 Remember

1. **Component library first** - Always!
2. **Clean CSV data** - No typos, consistent names
3. **Test small first** - Use sample file before full import
4. **Map carefully** - Take time in Steps 2 & 3
5. **Verify after** - Check Assembly Manager and Product Templates

---

*Ready to import? Open the BOM Importer plugin and get started!*

**Files Included:**
- `BOM_IMPORT_TEMPLATE.csv` - Sample CSV template
- `BOM_IMPORTER_GUIDE.md` - Comprehensive reference guide
- This file - Quick start instructions

---

*Last Updated: November 3, 2025*  
*Craft Automation Tools Hub - v0.3*
