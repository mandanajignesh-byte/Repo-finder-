# Flutter Setup Instructions

## Step 1: Install Flutter

If Flutter is not installed, follow these steps:

1. **Download Flutter SDK:**
   - Visit: https://flutter.dev/docs/get-started/install/windows
   - Download the Flutter SDK zip file
   - Extract to a location like `C:\src\flutter` (avoid spaces in path)

2. **Add Flutter to PATH:**
   - Open System Properties → Environment Variables
   - Add `C:\src\flutter\bin` to your PATH
   - Restart terminal/PowerShell

3. **Verify Installation:**
   ```bash
   flutter doctor
   ```

## Step 2: Initialize Flutter Project

Once Flutter is installed, run:

```bash
cd C:\Users\manda\github\RepoFinderMobile
flutter create .
flutter pub get
```

## Step 3: Create .env File

Create `.env` in the `RepoFinderMobile` directory:

```
SUPABASE_URL=https://hwbdrvbcawcfpbcimblg.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Run the App

```bash
flutter run
```

## Alternative: Use Flutter from Any Location

If Flutter is installed but not in PATH, you can:

1. Find Flutter installation path
2. Use full path: `C:\path\to\flutter\bin\flutter.bat create .`

## Need Help?

- Flutter Docs: https://flutter.dev/docs
- Flutter Installation: https://flutter.dev/docs/get-started/install
