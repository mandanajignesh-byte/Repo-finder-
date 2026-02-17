# Flutter Mobile App Setup

## Prerequisites

1. **Install Flutter:**
   - Download from https://flutter.dev/docs/get-started/install
   - Verify: `flutter doctor`

2. **Install Dependencies:**
   ```bash
   flutter pub get
   ```

## Environment Setup

1. **Create `.env` file in root:**
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   GITHUB_TOKEN=your_github_token
   ```

2. **Get Supabase credentials:**
   - Go to Supabase Dashboard → Settings → API
   - Copy Project URL and anon key

## Run App

```bash
flutter run
```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── models/                   # Data models
│   ├── repository.dart
│   └── user_preferences.dart
├── services/                 # Business logic
│   ├── supabase_service.dart
│   └── repo_service.dart
└── screens/                  # UI screens
    ├── splash_screen.dart
    ├── onboarding_screen.dart
    ├── main_tab_screen.dart
    ├── discovery_screen.dart
    ├── trending_screen.dart
    ├── saved_screen.dart
    └── profile_screen.dart
```

## Next Steps

1. Implement swipe gestures in DiscoveryScreen
2. Add repo cards with images
3. Connect to Supabase repos table
4. Add pull-to-refresh
5. Implement save/like functionality
