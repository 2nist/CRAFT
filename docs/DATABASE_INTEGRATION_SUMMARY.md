# Database Integration for Margin Calculator & Manual BOM Builder

## Overview

Both the **Margin Calculator** and **Manual BOM Builder** plugins now save and load their data to/from the SQLite database, similar to how the Number Generator works. This allows calculations and BOMs to be associated with quote numbers and retrieved later.

## Database Schema

### Table: `manual_quotes`

Located in the main SQLite database (`server.db`), this table stores both margin calculations and manual BOMs:

```sql
CREATE TABLE IF NOT EXISTS manual_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quoteNumber TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,              -- 'margin_calculation' or 'bom'
  data TEXT NOT NULL,               -- JSON string with calculation/BOM data
  projectName TEXT,
  customer TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Backend Implementation

### IPC Handlers (electron/main.js)

Four new IPC handlers were added:

#### 1. `margin-calc:save`
Saves margin calculator data to the database.

**Input:**
```javascript
{
  quoteNumber: "CA251114001-XX...",
  projectName: "Optional project name",
  customer: "Optional customer name",
  mode: "FORWARD" | "REVERSE",
  inputs: {
    estimatedBOM: 20,
    engineeringHours: 1,
    productionHours: 0,
    programmingHours: 0,
    otherCosts: 0,
    overheadPercent: 0.25,
    purchasePrice: 0,
    targetMargin: 0.25
  },
  results: {
    laborCost: 60,
    totalCOGS: 80,
    profit: 20,
    marginPercent: 0.25,
    priceForTargetMargin: 100
  }
}
```

**Output:**
```javascript
{
  success: true,
  message: "Calculation saved successfully"
}
```

#### 2. `margin-calc:get`
Retrieves a saved margin calculation by quote number.

**Input:**
```javascript
"CA251114001-XX..."  // quoteNumber string
```

**Output:**
```javascript
{
  success: true,
  data: {
    mode: "FORWARD",
    inputs: { ... },
    results: { ... }
  },
  projectName: "...",
  customer: "...",
  createdAt: "2025-11-14T...",
  updatedAt: "2025-11-14T..."
}
```

#### 3. `manual-bom:save`
Saves manual BOM data to the database.

**Input:**
```javascript
{
  quoteNumber: "CA251114001-XX...",
  projectName: "Optional project name",
  customer: "Optional customer name",
  bom: {
    name: "My BOM",
    description: "BOM description",
    tags: ["tag1", "tag2"],
    subAssemblies: [...],
    components: [...]
  },
  costData: {
    totalMaterialCost: 5000,
    marginPercent: 40.0,
    finalPrice: 8333
  }
}
```

**Output:**
```javascript
{
  success: true,
  message: "BOM saved successfully"
}
```

#### 4. `manual-bom:get`
Retrieves a saved BOM by quote number.

**Input:**
```javascript
"CA251114001-XX..."  // quoteNumber string
```

**Output:**
```javascript
{
  success: true,
  data: {
    bom: { ... },
    costData: { ... }
  },
  projectName: "...",
  customer: "...",
  createdAt: "2025-11-14T...",
  updatedAt: "2025-11-14T..."
}
```

### Preload API (electron/preload.js)

Two new APIs were exposed to the renderer process:

```javascript
// Margin Calculator API
window.marginCalc = {
  save: (marginData) => Promise<Result>,
  get: (quoteNumber) => Promise<Result>
}

// Manual BOM API
window.manualBom = {
  save: (bomData) => Promise<Result>,
  get: (quoteNumber) => Promise<Result>
}
```

## Frontend Implementation

### Margin Calculator (src/plugins/MarginCalculator.jsx)

#### New State Variables
```javascript
const [quoteNumber, setQuoteNumber] = useState('');
const [projectName, setProjectName] = useState('');
const [customer, setCustomer] = useState('');
const [isSaving, setIsSaving] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [saveMessage, setSaveMessage] = useState('');
```

#### New Functions
- `handleSaveToDatabase()` - Saves current calculation to database
- `handleLoadFromDatabase()` - Loads calculation from database by quote number

#### New UI Section
Added a database save/load panel at the top with:
- Quote Number input (required)
- Project Name input (optional)
- Customer input (optional)
- "Save to Database" button
- "Load from Database" button
- Status message display

#### How to Use

1. **To Save:**
   - Enter inputs and calculate results
   - Enter a quote number (e.g., from Number Generator)
   - Optionally enter project name and customer
   - Click "Save to Database"
   - Success message appears

2. **To Load:**
   - Enter the quote number you want to load
   - Click "Load from Database"
   - All fields populate with saved data

### Manual BOM Builder (src/plugins/ManualBomBuilder.jsx)

#### Updated Functions
- `saveToQuote()` - Now uses `window.manualBom.save()` instead of old API
- `loadFromQuote()` - Now uses `window.manualBom.get()` instead of old API

#### Existing UI
The Manual BOM Builder already had save/load UI in the "Manual Quote System" section:
- Quote Number input
- Project Name input
- Customer input
- "Save to Quote" button (now saves to database)
- "Load from Quote" button (now loads from database)

#### How to Use

1. **To Save:**
   - Build your BOM with components/sub-assemblies
   - Enter quote number
   - Optionally enter project name and customer
   - Click "Save to Quote"
   - Success message appears

2. **To Load:**
   - Enter quote number
   - Click "Load from Quote" (button might be in a different section)
   - BOM and cost data populate

## Data Flow

### Save Flow
```
User Input → Frontend State → window.marginCalc.save() / window.manualBom.save()
→ IPC to Main Process → Insert/Update in SQLite → Success Response
```

### Load Flow
```
User Enters Quote Number → window.marginCalc.get() / window.manualBom.get()
→ IPC to Main Process → Query SQLite → Return Data → Populate Frontend State
```

## Benefits

1. **Persistence** - Calculations and BOMs are saved permanently
2. **Association** - Each calculation/BOM is tied to a quote number
3. **Retrieval** - Easy to retrieve work by quote number
4. **Audit Trail** - Created/updated timestamps for all records
5. **Versioning** - Can update existing quotes (ON CONFLICT clause)

## Example Workflow

### Complete Quoting Workflow

1. **Generate Quote Number**
   - Use Number Generator plugin
   - Example: `CA251114001-XXABC1XX-00`
   - Quote number is copied to clipboard

2. **Create Margin Calculation**
   - Open Margin Calculator
   - Paste quote number
   - Enter costs and pricing
   - Click "Save to Database"

3. **Build BOM**
   - Open Manual BOM Builder
   - Paste same quote number
   - Add components and sub-assemblies
   - Enter customer/project info
   - Click "Save to Quote"

4. **Retrieve Later**
   - Open either plugin
   - Enter quote number
   - Click "Load from Database" / "Load from Quote"
   - All data loads instantly

## Database Location

- **Development:** `C:\Users\CraftAuto-Sales\AppData\Local\CraftToolsHub\data\server.db`
- **Production:** `[Runtime Path]\data\server.db`

## Testing

### Test Margin Calculator

1. Open Margin Calculator
2. Enter quote number: `TEST-001`
3. Enter some costs (e.g., BOM: 100, Eng Hours: 2)
4. Enter purchase price: 500
5. Click "Save to Database"
6. Clear all fields
7. Enter quote number: `TEST-001`
8. Click "Load from Database"
9. Verify all fields populate correctly

### Test Manual BOM Builder

1. Open Manual BOM Builder
2. Add some components
3. Enter quote number: `TEST-BOM-001`
4. Enter project name and customer
5. Click "Save to Quote"
6. Clear the BOM
7. Enter quote number: `TEST-BOM-001`
8. Click "Load from Quote"
9. Verify BOM and cost data populate correctly

## Console Logging

Both plugins log their database operations to the console:

**Margin Calculator:**
```
💰 [Margin Calculator] Saving margin calculation to database...
   Data: { ... }
   ✅ Margin calculation saved to database
```

**Manual BOM:**
```
📦 [Manual BOM] Saving BOM to database...
   Quote Number: CA251114001-XX...
   ✅ Manual BOM saved to database
```

## Troubleshooting

### "Database not available" error
- Check that Electron main process started successfully
- Verify `serverDb` is initialized in `electron/main.js`
- Check console for database initialization errors

### "No calculation/BOM found" message
- Verify quote number is exactly correct (case-sensitive)
- Check database using SQLite browser:
  ```sql
  SELECT * FROM manual_quotes WHERE quoteNumber = 'YOUR-QUOTE-NUMBER';
  ```

### Data not persisting
- Check for JavaScript errors in DevTools console
- Verify IPC handlers are registered (check `electron/main.js`)
- Confirm preload APIs are exposed (check `electron/preload.js`)

## Future Enhancements

1. **Search Functionality** - Search all saved quotes by customer, project name, date
2. **History/Versions** - Keep multiple versions instead of overwriting
3. **Export** - Export calculations/BOMs to PDF or Excel
4. **Linking** - Link margin calculations to their corresponding BOMs
5. **Reporting** - Generate reports showing all quotes and their status

## Related Files

- `electron/main.js` - IPC handlers (lines ~5070-5230)
- `electron/preload.js` - API exposure (lines ~118-128)
- `src/plugins/MarginCalculator.jsx` - Frontend implementation
- `src/plugins/ManualBomBuilder.jsx` - Frontend implementation
- `docs/THEME_REFACTORING_GUIDE.md` - Style guide for future updates
