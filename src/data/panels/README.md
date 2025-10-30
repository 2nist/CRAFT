# Panel Data

This directory contains panel definitions for projects and their schema.

## Files

- **panel-schema.json** - JSON schema for validating panel data
- **panels.json** - Library of project panels

## Panel Structure

Each panel represents a specific control panel for a project, built from assemblies and optional one-off components.

### Required Fields
- `panelId` (string) - Unique identifier (e.g., "25-001-P1", UUID)
- `projectId` (string) - Project number this panel belongs to
- `description` (string) - Human-readable name (e.g., "Main Brewhouse Panel")

### Optional Fields
- `assemblies` (array) - List of assembly templates with quantities
- `oneOffComponents` (array) - Direct components not in standard assemblies

## Hierarchy

```
Project
  └── Panel(s)
        ├── Assembly(s)
        │     └── Component(s)
        └── One-off Component(s)
```

## Assembly References

Each assembly in a panel references an assembly template via `assemblyId`:

```json
{
  "assemblyId": "ASM-VFD-1.5HP",
  "quantity": 2
}
```

## One-Off Components

Components can be added directly to a panel outside of standard assemblies:

```json
{
  "sku": "SPECIAL-RELAY",
  "quantity": 3
}
```

## Usage in Plugins

Plugins can access panel data via IPC:

```javascript
// Get all panels
const panels = await window.panels.getAll();

// Search panels by project
const projectPanels = await window.panels.search({ projectId: 'CA251029035-101001110' });

// Get panel by ID
const panel = await window.panels.getById('PANEL-EXAMPLE-001');

// Expand panel (get full BOM with all components, costs, labor)
const expanded = await window.panels.expand('PANEL-EXAMPLE-001');
```

## BOM Expansion

The `expand` function cascades through the hierarchy:
1. Gets the panel
2. Expands each assembly to its components
3. Adds one-off components
4. Calculates quantities (assembly qty × component qty)
5. Returns full BOM with costs and labor hours

## Data Format Example

```json
{
  "panelId": "25-001-P1",
  "projectId": "CA251029035-101001110",
  "description": "Main Brewhouse Control Panel",
  "assemblies": [
    {
      "assemblyId": "ASM-VFD-1.5HP",
      "quantity": 2
    },
    {
      "assemblyId": "ASM-DISCONNECT-30A",
      "quantity": 1
    }
  ],
  "oneOffComponents": [
    {
      "sku": "SPECIAL-RELAY",
      "quantity": 3
    }
  ]
}
```
