# Assembly Data

This directory contains assembly templates (kits of components) and their schema.

## Files

- **assembly-schema.json** - JSON schema for validating assembly data
- **assemblies.json** - Library of reusable assembly templates

## Assembly Structure

Each assembly is a template/kit that groups components together with quantities.

### Required Fields
- `assemblyId` (string) - Unique identifier (e.g., "ASM-VFD-1.5HP")
- `description` (string) - Human-readable name (e.g., "1.5HP VFD Starter Kit")
- `components` (array) - List of components with SKUs and quantities

### Optional Fields
- `category` (string) - Standardized category from enum
- `estimatedLaborHours` (number) - Time to build the assembly

## Categories

Assemblies can be categorized as:
- Enclosure
- Disconnect
- Fuse
- Branch Breaker
- PWRDST
- Control
- SAFETY
- PLC/COM
- MOTOR CONTROL/HEATER CONTROL
- WIRING
- INSTRUMENT
- PNU

## Component References

Each component in an assembly references a component from `component_catalog.json` via its `sku`:

```json
{
  "sku": "ENC",
  "quantity": 1,
  "notes": "Main enclosure"
}
```

## Usage in Plugins

Plugins can access assembly data via IPC:

```javascript
// Get all assemblies
const assemblies = await window.assemblies.getAll();

// Search assemblies
const controlAssemblies = await window.assemblies.search({ category: 'Control' });

// Get assembly by ID
const assembly = await window.assemblies.getById('ASM-VFD-1.5HP');

// Expand assembly (get full component details with prices)
const expanded = await window.assemblies.expand('ASM-VFD-1.5HP');
```

## Data Format Example

```json
{
  "assemblyId": "ASM-VFD-1.5HP",
  "description": "1.5HP VFD Starter Kit",
  "category": "MOTOR CONTROL/HEATER CONTROL",
  "components": [
    {
      "sku": "ENC",
      "quantity": 1,
      "notes": "20Hx16Wx8D enclosure"
    },
    {
      "sku": "PAN",
      "quantity": 1,
      "notes": "Mounting panel"
    },
    {
      "sku": "VFD-1.5HP",
      "quantity": 1
    }
  ],
  "estimatedLaborHours": 3.5
}
```

## BOM Generation

Assemblies can be used to quickly generate BOMs (Bill of Materials):
1. Select assembly templates
2. Specify quantities needed
3. Automatically multiply component requirements
4. Calculate total costs and labor hours
