# Component Data

This directory contains the component list data and schema.

## Files

- **schema.json** - JSON schema for validating component data
- **components.json** - Full component list in JSON format (3000+ parts)
- **components.csv** - Full component list in CSV format (for Excel/imports)

## Schema Structure

Each component has the following properties:

### Required Fields
- `id` (string) - Unique component identifier
- `partNumber` (string) - Manufacturer part number
- `description` (string) - Component description

### Optional Fields
- `manufacturer` (string) - Manufacturer name
- `category` (string) - Component category
- `subcategory` (string) - Component subcategory
- `price` (number) - Unit price in USD
- `quantity` (integer) - Available quantity
- `specifications` (object) - Technical specifications (flexible structure)
- `notes` (string) - Additional notes

## Usage in Plugins

Plugins can access component data via IPC:

```javascript
// Get all components
const components = await window.components.getAll();

// Search components
const results = await window.components.search({ category: 'Sensors' });

// Get component by ID
const component = await window.components.getById('COMP-001');
```

## Updating Component Data

1. Edit `components.csv` in Excel or a text editor
2. Convert to JSON if needed, or keep both in sync
3. Validate against `schema.json`
4. Rebuild the app to include updated data

## Data Format Example

```json
{
  "id": "COMP-001",
  "partNumber": "ABC-12345",
  "description": "Temperature Sensor",
  "manufacturer": "Acme Corp",
  "category": "Sensors",
  "subcategory": "Temperature",
  "price": 45.99,
  "quantity": 100,
  "specifications": {
    "voltage": "24V DC",
    "range": "-40 to 125°C",
    "accuracy": "±0.5°C"
  },
  "notes": "Industrial grade"
}
```
