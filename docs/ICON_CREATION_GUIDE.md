# Icon Creation Guide

## Overview
The installer currently uses a placeholder icon. For a professional deployment, you need to create proper branded icons for the Craft Automation CPQ application.

## Required Icon Specifications

### File: `build/icon.ico`
**Purpose**: Used for installer, uninstaller, and application icon

**Required Formats** (all in one .ico file):
- 16x16 pixels
- 32x32 pixels
- 48x48 pixels
- 256x256 pixels (main/high-res)

**Specifications**:
- Format: Windows .ico
- Color depth: 32-bit (RGBA with transparency)
- Background: Transparent
- Style: Professional, matches Craft Automation branding

## Design Guidelines

### Visual Elements
1. **Primary**: Craft Automation logo or recognizable symbol
2. **Secondary**: Optional "CPQ" text or automation/industrial icon
3. **Colors**: Match Craft Automation brand colors
4. **Style**: Clean, professional, visible at small sizes

### Technical Requirements
- Must be visible and recognizable at 16x16
- Avoid fine details that disappear when scaled
- Use high contrast
- Test on both light and dark backgrounds

## Creation Methods

### Method 1: Using Online Tools (Easiest)
1. Create a 256x256 PNG with transparent background
2. Use an online converter:
   - https://convertico.com/
   - https://cloudconvert.com/png-to-ico
3. Select all required sizes (16, 32, 48, 256)
4. Download as .ico

### Method 2: Using GIMP (Free)
1. Create/import 256x256 image
2. Add transparency if needed
3. **File → Export As**
4. Choose `.ico` format
5. In export dialog, check "Compressed (PNG)" for all sizes
6. Select sizes: 16x16, 32x32, 48x48, 256x256

### Method 3: Using Adobe Photoshop
1. Create 256x256 image with transparent background
2. Install ICO format plugin
3. **File → Save As** → ICO format
4. Choose multi-resolution
5. Include 16, 32, 48, 256 pixel versions

### Method 4: Using ImageMagick (Command Line)
```bash
# Convert PNG to multi-resolution ICO
convert input.png -define icon:auto-resize=256,48,32,16 build/icon.ico
```

## Installation Steps

1. **Create the icon** using one of the methods above
2. **Replace placeholder**:
   ```bash
   # Backup placeholder (optional)
   mv build/icon.ico build/icon.ico.placeholder
   
   # Copy your new icon
   cp your-icon.ico build/icon.ico
   ```
3. **Rebuild installer**:
   ```bash
   npm run dist
   ```
4. **Verify**:
   - Check installer icon in Windows Explorer
   - Install app and verify desktop shortcut icon
   - Check icon in Start Menu
   - Verify icon in Add/Remove Programs

## Testing Your Icon

### Visual Inspection
- [ ] Visible at 16x16 (taskbar, file explorer)
- [ ] Clear at 32x32 (desktop shortcuts)
- [ ] Sharp at 48x48 (large icon view)
- [ ] Detailed at 256x256 (full quality)

### Context Testing
- [ ] Light background (white/light gray)
- [ ] Dark background (dark gray/black)
- [ ] Colored backgrounds
- [ ] Windows 10 style
- [ ] Windows 11 style

### Technical Validation
```bash
# Check icon properties (Windows)
Get-ItemProperty build\icon.ico | Select-Object *

# Or use online validator
# Upload to https://redketchup.io/icon-editor to verify all sizes
```

## Current Placeholder Status

⚠️ **WARNING**: The current `build/icon.ico` is a text placeholder!

**What's there now**:
- Plain text file explaining the need for an icon
- Will NOT work as an actual icon in the installer

**What needs to happen**:
1. Design or obtain proper icon artwork
2. Convert to multi-resolution .ico format
3. Replace the placeholder file
4. Rebuild the installer

**Until replaced**:
- Installer may show default Electron icon
- Application may show generic icon
- Professional branding will be missing

## Design Resources

### Stock Icon Sites (for inspiration)
- https://www.flaticon.com/ (search "automation", "industrial", "CPQ")
- https://thenounproject.com/
- https://iconmonstr.com/

### Craft Automation Branding
- Use official Craft Automation logo if available
- Match brand color scheme
- Follow brand guidelines for icon design

### Automation Industry Themes
- Gears/cogs (mechanical automation)
- Circuit board patterns
- Factory/industrial symbols
- Quote/document icons
- Price tag icons

## Quick Start for Non-Designers

If you don't have design skills:

1. **Find the logo**: Get the official Craft Automation logo (SVG or high-res PNG)
2. **Simple conversion**:
   - Upload to https://convertico.com/
   - Select all size options
   - Download .ico file
3. **Replace**: Copy downloaded file to `build/icon.ico`
4. **Rebuild**: Run `npm run dist`

## Troubleshooting

### Icon doesn't appear in installer
- Verify .ico file is valid (open in image viewer)
- Check file path in package.json matches actual location
- Rebuild with `npm run dist`
- Clear electron-builder cache: `rm -rf node_modules/.cache/electron-builder`

### Icon looks pixelated
- Ensure all required sizes are included
- Start with high-quality 256x256 source
- Use proper tools (don't just rename .png to .ico)

### Transparent background shows as black
- Use 32-bit color depth with alpha channel
- Test your source PNG has proper transparency
- Use PNG format inside ICO (not BMP)

## Resources

- **Electron Icon Docs**: https://www.electron.build/icons
- **Windows Icon Guidelines**: https://docs.microsoft.com/en-us/windows/apps/design/style/iconography/app-icon-design
- **ICO Format Spec**: https://en.wikipedia.org/wiki/ICO_(file_format)

---

**Note**: This is a one-time setup. Once the proper icon is created and tested, it should work for all future builds unless branding changes.
