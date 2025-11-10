# Legacy BOM Importer - Complete Guide

## Overview
The Legacy BOM Importer is a 4-step wizard that converts old CSV BOM files into the new system format, automatically creating assemblies and updating product templates.

---

## CSV File Requirements

### Required Columns (in any order)
Your CSV file must contain these four pieces of information:

1. **Product Name** - The overall product/system name
   - Examples: "Brewhouse", "CIP Skid", "Control Panel"
   
2. **Assembly Name** - The sub-assembly or section within the product
   - Examples: "Main Disconnect", "Kettle VFD", "PLC Assembly"
   
3. **Component SKU** - The unique part number (Manufacturer Part #)
   - Examples: "VFD-1.5HP", "PLC-IDEC-40IO", "WIRE-14AWG-BLK"
   
4. **Quantity** - Number of components in that assembly
   - Examples: "1", "2", "0.5" (for partial quantities)

### Column Header Names
Your CSV can use **any column names** - you'll map them in Step 2. Common variations:
- Product: "Product", "Product Name", "System", "ProductType"
- Assembly: "Assembly", "Assembly Name", "Sub-Assembly", "Section"
- SKU: "SKU", "Part Number", "MPN", "Component", "Part#"
- Quantity: "Qty", "Quantity", "Count", "Amount"

### Example CSV Format

```csv
Product Name,Assembly Name,Component SKU,Qty
Brewhouse,Main Disconnect,DISCONNECT-200A,1
Brewhouse,Main Disconnect,WIRE-14AWG-BLK,25
Brewhouse,Kettle VFD,VFD-1.5HP,1
Brewhouse,Kettle VFD,CONTACTOR-30A,1
CIP Skid,Pump Control,PLC-IDEC-40IO,1
CIP Skid,Pump Control,RELAY-24VDC,3
```

**Alternative Format Example:**
```csv
System,Section,Part#,Count
Brewhouse,Main Disconnect,DISCONNECT-200A,1
Brewhouse,Main Disconnect,WIRE-14AWG-BLK,25
```
*This works too! You'll map "System" → Product Name, "Section" → Assembly Name, etc.*

---

## Step-by-Step Import Process

### Step 1: Upload BOM
1. Click **"Select .csv File"** button
2. Navigate to your legacy BOM CSV file
3. Click **Open**
4. The file will be automatically parsed and headers detected

**What Happens:**
- File is read into memory
- CSV headers are extracted
- System advances to Step 2

---

### Step 2: Map Columns

Map your CSV columns to the system's required fields.

#### Field Mappings

| System Field | Description | What to Map |
|--------------|-------------|-------------|
| **Product Name** | The overall product/system | Select the CSV column containing product names |
| **Assembly Name** | The sub-assembly within the product | Select the CSV column containing assembly/section names |
| **Component SKU** | The unique part number | Select the CSV column containing SKU/MPN/Part# |
| **Component Quantity** | How many of this component | Select the CSV column containing quantities |

#### Example Mapping Scenario

**Your CSV Headers:**
```
System, Panel Section, Manufacturer Part, Qty Needed
```

**Your Mappings:**
- Product Name → **System**
- Assembly Name → **Panel Section**
- Component SKU → **Manufacturer Part**
- Component Quantity → **Qty Needed**

#### Skip Option
- If you have extra columns you don't need, leave them as `-- (Skip) --`
- **All 4 required fields MUST be mapped** to proceed

**Validation:**
- The "Map Products" button is disabled until all 4 fields are mapped
- Click **"Map Products →"** to continue

---

### Step 3: Map Products

The system finds all unique product names from your CSV and asks you to map them to product codes.

#### Product Mapping Options

**Option 1: Map to Existing Product**
- Select an existing product code from the dropdown
- Format: `100 - Brewhouse`, `200 - CIP System`, etc.
- Use this when the product already exists in your product schema

**Option 2: Create New Product**
- Select **"+ Create new product..."** from dropdown
- Two new fields appear:
  - **New Code**: Enter a unique 3-digit code (e.g., `700`, `800`)
  - **New Name**: Enter the product name (e.g., "Custom Skid", "Service Panel")

#### Example Product Mapping Table

| Product Name (from CSV) | System Product Code | New Product (if creating) |
|------------------------|---------------------|---------------------------|
| Brewhouse | `100 - Brewhouse` | *(not creating)* |
| Custom Panel | `+ Create new product...` | Code: `750`, Name: "Custom Control Panel" |
| CIP Skid | `200 - CIP System` | *(not creating)* |

#### Validation Rules
- Every product name must have a mapping
- New product codes must be unique (can't match existing codes)
- New product codes and names cannot be empty
- System validates before allowing import

**Click "Process & Import →"** when all products are mapped

---

### Step 4: Complete

Import processing happens and results are displayed.

#### What Gets Created/Updated

**Assemblies Created:**
- Each unique `Product Name + Assembly Name` combination creates one assembly
- Assembly ID format: Generated unique ID
- Each assembly contains its list of components with quantities
- Saved to: `src/data/assemblies/assemblies.json`

**Product Templates Updated:**
- Products get their `componentAssemblies` field populated with assembly IDs
- New products are created in the schema if you selected "Create new product"
- Saved to: `src/data/product-templates/[product-code].json`

#### Success Screen Shows:
- ✓ **Assemblies Created**: Total number of assemblies generated
- ✓ **Product Templates Updated**: Number of product files updated
- Confirmation that files are ready to use
- **"Start New Import"** button to process another file

---

## Data Flow Example

### Input CSV:
```csv
Product Name,Assembly Name,Component SKU,Qty
Brewhouse,Main Disconnect,DISCONNECT-200A,1
Brewhouse,Main Disconnect,WIRE-14AWG-BLK,25
Brewhouse,Kettle VFD,VFD-1.5HP,1
```

### Step 2 Mapping:
- Product Name → `Product Name`
- Assembly Name → `Assembly Name`
- Component SKU → `Component SKU`
- Quantity → `Qty`

### Step 3 Mapping:
- "Brewhouse" → `100 - Brewhouse` *(existing product)*

### Results:

**2 Assemblies Created:**

1. Assembly: "Brewhouse - Main Disconnect"
   ```json
   {
     "assemblyId": "ASM-1730000001",
     "description": "Brewhouse - Main Disconnect",
     "components": [
       { "sku": "DISCONNECT-200A", "quantity": 1 },
       { "sku": "WIRE-14AWG-BLK", "quantity": 25 }
     ]
   }
   ```

2. Assembly: "Brewhouse - Kettle VFD"
   ```json
   {
     "assemblyId": "ASM-1730000002",
     "description": "Brewhouse - Kettle VFD",
     "components": [
       { "sku": "VFD-1.5HP", "quantity": 1 }
     ]
   }
   ```

**1 Product Updated:**
- File: `src/data/product-templates/100.json`
- Field `componentAssemblies` now includes:
  ```json
  "componentAssemblies": [
    "ASM-1730000001",
    "ASM-1730000002"
  ]
  ```

---

## Common Issues & Solutions

### Issue: "All four fields must be mapped"
**Cause:** One or more required fields is still set to `-- (Skip) --`  
**Solution:** Ensure Product Name, Assembly Name, Component SKU, and Quantity all have CSV columns selected

### Issue: "Product has not been mapped"
**Cause:** A product name from CSV wasn't assigned a code in Step 3  
**Solution:** Go through each row in Step 3 and select either an existing product or create a new one

### Issue: "New product code already exists"
**Cause:** You tried to create a new product with a code that's already in the system  
**Solution:** Choose a different code (e.g., if `700` exists, try `701`, `750`, `800`, etc.)

### Issue: "New product is missing Code or Name"
**Cause:** When creating a new product, you left the code or name field blank  
**Solution:** Fill in both the "New Code" and "New Name" fields

### Issue: Components not showing up in assemblies
**Cause:** The component SKU doesn't exist in your component library  
**Solution:** 
1. Go to **Component Manager** plugin
2. Add the missing components first
3. Re-run the BOM import

---

## Best Practices

### 1. Clean Your CSV First
- Remove empty rows
- Ensure consistent naming (e.g., don't mix "Brewhouse" and "BrewHouse")
- Verify quantities are numeric
- Check for typos in SKUs

### 2. Component Library First
- Import/sync your component library **before** importing BOMs
- Use **Component Manager** to sync from Smartsheet or CSV
- Verify all SKUs exist in the system

### 3. Product Schema Setup
- Define your product codes in the schema first if possible
- Use consistent 3-digit codes (100, 200, 300, etc.)
- Leave gaps for future products (e.g., use 100, 200, 300 instead of 100, 101, 102)

### 4. Assembly Naming Convention
- Be consistent with assembly names in your CSV
- Use descriptive names: "Main Disconnect" not "MD"
- Group related components logically

### 5. Test with Small File First
- Try importing a 5-10 row sample first
- Verify the results in Assembly Manager
- Then import your full BOM

---

## After Import

### Where to Find Your Data

**Assemblies:**
- Location: `src/data/assemblies/assemblies.json`
- View/Edit: **Assembly Manager** plugin
- Use in: **Quote Configurator**, **Manual BOM Builder**

**Product Templates:**
- Location: `src/data/product-templates/[code].json`
- View/Edit: **Product Template Manager** plugin
- Use in: **Quote Configurator**

### Next Steps

1. **Verify Assemblies**
   - Open **Assembly Manager**
   - Search for your newly created assemblies
   - Verify components and quantities are correct

2. **Check Product Templates**
   - Open **Product Template Manager**
   - Select your product code
   - Verify assembly references are added

3. **Test in Quote Configurator**
   - Create a new quote
   - Select your product
   - Verify assemblies appear and calculate correctly

4. **Manual BOM Builder**
   - Your new assemblies are now available to add to custom BOMs
   - Search and add them as needed

---

## Technical Details

### API Endpoints Used
- `window.app.showOpenDialog()` - File picker dialog
- `window.app.readFile()` - Read CSV file content
- `window.bomImporter.getCsvHeaders()` - Extract CSV column headers
- `window.bomImporter.processImport()` - Process and save the import
- `window.schemas.getProduct()` - Get available product codes

### File System Changes
The importer modifies:
1. `src/data/assemblies/assemblies.json` - Adds new assemblies
2. `src/data/product-templates/[code].json` - Updates product template files

### Assembly ID Format
- Pattern: `ASM-[timestamp]`
- Example: `ASM-1730000001`
- Guaranteed unique based on creation time

---

## Quick Reference Card

### Import Checklist
- [ ] Component library is populated (use Component Manager first)
- [ ] CSV file has 4 required columns (in any order)
- [ ] CSV is clean (no empty rows, consistent naming)
- [ ] Product codes are planned (know which are new vs existing)
- [ ] Ready to map columns in Step 2
- [ ] Ready to map products in Step 3
- [ ] Will verify results after import

### Required CSV Columns
1. Product Name (any header name, you'll map it)
2. Assembly Name (any header name, you'll map it)
3. Component SKU (any header name, you'll map it)
4. Quantity (any header name, you'll map it)

### Mapping Strategy
- **Step 2:** Match CSV headers to system fields
- **Step 3:** Map product names to codes (create new if needed)
- **Validation:** System checks everything before processing

---

## Support & Troubleshooting

### Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| "All four fields must be mapped" | Missing required column mapping | Map all 4 fields in Step 2 |
| "Product has not been mapped" | Incomplete product mapping | Complete all product mappings in Step 3 |
| "New product code already exists" | Duplicate product code | Choose different code |
| "Failed to read file" | File access error | Check file permissions, format |
| "Failed to parse CSV" | Invalid CSV format | Verify CSV structure, encoding |

### Debug Mode
Check browser console (F12) for detailed error messages:
- File reading issues
- CSV parsing errors
- API call failures
- Validation problems

### Getting Help
1. Check console for error details
2. Verify CSV format matches examples
3. Test with sample file first
4. Review this guide for common issues

---

## Appendix: Full CSV Examples

### Example 1: Multi-Product BOM
```csv
Product,Assembly,Part Number,Qty
Brewhouse,Main Disconnect,DISCONNECT-200A,1
Brewhouse,Main Disconnect,WIRE-14AWG-BLK,25
Brewhouse,Main Disconnect,WIRE-14AWG-RED,25
Brewhouse,Kettle VFD,VFD-1.5HP,1
Brewhouse,Kettle VFD,CONTACTOR-30A,1
Brewhouse,HMI Panel,HMI-7INCH,1
CIP Skid,Pump Control,PLC-IDEC-40IO,1
CIP Skid,Pump Control,RELAY-24VDC,3
CIP Skid,Pump Motor,MOTOR-3HP,1
CIP Skid,Pump Motor,STARTER-3HP,1
```

### Example 2: Service Call BOM
```csv
System,Section,Component,Count
Service Call,Replacement Parts,CONTACTOR-30A,2
Service Call,Replacement Parts,RELAY-24VDC,5
Service Call,Replacement Parts,FUSE-10A,10
Service Call,Wiring,WIRE-14AWG-BLK,50
Service Call,Wiring,WIRE-14AWG-RED,50
```

### Example 3: Minimal Format
```csv
Prod,Asm,SKU,Q
Panel,Main,DISCONNECT-100A,1
Panel,Main,BREAKER-20A,3
Panel,Controls,PLC-40IO,1
```

---

*Last Updated: November 3, 2025*  
*Version: 1.0.0*  
*Craft Automation Tools Hub*
