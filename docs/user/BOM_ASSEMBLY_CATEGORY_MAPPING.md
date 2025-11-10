# BOM Import Template - Assembly Category Mapping Guide

## Overview
This guide explains how to use the **Category** column in the BOM Import Template to properly organize components into assemblies with the correct categories.

---

## Template Structure

The enhanced BOM Import Template includes these columns:

| Column | Required | Purpose | Example |
|--------|----------|---------|---------|
| **Product Name** | ✅ Yes | Overall product/system name | "Brewhouse", "CIP Skid" |
| **Assembly Name** | ✅ Yes | Short assembly identifier (used for grouping) | "Kettle Pump Starter - 10A" |
| **Assembly Description** | ⚠️ Recommended | Detailed description of what the assembly does | "Contactor-based motor starter for kettle recirculation pump (6.3-10A range)" |
| **Component SKU** | ✅ Yes | Unique part number | "XTPR010BC1" |
| **Quantity** | ✅ Yes | Number of components | "1", "2", "3" |
| **Category** | ⚠️ Recommended | Assembly category for organization | "MOTOR CONTROL CON" |
| **Component Description** | ℹ️ Optional | Component description | "EATON - MMP - Short Circuit..." |
| **Notes** | ℹ️ Optional | Additional notes | "Motor protection 10A" |

### Understanding Assembly Name vs Assembly Description

- **Assembly Name**: Short identifier used to group components together. All components with the same Assembly Name will be combined into one assembly.
  - Example: "Kettle Pump Starter - 10A"
  
- **Assembly Description**: Detailed description that appears in the assembly library, Quote Configurator, and BOM exports. Provides context about what the assembly does and when to use it.
  - Example: "Contactor-based motor starter for kettle recirculation pump (6.3-10A range)"
  - If not provided, the Assembly Name will be used as the description.

---

## Assembly Categories

Use these standardized categories to organize your assemblies:

### Enclosure & Structure
- **ENCLOSURE** - Main enclosures, boxes, cabinets
  - Example: "42Hx36Wx10D Grey Type 4 Enclosure"

### Power Distribution
- **DISCONNECT** - Main disconnects and isolation switches
  - Example: "60AMP NON-FUSED DISCONNECT"
  
- **BRANCH BREAKER** - Branch circuit breakers and feeders
  - Example: "EATON - B Frame 3 Pole Feeder (60A Max)"
  
- **MAIN BREAKER** - Main circuit breakers
  - Example: "200A Main Breaker"

- **PWRDST** (Power Distribution) - Power supplies, distribution blocks
  - Example: "24VDC 5A Power Supply"

- **FUSE** - Fuse holders and fuses
  - Example: "CLASS CC 3POLE FUSE HOLDER"

### Motor Control
- **MOTOR CONTROL CON** (Contactor-based) - Motor starters with contactors
  - Example: "Kettle Pump Starter - 10A"
  - Typical Components: MMPs, contactors, auxiliaries, overload relays
  
- **MOTOR CONTROL VFD** - Variable frequency drive motor starters
  - Example: "Mash Pump VFD - 3HP"
  - Typical Components: VFD, bypass contactor, reactor

### Heater Control
- **HEATER CONTROL SSR** (Solid State Relay) - SSR-based heater control
  - Example: "Kettle Heater Control - 20A SSR"
  
- **HEATER CONTROL CON** (Contactor-based) - Contactor-based heater control
  - Example: "HLT Heater Control - 30A"

### Control Systems
- **PLC/COM-Logic Controller w/HMI** - PLC CPUs and HMI panels
  - Example: "IDEC 40I/O PLC with 12.1 HMI"
  
- **PLC/COM Modules** - I/O modules, communication modules
  - Example: "16pt Relay Output Module"

### Safety & Control
- **SAFETY** - Safety relays, e-stops, safety circuits
  - Example: "Emergency Stop Safety Circuit"
  
- **CONTROL** - General control components (switches, lights, relays)
  - Example: "Operator Control Station"

### Wiring & Terminals
- **WIRING** - Wire, cable, terminals, connectors
  - Example: "Control Wiring Kit"

---

## Category Mapping Best Practices

### 1. Group Related Components
Components that work together should be in the same assembly with a consistent category and description:

```csv
Product Name,Assembly Name,Assembly Description,Component SKU,Quantity,Category,Component Description
Brewhouse,Kettle Pump Starter - 10A,Contactor-based motor starter for kettle recirculation pump (6.3-10A range),XTPR010BC1,1,MOTOR CONTROL CON,Motor protection 10A
Brewhouse,Kettle Pump Starter - 10A,Contactor-based motor starter for kettle recirculation pump (6.3-10A range),XTPAXFA11,1,MOTOR CONTROL CON,Auxiliary contacts
Brewhouse,Kettle Pump Starter - 10A,Contactor-based motor starter for kettle recirculation pump (6.3-10A range),XTPAXEMCB,1,MOTOR CONTROL CON,Mechanical interlock
Brewhouse,Kettle Pump Starter - 10A,Contactor-based motor starter for kettle recirculation pump (6.3-10A range),XTCE009B10TD,1,MOTOR CONTROL CON,Motor contactor
```

All components share:
- Same **Product Name**: "Brewhouse"
- Same **Assembly Name**: "Kettle Pump Starter - 10A" (groups them together)
- Same **Assembly Description**: "Contactor-based motor starter..." (appears in Quote Configurator)
- Same **Category**: "MOTOR CONTROL CON"

### 2. Use Descriptive Assembly Names and Descriptions
Include sizing or rating information in assembly names, and provide detailed descriptions:

✅ **Good Examples:**
```csv
Assembly Name,Assembly Description
Kettle Pump Starter - 10A,Contactor-based motor starter for kettle recirculation pump (6.3-10A range)
Mash Pump VFD - 3HP,Variable frequency drive assembly for 3HP mash pump with speed control
Main Disconnect Assembly,60A main power disconnect with safety handle
```

❌ **Poor Examples:**
```csv
Assembly Name,Assembly Description
Starter 1,Starter
PHASE,PHASE
MMP,MMP
```

### 3. Maintain Consistent Naming
Use the same category names throughout your BOM:

✅ **Consistent:**
```csv
Category
MOTOR CONTROL CON
MOTOR CONTROL CON
MOTOR CONTROL VFD
```

❌ **Inconsistent:**
```csv
Category
MOTOR CONTROL CON
Motor Control CON
MCC
MOTOR CTRL
```

---

## Common Assembly Patterns

### Motor Starter Pattern (Contactor-based)
```csv
Product Name,Assembly Name,Assembly Description,Component SKU,Quantity,Category,Component Description,Notes
Brewhouse,Pump Starter - 10A,Contactor-based motor starter for brewhouse pump (6.3-10A range),XTPR010BC1,1,MOTOR CONTROL CON,Overload relay 6.3-10A,Motor protection
Brewhouse,Pump Starter - 10A,Contactor-based motor starter for brewhouse pump (6.3-10A range),XTPAXFA11,1,MOTOR CONTROL CON,Auxiliary contact block,Status feedback
Brewhouse,Pump Starter - 10A,Contactor-based motor starter for brewhouse pump (6.3-10A range),XTPAXEMCB,1,MOTOR CONTROL CON,Mechanical interlock,Safety
Brewhouse,Pump Starter - 10A,Contactor-based motor starter for brewhouse pump (6.3-10A range),XTCE009B10TD,1,MOTOR CONTROL CON,9A Contactor 3P,Motor switching
```

### VFD Starter Pattern
```csv
Product Name,Assembly Name,Assembly Description,Component SKU,Quantity,Category,Component Description,Notes
Brewhouse,Mash Pump VFD - 3HP,Variable frequency drive assembly for 3HP mash pump with speed control,DM1-32011NB-S20S,1,MOTOR CONTROL VFD,VFD 3HP 230V 3PH,Variable speed drive
Brewhouse,Mash Pump VFD - 3HP,Variable frequency drive assembly for 3HP mash pump with speed control,BYPASS-CONTACTOR,1,MOTOR CONTROL VFD,Bypass contactor,Manual operation
Brewhouse,Mash Pump VFD - 3HP,Variable frequency drive assembly for 3HP mash pump with speed control,LINE-REACTOR,1,MOTOR CONTROL VFD,Line reactor 3%,Harmonic reduction
```

### PLC System Pattern
```csv
Product Name,Assembly Name,Assembly Description,Component SKU,Quantity,Category,Component Description,Notes
Brewhouse,PLC Control System,IDEC PLC system with 40 I/O points and expansion modules,FC6A-C40R1CE,1,PLC/COM-Logic Controller w/HMI,PLC CPU 40I/O,Main controller
Brewhouse,PLC Control System,IDEC PLC system with 40 I/O points and expansion modules,FC6A-R161,1,PLC/COM Modules,16pt Relay Output,Digital outputs
Brewhouse,PLC Control System,IDEC PLC system with 40 I/O points and expansion modules,FC6A-J8A1,1,PLC/COM Modules,8pt Analog Input,Sensor inputs
Brewhouse,PLC Control System,IDEC PLC system with 40 I/O points and expansion modules,FC6A-K4A1,1,PLC/COM Modules,4pt Analog Output,Control outputs
```

### Safety Circuit Pattern
```csv
Product Name,Assembly Name,Assembly Description,Component SKU,Quantity,Category,Component Description,Notes
Brewhouse,Safety Circuit Assembly,Emergency stop safety circuit with dual e-stop buttons and safety relay,440R-N23135,1,SAFETY,Safety relay module,Dual channel
Brewhouse,Safety Circuit Assembly,Emergency stop safety circuit with dual e-stop buttons and safety relay,800FP-MT44PX01,2,SAFETY,E-stop button 40mm,Red mushroom
Brewhouse,Safety Circuit Assembly,Emergency stop safety circuit with dual e-stop buttons and safety relay,800F-15YSE112,2,SAFETY,E-stop legend plate,Yellow labels
```

### Power Supply Pattern
```csv
Product Name,Assembly Name,Assembly Description,Component SKU,Quantity,Category,Component Description,Notes
Brewhouse,Power Supply Assembly,24VDC control power supply with fuse protection,PS5R-VF24,1,PWRDST,24VDC 5A Power Supply,Control voltage
Brewhouse,Power Supply Assembly,24VDC control power supply with fuse protection,E93/30SCC,1,FUSE,Fuse holder 3P 30A,Input protection
Brewhouse,Power Supply Assembly,24VDC control power supply with fuse protection,LP-CC-2,2,FUSE,2A Time Delay Fuse,Output protection
```

---

## Using the Template

### Step 1: Prepare Your Data
Organize your BOM data with component groupings in mind:
1. Group components that belong together
2. Identify the category for each assembly
3. Create descriptive assembly names

### Step 2: Fill in the Template
Use the provided `BOM_IMPORT_TEMPLATE.csv` as a starting point:

```csv
Product Name,Assembly Name,Component SKU,Quantity,Category,Description,Notes
YourProduct,Assembly Name,PART-123,1,MOTOR CONTROL CON,Description here,Optional notes
YourProduct,Assembly Name,PART-456,1,MOTOR CONTROL CON,Another component,
```

### Step 3: Import Using BOM Importer
1. Open the **Legacy BOM Importer** plugin
2. Upload your CSV file
3. Map columns:
   - Product Name → "Product Name"
   - Assembly Name → "Assembly Name"
   - Component SKU → "Component SKU"
   - Quantity → "Quantity"
   - **Category → "Category"** ← Important for assembly organization
4. Map products to product codes
5. Import and verify

### Step 4: Verify Results
After import:
1. Open **Assembly Manager**
2. Search for your assemblies
3. Verify each assembly has:
   - ✅ Correct category
   - ✅ All components listed
   - ✅ Correct quantities
   - ✅ Descriptive name

---

## Category Reference Quick List

| Category Code | Full Name | Used For |
|---------------|-----------|----------|
| **ENCLOSURE** | Enclosures | Panels, boxes, cabinets |
| **DISCONNECT** | Disconnects | Main power disconnects |
| **BRANCH BREAKER** | Branch Breakers | Circuit protection |
| **MAIN BREAKER** | Main Breakers | Main circuit protection |
| **PWRDST** | Power Distribution | Power supplies, distribution |
| **FUSE** | Fuses | Fuse holders, fuses |
| **MOTOR CONTROL CON** | Motor Control - Contactor | Contactor-based starters |
| **MOTOR CONTROL VFD** | Motor Control - VFD | VFD-based starters |
| **HEATER CONTROL SSR** | Heater Control - SSR | SSR heater control |
| **HEATER CONTROL CON** | Heater Control - Contactor | Contactor heater control |
| **PLC/COM-Logic Controller w/HMI** | PLC & HMI | Controllers, displays |
| **PLC/COM Modules** | PLC Modules | I/O, communication modules |
| **SAFETY** | Safety Components | E-stops, safety relays |
| **CONTROL** | Control Components | Switches, lights, relays |
| **WIRING** | Wiring & Terminals | Wire, terminals, connectors |

---

## Troubleshooting

### Issue: Assemblies Created Without Categories
**Cause:** Category column not mapped during import  
**Solution:** 
1. In Step 2 of BOM Importer, map "Category" column
2. Ensure your CSV has category data filled in
3. Re-import the BOM

### Issue: Multiple Assemblies Instead of One
**Cause:** Inconsistent assembly names in CSV  
**Solution:**
- Use exact same spelling for assembly names
- Example: "Kettle Pump Starter - 10A" not "Kettle Pump Starter-10A" or "KETTLE PUMP STARTER - 10A"

### Issue: Components in Wrong Category
**Cause:** Different categories used for same assembly  
**Solution:**
- All components in one assembly should share the same category
- Edit CSV to use consistent category per assembly
- Re-import

### Issue: Can't Find Assemblies in Quote Configurator
**Cause:** Category filter not matching  
**Solution:**
- Use standard categories from this guide
- Quote Configurator filters by category
- Verify assembly categories in Assembly Manager

---

## Examples by Industry

### Brewery Control Panel
```csv
Product Name,Assembly Name,Component SKU,Quantity,Category
Brewhouse,Main Enclosure,ENC-42x36,1,ENCLOSURE
Brewhouse,Main Disconnect,DIS-60A,1,DISCONNECT
Brewhouse,PLC System,PLC-IDEC-40IO,1,PLC/COM-Logic Controller w/HMI
Brewhouse,Kettle Pump - 10A,MMP-10A-KIT,1,MOTOR CONTROL CON
Brewhouse,HLT VFD - 2HP,VFD-2HP-KIT,1,MOTOR CONTROL VFD
Brewhouse,Safety Circuit,ESTOP-CIRCUIT,1,SAFETY
```

### Food Processing Panel
```csv
Product Name,Assembly Name,Component SKU,Quantity,Category
Processing Line,Main Enclosure,ENC-60x48,1,ENCLOSURE
Processing Line,Main Disconnect,DIS-100A,1,DISCONNECT
Processing Line,PLC System,PLC-AB-1756,1,PLC/COM-Logic Controller w/HMI
Processing Line,Mixer Motor - 5HP,VFD-5HP-KIT,1,MOTOR CONTROL VFD
Processing Line,Conveyor Motor - 1HP,MMP-1HP-KIT,1,MOTOR CONTROL CON
Processing Line,Tank Heater - 30A,SSR-30A-KIT,1,HEATER CONTROL SSR
```

### CIP System Panel
```csv
Product Name,Assembly Name,Component SKU,Quantity,Category
CIP Skid,Main Enclosure,ENC-36x30,1,ENCLOSURE
CIP Skid,Main Disconnect,DIS-30A,1,DISCONNECT
CIP Skid,PLC System,PLC-IDEC-24IO,1,PLC/COM-Logic Controller w/HMI
CIP Skid,Supply Pump - 3HP,VFD-3HP-KIT,1,MOTOR CONTROL VFD
CIP Skid,Return Pump - 1.5HP,MMP-1.5HP-KIT,1,MOTOR CONTROL CON
CIP Skid,Safety Circuit,ESTOP-DUAL,1,SAFETY
```

---

## Template Download

The enhanced template is located at:
```
Craft_Tools_Hub/BOM_IMPORT_TEMPLATE.csv
```

This template includes:
- ✅ Properly grouped assemblies
- ✅ Correct category assignments
- ✅ Descriptive assembly names
- ✅ Real-world component examples
- ✅ All optional columns demonstrated

---

## Next Steps

1. **Download the Template**
   - Use `BOM_IMPORT_TEMPLATE.csv` as your starting point

2. **Customize for Your Project**
   - Replace example data with your components
   - Keep the category structure
   - Use descriptive assembly names

3. **Import Your BOM**
   - Use Legacy BOM Importer plugin
   - Map the Category column in Step 2
   - Verify in Assembly Manager

4. **Use in Quote Configurator**
   - Your assemblies will appear organized by category
   - Easy filtering and selection
   - Proper BOM generation

---

*Last Updated: November 5, 2025*  
*Version: 1.0.0*  
*Craft Automation Tools Hub*
