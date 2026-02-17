# Inter Font Files

✅ **Variable Font Setup (Current)**

The variable font file is already configured:
- `Inter-VariableFont_opsz,wght.ttf` - Supports all weights (400, 500, 600, etc.)

This is the modern approach - one file handles all font weights!

## File structure:

```
RepoFinderMobile/
  fonts/
    Inter-VariableFont_opsz,wght.ttf  ✅ (Required)
    Inter-Italic-VariableFont_opsz,wght.ttf  (Optional - for italics)
```

After adding the files, run:
```bash
flutter pub get
```

---

## Alternative: Static Fonts

If you prefer static font files, you can download them from:
https://fonts.google.com/specimen/Inter

Then use:
- `Inter-Regular.ttf` (weight: 400)
- `Inter-Medium.ttf` (weight: 500)
- `Inter-SemiBold.ttf` (weight: 600)
