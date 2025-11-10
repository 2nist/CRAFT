# Global Component Search - Integration Guide

## Overview

The Global Component Search is a centralized, moveable, and resizable modal for finding components across the entire application. This replaces individual plugin search implementations.

## Deployment Considerations

### NAS Deployment

When deployed via NAS using `scripts/publish-to-nas.ps1`:
- Component database syncs automatically from `public/COMPONENT PRICE LIST [MASTER].csv`
- Search indexes are built on first launch
- Updates to component database require re-deploying to NAS
- All workstations share the same component database

### Environment Setup

The search system respects the `CTH_RUNTIME_ROOT` environment variable:
- Set via `Set-CTHRuntimeRoot.ps1` (generated during NAS deployment)
- Points to the `latest` folder on NAS
- Ensures all users search the same component database

## Features

✅ **600x500px default size** (centered on screen)  
✅ **Moveable** - Drag by header to reposition  
✅ **Resizable** - Drag corners/edges to resize  
✅ **Keyboard Shortcut** - `Ctrl+K` (Windows) / `Cmd+K` (Mac)  
✅ **Menu Access** - View > Search Components...  
✅ **Real-time Search** - Searches SKU, Description, Category, Manufacturer  
✅ **Pub/Sub Pattern** - Plugins subscribe to component selection events  

---

## How to Open the Modal

### 1. From the Menu
`View > Search Components...`

### 2. Keyboard Shortcut
Press `Ctrl+K` (Windows) or `Cmd+K` (Mac)

### 3. Programmatically
```javascript
import { useAppContext } from '../context/AppContext';

function MyComponent() {
  const { openSearchModal } = useAppContext();
  
  return (
    <button onClick={openSearchModal}>
      Search Components
    </button>
  );
}
```

---

## How Plugins Receive Component Selections

Plugins use the **EventBus** to subscribe to component selection events.

### Example: Basic Subscription

```javascript
import React, { useEffect, useState } from 'react';
import { eventBus, EVENTS } from '../services/EventBus';

export default function MyPlugin() {
  const [selectedComponent, setSelectedComponent] = useState(null);
  
  useEffect(() => {
    // Subscribe to component selection event
    const unsubscribe = eventBus.subscribe(
      EVENTS.COMPONENT_SELECTED, 
      (component) => {
        console.log('Component selected:', component);
        setSelectedComponent(component);
        // Do something with the component...
      }
    );
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  return (
    <div>
      {selectedComponent && (
        <div>
          <h3>Selected: {selectedComponent.description}</h3>
          <p>SKU: {selectedComponent.sku}</p>
          <p>Category: {selectedComponent.category}</p>
        </div>
      )}
    </div>
  );
}
```

### Example: Adding to a List

```javascript
import React, { useEffect, useState } from 'react';
import { eventBus, EVENTS } from '../services/EventBus';

export default function ComponentList() {
  const [components, setComponents] = useState([]);
  
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(
      EVENTS.COMPONENT_SELECTED,
      (component) => {
        // Add component to list (avoid duplicates)
        setComponents(prev => {
          const exists = prev.some(c => c.sku === component.sku);
          if (exists) return prev;
          return [...prev, component];
        });
      }
    );
    
    return () => unsubscribe();
  }, []);
  
  return (
    <div>
      <h2>Components ({components.length})</h2>
      <ul>
        {components.map(c => (
          <li key={c.sku}>
            {c.sku} - {c.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Example: Using with Forms

```javascript
import React, { useEffect } from 'react';
import { eventBus, EVENTS } from '../services/EventBus';

export default function ComponentForm() {
  const [formData, setFormData] = useState({
    sku: '',
    description: '',
    quantity: 1
  });
  
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(
      EVENTS.COMPONENT_SELECTED,
      (component) => {
        // Populate form with selected component
        setFormData(prev => ({
          ...prev,
          sku: component.sku,
          description: component.description
        }));
      }
    );
    
    return () => unsubscribe();
  }, []);
  
  return (
    <form>
      <input 
        value={formData.sku} 
        onChange={e => setFormData({...formData, sku: e.target.value})}
        placeholder="SKU"
      />
      <input 
        value={formData.description}
        onChange={e => setFormData({...formData, description: e.target.value})}
        placeholder="Description"
      />
      <input 
        type="number"
        value={formData.quantity}
        onChange={e => setFormData({...formData, quantity: e.target.value})}
        placeholder="Quantity"
      />
    </form>
  );
}
```

---

## Component Data Structure

When a component is selected, it contains the following properties:

```typescript
{
  sku: string,              // Component SKU/Part Number
  description: string,      // Component description
  category?: string,        // Category (if available)
  manufacturer?: string,    // Manufacturer (if available)
  quantity?: number,        // Quantity (if available)
  price?: number,          // Price (if available)
  vendor?: string,         // Vendor (if available)
  // ... other component properties
}
```

---

## Available Events

```javascript
import { EVENTS } from '../services/EventBus';

EVENTS.COMPONENT_SELECTED  // Fired when user selects a component
EVENTS.SEARCH_OPENED       // Fired when search modal opens
EVENTS.SEARCH_CLOSED       // Fired when search modal closes
```

---

## Migrating from Plugin-Specific Search

### Before (Old Way):
```javascript
// Each plugin had its own search implementation
const [searchTerm, setSearchTerm] = useState('');
const [components, setComponents] = useState([]);

const handleSearch = async () => {
  const results = await window.components.search({ 
    sku: searchTerm 
  });
  setComponents(results);
};
```

### After (New Way):
```javascript
// Use EventBus to receive selections from global search
useEffect(() => {
  const unsubscribe = eventBus.subscribe(
    EVENTS.COMPONENT_SELECTED,
    (component) => {
      // Handle selected component
      handleAddComponent(component);
    }
  );
  return () => unsubscribe();
}, []);
```

---

## Benefits

1. **Consistency** - Same search UX across all plugins
2. **Maintainability** - Single search implementation to update
3. **Better UX** - Users learn one search interface
4. **Decoupling** - Plugins don't manage search state
5. **Flexibility** - Modal can be moved/resized as needed

---

## Next Steps

- Remove plugin-specific search implementations
- Subscribe to `EVENTS.COMPONENT_SELECTED` in your plugin
- Test component selection flow
- Consider adding plugin-specific actions after selection

---

## Support

For questions or issues, see:
- `src/services/EventBus.js` - Event bus implementation
- `src/services/SearchService.js` - Search logic
- `src/components/GlobalComponentSearch/index.jsx` - Modal component
