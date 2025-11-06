# Smart Manual System

## Overview
The Global Component Search now includes a smart, lazy-loading manual system that automatically finds and caches component manuals with zero upfront work required.

## How It Works

### First-Time Access
1. Open Global Component Search (`Ctrl+K`)
2. Search for a component and select it
3. Click **View Manual** button
4. System checks local cache (instant)
5. If not cached, system automatically:
   - Generates manufacturer-specific search URL
   - Opens browser with search results
   - Prompts you to confirm if it's the right manual
6. Click **Save Reference** if correct
7. Manual is now cached for instant access

### Subsequent Access
1. Click **View Manual**
2. Opens directly from cached reference
3. Zero waiting, zero searching

## Supported Manufacturers

The system has built-in smart search URLs for:

- **Allen Bradley / Rockwell Automation**  
  `literature.rockwellautomation.com`
  
- **Siemens**  
  `support.industry.siemens.com`
  
- **Schneider Electric**  
  `se.com search`
  
- **ABB**  
  `search.abb.com library`
  
- **Endress+Hauser**  
  `portal.endress.com`
  
- **Festo**  
  `festo.com catalog`

### Fallback
For other manufacturers, the system performs a Google search with:
```
[Manufacturer] [SKU] manual pdf
```

## Manual Index Storage

Manual references are stored in:
```
%APPDATA%/craft-tools-hub/data/manual_index.json
```

Format:
```json
{
  "1766-L32BWA": {
    "manufacturer": "Allen Bradley",
    "manualUrl": "https://literature.rockwellautomation.com/...",
    "savedDate": "2025-01-14T10:30:00Z",
    "localPath": null
  }
}
```

## Future Enhancements

### Planned Features
1. **Download & Store PDFs**: Save actual PDFs to NAS directory
2. **Manual Preview**: Show PDF preview in modal
3. **Version Tracking**: Track manual revisions
4. **Bulk Import**: Import existing manual library
5. **Manual Annotations**: Add notes/highlights
6. **Offline Mode**: Cache PDFs for offline access

## Developer API

### Frontend (React)
```javascript
// Check if manual exists locally
const result = await window.manuals.checkLocal({
  sku: 'ABC123',
  manufacturer: 'Allen Bradley'
});

// Generate smart search URL
const search = await window.manuals.smartSearch({
  sku: 'ABC123',
  manufacturer: 'Allen Bradley',
  vndrnum: '1766L32BWA'
});

// Save manual reference
await window.manuals.saveManualReference({
  sku: 'ABC123',
  manufacturer: 'Allen Bradley',
  manualUrl: 'https://...',
  savedDate: new Date().toISOString()
});

// Get entire manual index
const index = await window.manuals.getIndex();
```

### Backend (Electron IPC)
```javascript
// Handler: manuals:check-local
ipcMain.handle('manuals:check-local', async (event, component) => {
  // Returns: { found: boolean, path?: string }
});

// Handler: manuals:smart-search
ipcMain.handle('manuals:smart-search', async (event, component) => {
  // Returns: { url: string }
});

// Handler: manuals:save-reference
ipcMain.handle('manuals:save-reference', async (event, data) => {
  // Returns: { success: boolean }
});
```

## Benefits

### Zero Setup Required
- No need to collect manuals upfront
- No manual linking or configuration
- Works immediately with smart search

### Self-Building Library
- Builds organically as users need manuals
- Only caches manuals that are actually used
- Library grows with actual usage patterns

### Self-Correcting
- Users validate each manual before saving
- Prevents incorrect associations
- Easy to re-search if manual is wrong

### Low Maintenance
- No manual updates needed
- No broken links (browser always has latest)
- No storage space issues

## Troubleshooting

### Manual Won't Open
1. Check internet connection
2. Verify manufacturer website is accessible
3. Try manual search via Google

### Wrong Manual Cached
1. Open Global Component Search
2. Search for component
3. Click **View Manual**
4. When prompted, click **Not the Right Manual**
5. Do manual search, then save correct link

### Clear Manual Cache
Delete or edit:
```
%APPDATA%/craft-tools-hub/data/manual_index.json
```
