# Apple-Style Design System for RepoVerse PWA

This document outlines the Apple-inspired design system implemented for the RepoVerse PWA.

## 🎨 Color Palette

### Dark Mode (Primary - Current Implementation)

**Foundation Colors:**
- **Background**: `#0B0B0F` - Apple system dark background
- **Surface/Card**: `#1C1C1E` - Apple secondary surface
- **Secondary Surface**: `#2C2C2E` - Apple tertiary surface
- **Dividers**: `#3A3A3C` - Apple divider color

**Text Colors:**
- **Primary Text**: `#FFFFFF` - Pure white for main content
- **Secondary Text**: `#A1A1A6` - Apple secondary text
- **Tertiary Text**: `#6E6E73` - Apple tertiary text

**Accent Color:**
- **Slate Violet**: `#6D5EF6` - Modern, calm accent (for buttons, links, active states)
- **Alternative**: `#4F46E5` - Deep Indigo (dev/infra feel)

### Light Mode (Future Enhancement)

**Foundation Colors:**
- **Background**: `#F5F5F7` - Apple system gray background
- **Primary Surface**: `#FFFFFF` - Pure white
- **Secondary Surface**: `#FBFBFD` - Apple secondary surface
- **Borders/Dividers**: `#E5E5EA` - Apple divider

**Text Colors:**
- **Primary Text**: `#1D1D1F` - Apple primary text
- **Secondary Text**: `#6E6E73` - Apple secondary text
- **Tertiary Text**: `#A1A1A6` - Apple tertiary text

**Accent Color:**
- **Deep Indigo**: `#4F46E5` - Dev/infra feel

## 🧱 Design Principles

### 90-10 Rule
- **90%**: Neutral grays (backgrounds, surfaces, text)
- **10%**: Accent color (buttons, active states, links)

### Material Effects
- **Blur surfaces**: Glass cards with backdrop blur
- **Thin borders**: 1px borders with subtle opacity (`#FFFFFF10`)
- **Soft shadows**: Subtle, minimal shadows
- **Frosted navbars**: Translucent navigation bars

### Avoid
- ❌ Hard drop shadows
- ❌ Neon glows
- ❌ Heavy gradients
- ❌ Pure black backgrounds everywhere

## 📱 PWA Configuration

### Manifest Colors
- **Background Color**: `#0B0B0F` - Used for splash screen
- **Theme Color**: `#0B0B0F` - Used for browser chrome/status bar

### iOS-Specific
- **Status Bar Style**: `black-translucent` - Matches Apple's design language
- **App Title**: "RepoVerse" - Short, clean name

## 🎯 Accent Color Usage

Use accent color (`#6D5EF6`) sparingly for:
- ✅ Primary action buttons
- ✅ Active tabs/selected states
- ✅ Links (hover/active)
- ✅ Important call-to-action elements
- ✅ Progress indicators
- ✅ Success states

**Do NOT use accent for:**
- ❌ Background colors
- ❌ Large surface areas
- ❌ Text (except links)
- ❌ Borders (use neutral grays)

## 🔤 Typography Hierarchy

### Text Colors (Dark Mode)
1. **Primary**: `#FFFFFF` - Main content, headings
2. **Secondary**: `#A1A1A6` - Supporting text, descriptions
3. **Tertiary**: `#6E6E73` - Metadata, timestamps, labels

### Text Sizes (Apple-inspired)
- **Large Title**: 34px
- **Title 1**: 28px
- **Title 2**: 22px
- **Title 3**: 20px
- **Headline**: 17px (semibold)
- **Body**: 17px (regular)
- **Callout**: 16px
- **Subhead**: 15px
- **Footnote**: 13px
- **Caption 1**: 12px
- **Caption 2**: 11px

## 🧩 UI Components

### Cards/Surfaces
- **Background**: `#1C1C1E` (dark mode)
- **Border**: 1px `#3A3A3C` or subtle blur
- **Shadow**: Minimal, soft
- **Padding**: Generous (16px-24px)

### Buttons
- **Primary**: Accent color (`#6D5EF6`) with white text
- **Secondary**: Transparent with border
- **Tertiary**: Text-only, accent color

### Dividers
- **Color**: `#3A3A3C`
- **Height**: 1px or 0.5px (hairline)

## 📐 Spacing System

Apple uses consistent spacing:
- **4px**: Tight spacing
- **8px**: Small spacing
- **16px**: Standard spacing
- **24px**: Large spacing
- **32px**: Extra large spacing

## 🎨 Reference Apps

Study these Apple apps for inspiration:
- **Xcode**: Developer tool aesthetic
- **Apple Developer**: Clean, minimal
- **TestFlight**: Simple, focused
- **Files app**: Folder structure = repo organization vibe

## 🔄 Implementation Status

### ✅ Implemented
- PWA manifest with Apple-style colors
- Dark mode theme color (`#0B0B0F`)
- iOS status bar configuration
- Apple-compatible meta tags

### 🚧 Future Enhancements
- Light mode support
- Blur effects for cards
- Apple-style animations
- Refined typography scale
- Accent color implementation in UI components

## 📝 Notes

- Current app uses `#0F0F12` which is very close to Apple's `#0B0B0F`
- PWA manifest updated to `#0B0B0F` for consistency
- Website code remains unchanged (non-breaking)
- Accent color can be implemented gradually in UI components
