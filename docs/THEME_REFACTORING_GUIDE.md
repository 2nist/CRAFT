# Theme Refactoring Guide

## Problem Overview

Currently, most plugins use **hardcoded Tailwind color classes** (e.g., `bg-slate-800`, `text-gray-400`) instead of **semantic color classes** that reference CSS variables (e.g., `bg-card`, `text-foreground`). This causes inconsistent styling across the application because the hardcoded colors bypass the theme system defined in `src/index.css`.

## Why This Matters

- **Manual BOM Builder** uses semantic classes → displays correct theme colors ✓
- **Other plugins** use hardcoded classes → display wrong colors ✗
- CSS variable changes in `index.css` only affect components using semantic classes
- Dark mode toggle won't work properly for hardcoded colors

## CSS Variables Already Configured

The following CSS variables are properly defined in `src/index.css`:

### Light Mode (`:root`)
```css
--background: 40.0000 60.0000% 98.0392%;
--foreground: 20.8696 18.4000% 24.5098%;
--card: 36.0000 41.6667% 95.2941%;
--muted: 39.1304 45.0980% 90.0000%;
--muted-foreground: 25.0000 5.2632% 44.7059%;
--primary: 25.9649 90.4762% 37.0588%;
--secondary: 226.5000 39.2157% 20%;  /* Dark blue */
--secondary-foreground: 32.3077 46.4286% 78.0392%;  /* Light beige */
--accent: 32.3077 46.4286% 78.0392%;  /* Light beige */
--border: 43.5000 42.5532% 81.5686%;
--input: 43.5000 42.5532% 81.5686%;
```

### Dark Mode (`.dark`)
```css
--background: 24 9.8039% 10%;
--foreground: 60 4.7619% 95.8824%;
--card: 12.0000 6.4935% 15.0980%;
--muted: 30 10.3448% 11.3725%;
--muted-foreground: 24.0000 5.4348% 63.9216%;
--primary: 24.5815 94.9791% 53.1373%;
--secondary: 33.3333 5.4545% 32.3529%;  /* #57534E stone gray */
--accent: 198.4615 46.4286% 21.9608%;  /* Dark teal */
--border: 30 6.2500% 25.0980%;
--input: 30 6.2500% 25.0980%;
```

## Tailwind Config Already Set Up

`tailwind.config.js` already maps CSS variables to Tailwind classes:

```javascript
colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))'
  },
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))'
  },
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))'
  },
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))'
  },
  accent: {
    DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))'
  },
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  // ... etc
}
```

## Color Mapping Reference

### Background Colors

| ❌ Current Hardcoded | ✅ Should Be Semantic | Use Case |
|---------------------|---------------------|----------|
| `bg-white dark:bg-slate-800` | `bg-card` | Card/panel backgrounds |
| `bg-white dark:bg-slate-900` | `bg-background` | Main app background |
| `bg-slate-50 dark:bg-slate-800` | `bg-muted` | Subtle backgrounds |
| `bg-slate-100 dark:bg-slate-800` | `bg-muted` | Highlighted sections |
| `bg-gray-800` | `bg-card` | Dark panels |
| `bg-gray-900` | `bg-background` | Dark backgrounds |
| `bg-blue-600` | `bg-primary` | Primary action buttons |
| `bg-slate-200 dark:bg-slate-700` | `bg-secondary` | Secondary buttons |

### Text Colors

| ❌ Current Hardcoded | ✅ Should Be Semantic | Use Case |
|---------------------|---------------------|----------|
| `text-slate-900 dark:text-white` | `text-foreground` | Main text |
| `text-slate-800 dark:text-slate-100` | `text-foreground` | Headings |
| `text-slate-600 dark:text-slate-300` | `text-muted-foreground` | Secondary text |
| `text-slate-500 dark:text-slate-400` | `text-muted-foreground` | Subtle text |
| `text-slate-400 dark:text-slate-500` | `text-muted-foreground` | Disabled text |
| `text-gray-300` | `text-muted-foreground` | Light text on dark |
| `text-gray-400` | `text-muted-foreground` | Subtle labels |
| `text-white` | `text-primary-foreground` | Text on primary buttons |

### Border Colors

| ❌ Current Hardcoded | ✅ Should Be Semantic | Use Case |
|---------------------|---------------------|----------|
| `border-slate-200 dark:border-slate-700` | `border-border` | Standard borders |
| `border-slate-300 dark:border-slate-600` | `border-input` | Input borders |
| `border-gray-700` | `border-border` | Dark mode borders |
| `border-gray-800` | `border-border` | Subtle dark borders |
| `border-blue-500` | `border-primary` | Focused elements |

### Special Cases

| ❌ Current Hardcoded | ✅ Should Be Semantic | Use Case |
|---------------------|---------------------|----------|
| `hover:bg-slate-100 dark:hover:bg-slate-800` | `hover:bg-muted` | Hover states |
| `hover:bg-blue-700` | `hover:bg-primary/90` | Primary button hover |
| `focus:ring-blue-500` | `focus:ring-primary` | Focus rings |
| `focus:border-blue-500` | `focus:border-primary` | Focus borders |

## Files Requiring Refactoring

Based on grep search, the following files have hardcoded colors:

### High Priority (User-Facing Plugins)
- `src/plugins/MarginCalculator.jsx` - 50+ instances
- `src/plugins/ComponentManager.jsx` - 100+ instances
- `src/plugins/FlaCalculator.jsx` - 50+ instances
- `src/plugins/HubDashboard.jsx` - 80+ instances
- `src/plugins/LegacyBomImporter.jsx` - 60+ instances

### Medium Priority
- `src/plugins/ProductTemplateManager.jsx`
- `src/plugins/AssemblyManager.jsx`
- `src/plugins/BomPanelBuilder.jsx`

### Low Priority
- Example/demo plugins
- Archived components

## Step-by-Step Refactoring Process

### 1. Choose a Plugin to Refactor
Start with one plugin at a time to avoid overwhelming changes.

### 2. Search and Replace Patterns

Use these regex patterns to find and replace:

#### Background Colors
```
Find: bg-white dark:bg-slate-800
Replace: bg-card

Find: bg-slate-100 dark:bg-slate-800
Replace: bg-muted

Find: bg-gray-900
Replace: bg-background

Find: bg-gray-800
Replace: bg-card
```

#### Text Colors
```
Find: text-slate-900 dark:text-white
Replace: text-foreground

Find: text-slate-600 dark:text-slate-300
Replace: text-muted-foreground

Find: text-slate-500 dark:text-slate-400
Replace: text-muted-foreground

Find: text-gray-400
Replace: text-muted-foreground
```

#### Border Colors
```
Find: border-slate-300 dark:border-slate-600
Replace: border-input

Find: border-slate-200 dark:border-slate-700
Replace: border-border

Find: border-gray-700
Replace: border-border
```

#### Hover States
```
Find: hover:bg-slate-100 dark:hover:bg-slate-800
Replace: hover:bg-muted

Find: hover:bg-slate-200 dark:hover:bg-slate-700
Replace: hover:bg-accent

Find: hover:bg-blue-700
Replace: hover:bg-primary/90
```

#### Focus States
```
Find: focus:ring-blue-500
Replace: focus:ring-primary

Find: focus:border-blue-500
Replace: focus:border-primary
```

### 3. Manual Review

After automated replacement:
1. **Test the plugin** - Verify visual appearance matches intent
2. **Check dark mode** - Toggle between light/dark to ensure consistency
3. **Review contrast** - Ensure text is readable on backgrounds
4. **Validate interactions** - Check hover/focus states work correctly

### 4. Special Considerations

#### Remove Dark Mode Variants
Since semantic classes work in both modes:
```jsx
// Before
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">

// After
<div className="bg-card text-foreground">
```

#### Opacity Modifiers
Keep opacity modifiers if needed:
```jsx
// Before
<div className="bg-slate-800/60">

// After
<div className="bg-card/60">
```

#### Conditional Classes
Update conditional styling:
```jsx
// Before
className={active 
  ? 'bg-blue-600 text-white' 
  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
}

// After
className={active 
  ? 'bg-primary text-primary-foreground' 
  : 'bg-secondary text-secondary-foreground'
}
```

## Example Refactoring

### Before (MarginCalculator.jsx)
```jsx
const IconInput = ({ label, value, onValueChange, placeholder, icon: Icon }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 pl-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  </div>
);
```

### After (Refactored)
```jsx
const IconInput = ({ label, value, onValueChange, placeholder, icon: Icon }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-muted-foreground mb-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 pl-10 border border-input bg-background rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
      />
    </div>
  </div>
);
```

## Testing Checklist

After refactoring each plugin:

- [ ] Plugin loads without errors
- [ ] All text is readable in light mode
- [ ] All text is readable in dark mode
- [ ] Buttons have correct colors
- [ ] Hover states work correctly
- [ ] Focus states are visible
- [ ] Borders are visible but not too prominent
- [ ] Background hierarchy makes sense (background → card → muted)
- [ ] Theme matches Manual BOM Builder styling
- [ ] No console errors or warnings

## Benefits After Refactoring

1. **Consistent Theming** - All plugins follow the same color scheme
2. **Easier Maintenance** - Change colors once in `index.css`, applies everywhere
3. **Better Dark Mode** - Automatic support without duplicate classes
4. **Smaller Bundle** - Less duplicate CSS, no redundant dark mode classes
5. **Future-Proof** - Easy to update theme colors for rebranding

## Automated Script (Optional)

For bulk refactoring, you could create a Node.js script:

```javascript
// refactor-colors.js
const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /bg-white dark:bg-slate-800/g, to: 'bg-card' },
  { from: /bg-slate-100 dark:bg-slate-800/g, to: 'bg-muted' },
  { from: /text-slate-900 dark:text-white/g, to: 'text-foreground' },
  { from: /text-slate-600 dark:text-slate-300/g, to: 'text-muted-foreground' },
  { from: /border-slate-300 dark:border-slate-600/g, to: 'border-input' },
  // ... add more patterns
];

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  replacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`✓ Refactored: ${filePath}`);
}

// Usage: node refactor-colors.js src/plugins/MarginCalculator.jsx
const targetFile = process.argv[2];
if (targetFile) {
  refactorFile(targetFile);
}
```

## Notes

- **Backup first** - Commit changes before refactoring or work in a feature branch
- **Test incrementally** - Don't refactor all plugins at once
- **Manual BOM Builder** - Already uses semantic classes, use as reference
- **shadcn/ui components** - Already use semantic classes, no changes needed
- **Be careful with blue-* classes** - `bg-blue-600` might be intentional primary color

## Questions?

- Check `tailwind.config.js` for all available semantic color names
- Compare with `src/plugins/ManualBomBuilder.jsx` for correct usage examples
- Test with dark mode toggle to verify colors work in both themes
- Refer to shadcn/ui documentation for component color patterns
