# RepoFinder Mobile

GitHub Repository Discovery Mobile App built with Flutter.

## Setup

### Prerequisites
1. Install Flutter: https://flutter.dev/docs/get-started/install
2. Verify installation: `flutter doctor`

### Installation Steps

1. **Install dependencies:**
   ```bash
   flutter pub get
   ```

2. **Create `.env` file** in the root directory:
   ```
   SUPABASE_URL=https://hwbdrvbcawcfpbcimblg.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **Run the app:**
   ```bash
   flutter run
   ```

## Project Structure

- `lib/main.dart` - App entry point
- `lib/models/` - Data models
- `lib/services/` - Supabase & API services
- `lib/screens/` - App screens
- `lib/widgets/` - Reusable widgets

## Features

- ✅ Swipeable repo discovery feed
- ✅ Trending repositories
- ✅ Save & like repos
- ✅ User preferences
- ✅ Dark theme UI
