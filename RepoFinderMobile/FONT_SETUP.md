# Inter Font Setup

To use the Inter font in this app, you need to download the font files and place them in the `fonts/` directory.

## Steps:

1. Download Inter font from: https://fonts.google.com/specimen/Inter
   - Or directly from: https://github.com/rsms/inter/releases

2. Extract the font files and copy these three files to `RepoFinderMobile/fonts/`:
   - `Inter-Regular.ttf` (weight: 400)
   - `Inter-Medium.ttf` (weight: 500)
   - `Inter-SemiBold.ttf` (weight: 600)

3. Create the fonts directory if it doesn't exist:
   ```
   mkdir fonts
   ```

4. The font files should be in:
   ```
   RepoFinderMobile/
     fonts/
       Inter-Regular.ttf
       Inter-Medium.ttf
       Inter-SemiBold.ttf
   ```

5. Run `flutter pub get` to refresh the project.

## Alternative: Use System Font

If you don't want to add font files, you can modify `pubspec.yaml` to remove the font configuration and the app will use the system default font (which may not be Inter).
