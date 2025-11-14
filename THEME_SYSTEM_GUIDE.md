# Theme System Implementation Guide

## Overview
A comprehensive dark/light theme system has been implemented with strict styling rules, following your design specifications. The system uses HSL color values, custom shadow variables, and provides seamless theme switching with persistence.

## What Was Implemented

### 1. CSS Theme Variables (`src/index.css`)
- **Light Theme (`:root`)**: Warm earth tones optimized for readability
  - Background: Warm beige (#F5E5D0 equivalent in HSL)
  - Foreground: Dark brown text
  - Primary: Burnt orange accent
  - Shadows: Brown-tinted shadows for depth
  
- **Dark Theme (`.dark`)**: Muted palette for low-light environments
  - Background: Dark brown/gray
  - Foreground: Light beige text
  - Primary: Bright orange accent
  - Shadows: Black shadows optimized for dark mode

- **Variable Categories**:
  - Core colors (background, foreground, card, popover, primary, secondary, muted, accent, destructive)
  - Legacy colors (success, danger, info, brown, olive) - preserved for backwards compatibility
  - Chart colors (chart-1 through chart-5)
  - Sidebar colors (sidebar, sidebar-foreground, sidebar-primary, sidebar-accent, etc.)
  - Typography (font-sans, font-serif, font-mono)
  - Shadows (shadow-2xs through shadow-2xl with configurable properties)
  - Radius and spacing

### 2. Tailwind Configuration (`tailwind.config.js`)
- **Color Mappings**: All CSS variables mapped to Tailwind utility classes
  - `bg-background`, `text-foreground`, `border-border`, etc.
  - `bg-sidebar`, `text-sidebar-foreground`, etc.
  - Existing custom colors preserved: `sand`, `slateish`, `eggshell`, `tea`
  
- **Shadow Utilities**: 
  - `shadow-2xs`, `shadow-xs`, `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`
  - Legacy shadows: `shadow-card`, `shadow-panel` (preserved for compatibility)
  
- **Font Families**:
  - `font-sans` → Poppins
  - `font-serif` → Bungee
  - `font-mono` → Bungee
  - `font-poppins`, `font-bungee` (direct references)

### 3. Theme Toggle Component (`src/components/ThemeToggle.jsx`)
- Visual toggle button with Sun/Moon icons
- Shows current theme state clearly
- Smooth transitions between themes
- Accessible with hover states and tooltips

### 4. Theme Persistence (`src/utils/themeInit.js`)
- Automatic theme initialization on app load
- Prevents flash of unstyled content (FOUC)
- Uses localStorage to remember user preference
- Imported in `main.jsx` for early initialization

### 5. Settings Integration (`src/Settings.jsx`)
- New "Appearance" tab (first tab)
- Theme toggle prominently displayed
- Informational text about light/dark modes
- Consistent with existing Settings UI patterns

## How to Use

### For Users
1. Open the app and navigate to Settings (gear icon)
2. Click the "Appearance" tab (Palette icon)
3. Click the theme toggle button to switch between Light/Dark modes
4. Your preference is saved automatically and persists across app restarts

### For Developers

#### Using Theme Colors in Components
```jsx
// Background colors
<div className="bg-background text-foreground">
  <div className="bg-card border-border">
    <p className="text-card-foreground">Card content</p>
  </div>
</div>

// Primary colors
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click me
</button>

// Semantic colors
<div className="bg-success text-success-foreground">Success message</div>
<div className="bg-danger text-danger-foreground">Error message</div>
<div className="bg-info text-info-foreground">Info message</div>

// Sidebar colors
<aside className="bg-sidebar border-sidebar-border">
  <button className="bg-sidebar-accent text-sidebar-accent-foreground">
    Sidebar Button
  </button>
</aside>
```

#### Using Shadow Utilities
```jsx
<div className="shadow-sm">Subtle shadow</div>
<div className="shadow-md">Medium shadow</div>
<div className="shadow-lg">Large shadow</div>
<div className="shadow-2xl">Extra large shadow</div>

// Legacy shadows (still supported)
<div className="shadow-card">Card shadow</div>
<div className="shadow-panel">Panel shadow</div>
```

#### Accessing Theme in JavaScript
```jsx
// Check current theme
const isDark = document.documentElement.classList.contains('dark');

// Toggle theme programmatically
const toggleTheme = () => {
  const root = document.documentElement;
  const newTheme = root.classList.contains('dark') ? 'light' : 'dark';
  
  if (newTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  localStorage.setItem('theme', newTheme);
};
```

#### Accessing CSS Variables Directly
```css
/* In your custom CSS */
.custom-element {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
  box-shadow: var(--shadow-md);
}
```

## Strict Styling Rules

### DO:
✅ Use semantic color classes: `bg-background`, `text-foreground`, `bg-card`
✅ Use theme-aware shadows: `shadow-sm`, `shadow-md`, `shadow-lg`
✅ Use CSS variables for custom components: `hsl(var(--primary))`
✅ Test components in both light and dark modes
✅ Respect the established color palette
✅ Use `border-border` for consistent borders
✅ Use `bg-card` for card/panel backgrounds

### DON'T:
❌ Use hardcoded color values like `#FFFFFF` or `rgb(255,255,255)`
❌ Use Tailwind's default grays (`gray-100`, `gray-900`) - use theme variables instead
❌ Skip dark mode testing - components must work in both themes
❌ Override theme colors with inline styles unless absolutely necessary
❌ Mix legacy and new shadow utilities unnecessarily

## Backwards Compatibility

The implementation preserves all existing functionality:

- **Legacy Colors**: `sand`, `slateish`, `eggshell`, `tea`, `brown`, `olive` still work
- **Legacy Shadows**: `shadow-card` and `shadow-panel` are maintained
- **Existing Components**: All existing components continue to work
- **Custom Styles**: Existing custom CSS and Tailwind classes are unaffected
- **Accent Color System**: The `--accent-hsl` variable is preserved for backwards compatibility

## Theme Customization

To customize the theme colors in the future:

1. Edit `src/index.css` in the `:root` or `.dark` blocks
2. Modify HSL values (e.g., `--primary: 25.9649 90.4762% 37.0588%`)
3. Changes apply immediately on reload
4. No need to modify `tailwind.config.js` unless adding new color categories

## Testing Checklist

When developing new components:

- [ ] Test in light mode
- [ ] Test in dark mode
- [ ] Verify shadows render correctly
- [ ] Check text contrast/readability
- [ ] Ensure hover states are visible
- [ ] Test on cards and panels
- [ ] Verify borders are visible but subtle

## Architecture Decisions

1. **HSL Format**: Colors use HSL without `hsl()` wrapper for Tailwind compatibility
2. **CSS Variables**: All theming is centralized in CSS variables for maintainability
3. **Class-based Toggle**: Uses `.dark` class on `<html>` element (Tailwind standard)
4. **Early Initialization**: Theme loads before React renders to prevent FOUC
5. **LocalStorage**: Simple, reliable persistence without server dependency
6. **Semantic Naming**: Color names describe purpose (primary, accent) not appearance (blue, red)

## Future Enhancements

Potential additions (not currently implemented):
- Multiple theme presets (blue, purple, green accents)
- System preference detection (`prefers-color-scheme`)
- High contrast mode for accessibility
- Custom accent color picker
- Per-plugin theme overrides

## Files Modified

1. `src/index.css` - Theme variables and base styles
2. `tailwind.config.js` - Tailwind utility mappings
3. `src/Settings.jsx` - Appearance tab and theme toggle integration
4. `src/main.jsx` - Theme initialization import

## Files Created

1. `src/components/ThemeToggle.jsx` - Toggle button component
2. `src/utils/themeInit.js` - Theme initialization utility

## Support

For issues or questions about the theme system:
1. Check this documentation first
2. Verify theme variables in browser DevTools
3. Test in both light and dark modes
4. Check localStorage for saved theme preference
5. Clear localStorage to reset to defaults

---

**Theme System Version**: 1.0  
**Last Updated**: November 13, 2025  
**Author**: GitHub Copilot  
